/**
 * ICS (iCalendar) file parser utilities.
 * Handles parsing of .ics files including VTIMEZONE, RRULE, and event expansion.
 */
import type { CalendarEvent } from '@/types/task';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Parsed recurrence rule */
interface RRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  until?: Date;
  count?: number;
  byday?: string[]; // MO, TU, WE, TH, FR, SA, SU
  bymonthday?: number[];
}

/** VTIMEZONE offset definition from ICS files */
interface VTimezoneOffset {
  tzid: string;
  standardOffset: number; // minutes from UTC (positive = east of UTC)
  daylightOffset: number; // minutes from UTC
  standardMonth: number; // Month when standard time starts (1-12)
  daylightMonth: number; // Month when daylight time starts (1-12)
}

/** Parsed event with optional calendar source info */
export interface ParsedEvent extends Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> {
  calendarName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timezone Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse offset string like "+0100" or "-0500" to minutes from UTC
 */
function parseTimezoneOffset(offsetStr: string): number {
  const sign = offsetStr.startsWith('-') ? -1 : 1;
  const cleaned = offsetStr.replace(/[+-]/, '');
  const hours = parseInt(cleaned.substring(0, 2)) || 0;
  const minutes = parseInt(cleaned.substring(2, 4)) || 0;
  return sign * (hours * 60 + minutes);
}

/**
 * Parse all VTIMEZONE blocks from ICS content
 */
function parseVTimezones(icsContent: string): Map<string, VTimezoneOffset> {
  const timezones = new Map<string, VTimezoneOffset>();
  const lines = icsContent.split(/\r?\n/);

  let inVTimezone = false;
  let inStandard = false;
  let inDaylight = false;
  let currentTzid = '';
  let standardOffset = 0;
  let daylightOffset = 0;
  let standardMonth = 10; // Default October
  let daylightMonth = 3;  // Default March

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VTIMEZONE') {
      inVTimezone = true;
      currentTzid = '';
      standardOffset = 0;
      daylightOffset = 0;
      standardMonth = 10;
      daylightMonth = 3;
    } else if (trimmed === 'END:VTIMEZONE') {
      if (currentTzid) {
        timezones.set(currentTzid, {
          tzid: currentTzid,
          standardOffset,
          daylightOffset: daylightOffset || standardOffset,
          standardMonth,
          daylightMonth,
        });
      }
      inVTimezone = false;
      inStandard = false;
      inDaylight = false;
    } else if (inVTimezone) {
      if (trimmed.startsWith('TZID:')) {
        currentTzid = trimmed.substring(5);
      } else if (trimmed === 'BEGIN:STANDARD') {
        inStandard = true;
        inDaylight = false;
      } else if (trimmed === 'END:STANDARD') {
        inStandard = false;
      } else if (trimmed === 'BEGIN:DAYLIGHT') {
        inDaylight = true;
        inStandard = false;
      } else if (trimmed === 'END:DAYLIGHT') {
        inDaylight = false;
      } else if (trimmed.startsWith('TZOFFSETTO:')) {
        const offset = parseTimezoneOffset(trimmed.substring(11));
        if (inStandard) standardOffset = offset;
        if (inDaylight) daylightOffset = offset;
      } else if (trimmed.startsWith('DTSTART:') && (inStandard || inDaylight)) {
        // Extract month from DTSTART to determine DST transition
        const dtMatch = trimmed.match(/DTSTART:\d{4}(\d{2})/);
        if (dtMatch) {
          const month = parseInt(dtMatch[1]);
          if (inStandard) standardMonth = month;
          if (inDaylight) daylightMonth = month;
        }
      } else if (trimmed.startsWith('RRULE:') && (inStandard || inDaylight)) {
        // Extract month from RRULE BYMONTH if present
        const bymonthMatch = trimmed.match(/BYMONTH=(\d+)/);
        if (bymonthMatch) {
          const month = parseInt(bymonthMatch[1]);
          if (inStandard) standardMonth = month;
          if (inDaylight) daylightMonth = month;
        }
      }
    }
  }

  return timezones;
}

/**
 * Determine if a date is in daylight saving time for a given timezone
 */
function isDaylightSavingTime(month: number, tzOffset: VTimezoneOffset): boolean {
  // Simple heuristic: DST is between daylightMonth and standardMonth
  if (tzOffset.daylightMonth < tzOffset.standardMonth) {
    // Northern hemisphere: DST from ~March to ~October
    return month >= tzOffset.daylightMonth && month < tzOffset.standardMonth;
  } else {
    // Southern hemisphere: DST from ~October to ~March
    return month >= tzOffset.daylightMonth || month < tzOffset.standardMonth;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RRULE Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse RRULE string into structured object
 */
function parseRRule(rruleLine: string): RRule | null {
  const rule: RRule = { freq: 'DAILY', interval: 1 };

  const ruleStr = rruleLine.replace('RRULE:', '');
  const parts = ruleStr.split(';');

  for (const part of parts) {
    const [key, value] = part.split('=');
    switch (key) {
      case 'FREQ':
        if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(value)) {
          rule.freq = value as RRule['freq'];
        }
        break;
      case 'INTERVAL':
        rule.interval = parseInt(value) || 1;
        break;
      case 'UNTIL':
        const untilDate = parseICSDateValue(value);
        if (untilDate) rule.until = untilDate;
        break;
      case 'COUNT':
        rule.count = parseInt(value);
        break;
      case 'BYDAY':
        rule.byday = value.split(',');
        break;
      case 'BYMONTHDAY':
        rule.bymonthday = value.split(',').map(d => parseInt(d));
        break;
    }
  }

  return rule;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date/Time Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a date value (without the property name)
 */
function parseICSDateValue(dateStr: string): Date | null {
  if (!/^\d{8}/.test(dateStr)) return null;

  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));

  if (dateStr.includes('T')) {
    const hour = parseInt(dateStr.substring(9, 11)) || 0;
    const minute = parseInt(dateStr.substring(11, 13)) || 0;
    const second = parseInt(dateStr.substring(13, 15)) || 0;
    if (dateStr.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    return new Date(year, month, day, hour, minute, second);
  }

  return new Date(Date.UTC(year, month, day));
}

/**
 * Parse ICS date-time line with timezone handling
 */
function parseICSDateTime(
  line: string,
  timezones: Map<string, VTimezoneOffset> = new Map()
): string | null {
  // Extract timezone if present
  const tzMatch = line.match(/TZID=([^:;]+)/);
  const timezone = tzMatch ? tzMatch[1] : null;

  // Check if this is a date-only value (all-day event)
  const isDateOnly = line.includes('VALUE=DATE') || !line.includes('T');

  // Extract datetime value (after the last colon)
  const colonIndex = line.lastIndexOf(':');
  if (colonIndex === -1) return null;

  const dateStr = line.substring(colonIndex + 1).trim();
  if (!/^\d{8}/.test(dateStr)) return null;

  // Parse date components
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)); // 1-indexed for DST check
  const monthIndex = month - 1; // 0-indexed for Date constructor
  const day = parseInt(dateStr.substring(6, 8));

  // For date-only values (all-day events), use UTC midnight
  if (isDateOnly || !dateStr.includes('T')) {
    return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0)).toISOString();
  }

  const hour = parseInt(dateStr.substring(9, 11)) || 0;
  const minute = parseInt(dateStr.substring(11, 13)) || 0;
  const second = parseInt(dateStr.substring(13, 15)) || 0;

  // If already UTC (ends with Z), create UTC date directly
  if (dateStr.endsWith('Z')) {
    return new Date(Date.UTC(year, monthIndex, day, hour, minute, second)).toISOString();
  }

  // If timezone specified, convert from that timezone to UTC
  if (timezone) {
    // First, check if we have a VTIMEZONE definition for this timezone
    const vtimezone = timezones.get(timezone);

    if (vtimezone) {
      // Use the VTIMEZONE offset definition from the ICS file
      const isDST = isDaylightSavingTime(month, vtimezone);
      const offsetMinutes = isDST ? vtimezone.daylightOffset : vtimezone.standardOffset;

      // Convert local time to UTC: UTC = local - offset
      const localMs = Date.UTC(year, monthIndex, day, hour, minute, second);
      const utcMs = localMs - (offsetMinutes * 60 * 1000);
      return new Date(utcMs).toISOString();
    }

    // Fallback to IANA timezone via Intl API
    try {
      const referenceUtc = new Date(Date.UTC(year, monthIndex, day, hour, minute, second));
      const tzString = referenceUtc.toLocaleString('sv-SE', { timeZone: timezone });

      const [datePart, timePart] = tzString.split(' ');
      const [tzYear, tzMonth, tzDay] = datePart.split('-').map(Number);
      const [tzHour, tzMinute, tzSecond] = timePart.split(':').map(Number);

      const tzAsUtcMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
      const offsetMs = tzAsUtcMs - referenceUtc.getTime();

      const correctUtcMs = referenceUtc.getTime() - offsetMs;
      return new Date(correctUtcMs).toISOString();
    } catch {
      // Fallback: treat as local timezone if timezone is invalid
      return new Date(year, monthIndex, day, hour, minute, second).toISOString();
    }
  }

  // No timezone but has time: treat as local timezone
  return new Date(year, monthIndex, day, hour, minute, second).toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Recurring Event Expansion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate recurring event instances from RRULE
 */
function expandRecurringEvent(
  baseEvent: ParsedEvent,
  rrule: RRule,
  exdates: Set<string>
): ParsedEvent[] {
  const instances: ParsedEvent[] = [];
  const startDate = new Date(baseEvent.start_time);
  const endDate = new Date(baseEvent.end_time);
  const duration = endDate.getTime() - startDate.getTime();

  // Limit expansion: 1 year from now or UNTIL date, whichever is sooner
  const now = new Date();
  const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const limitDate = rrule.until && rrule.until < maxDate ? rrule.until : maxDate;

  // Start from 6 months ago to catch recent past events
  const minDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  let currentDate = new Date(startDate);
  let count = 0;
  const maxCount = rrule.count || 500; // Safety limit

  while (currentDate <= limitDate && count < maxCount) {
    const dateKey = currentDate.toISOString().split('T')[0];

    // Check if this date should be included
    let includeDate = !exdates.has(dateKey);

    // For WEEKLY with BYDAY, check if current day matches
    if (includeDate && rrule.freq === 'WEEKLY' && rrule.byday) {
      const dayName = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][currentDate.getUTCDay()];
      includeDate = rrule.byday.some(d => d.endsWith(dayName));
    }

    // For MONTHLY with BYMONTHDAY, check if current day matches
    if (includeDate && rrule.freq === 'MONTHLY' && rrule.bymonthday) {
      includeDate = rrule.bymonthday.includes(currentDate.getUTCDate());
    }

    // Only include dates within our relevant range
    if (includeDate && currentDate >= minDate) {
      const instanceStart = new Date(currentDate);
      const instanceEnd = new Date(currentDate.getTime() + duration);

      instances.push({
        ...baseEvent,
        start_time: instanceStart.toISOString(),
        end_time: instanceEnd.toISOString(),
        // Make external_id unique per instance
        external_id: baseEvent.external_id ? `${baseEvent.external_id}_${dateKey}` : undefined,
      });
      count++;
    }

    // Advance to next occurrence based on frequency
    switch (rrule.freq) {
      case 'DAILY':
        currentDate.setUTCDate(currentDate.getUTCDate() + rrule.interval);
        break;
      case 'WEEKLY':
        if (rrule.byday) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        } else {
          currentDate.setUTCDate(currentDate.getUTCDate() + 7 * rrule.interval);
        }
        break;
      case 'MONTHLY':
        if (rrule.bymonthday) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        } else {
          currentDate.setUTCMonth(currentDate.getUTCMonth() + rrule.interval);
        }
        break;
      case 'YEARLY':
        currentDate.setUTCFullYear(currentDate.getUTCFullYear() + rrule.interval);
        break;
    }
  }

  return instances;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an ICS file and extract calendar events with RRULE support
 */
export function parseICSFile(icsContent: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // First, parse all VTIMEZONE blocks to get custom timezone definitions
  const timezones = parseVTimezones(icsContent);

  const lines = icsContent.split(/\r?\n/);

  let currentEvent: (ParsedEvent & { status?: string; method?: string; msInstType?: string; partstat?: string; transparent?: boolean }) | null = null;
  let currentRRule: RRule | null = null;
  let currentExdates: Set<string> = new Set();
  let inEvent = false;
  let currentCalendarName: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track calendar name from X-WR-CALNAME (at VCALENDAR level)
    if (line.startsWith('X-WR-CALNAME:')) {
      currentCalendarName = line.substring(13).trim();
    }

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        title: '',
        start_time: '',
        end_time: '',
        location: undefined,
        is_external: true,
        calendarName: currentCalendarName,
        energy_level: 'medium',
      };
      currentRRule = null;
      currentExdates = new Set();
    } else if (line === 'END:VEVENT' && currentEvent) {
      // Only process events that have required fields and aren't cancelled/declined/hidden
      const isCancelled = currentEvent.status === 'CANCELLED' ||
                          currentEvent.method === 'CANCEL' ||
                          currentEvent.msInstType === '3';
      const isDeclined = currentEvent.partstat === 'DECLINED';
      const isHidden = currentEvent.transparent === true;

      if (currentEvent.title && currentEvent.start_time && currentEvent.end_time && !isCancelled && !isDeclined && !isHidden) {
        // Clean up internal tracking fields before adding
        const { status, method, msInstType, partstat, transparent, ...cleanEvent } = currentEvent;

        if (currentRRule) {
          const instances = expandRecurringEvent(cleanEvent, currentRRule, currentExdates);
          events.push(...instances);
        } else {
          events.push(cleanEvent);
        }
      }
      currentEvent = null;
      currentRRule = null;
      currentExdates = new Set();
      inEvent = false;
    } else if (inEvent && currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.title = line.substring(8);
      } else if (line.startsWith('DTSTART')) {
        const dateTime = parseICSDateTime(line, timezones);
        if (dateTime) currentEvent.start_time = dateTime;
      } else if (line.startsWith('DTEND')) {
        const dateTime = parseICSDateTime(line, timezones);
        if (dateTime) currentEvent.end_time = dateTime;
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9) || undefined;
      } else if (line.startsWith('UID:')) {
        currentEvent.external_id = line.substring(4);
        currentEvent.calendar_source = 'ios_calendar';
      } else if (line.startsWith('RRULE:')) {
        currentRRule = parseRRule(line);
      } else if (line.startsWith('EXDATE')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const dateStr = line.substring(colonIdx + 1);
          const exDate = parseICSDateValue(dateStr);
          if (exDate) {
            currentExdates.add(exDate.toISOString().split('T')[0]);
          }
        }
      } else if (line.startsWith('STATUS:')) {
        currentEvent.status = line.substring(7).trim();
      } else if (line.startsWith('METHOD:')) {
        currentEvent.method = line.substring(7).trim();
      } else if (line.startsWith('X-MICROSOFT-CDO-INSTTYPE:')) {
        currentEvent.msInstType = line.substring(25).trim();
      } else if (line.startsWith('ATTENDEE') && line.includes('PARTSTAT=')) {
        const partstatMatch = line.match(/PARTSTAT=([^;:]+)/);
        if (partstatMatch) {
          const partstat = partstatMatch[1];
          if (partstat === 'DECLINED' && !currentEvent.partstat) {
            currentEvent.partstat = partstat;
          }
        }
      } else if (line.startsWith('TRANSP:')) {
        const transp = line.substring(7).trim();
        if (transp === 'TRANSPARENT') {
          currentEvent.transparent = true;
        }
      }
    }
  }

  return events;
}

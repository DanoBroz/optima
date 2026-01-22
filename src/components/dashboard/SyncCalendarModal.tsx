import { useState, useRef, useEffect } from 'react';
import { X, Upload, Calendar, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types/task';

interface SyncCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (events: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
}

type SyncStep = 'instructions' | 'importing' | 'success' | 'error';

const DRAG_THRESHOLD = 120;

export function SyncCalendarModal({ isOpen, onClose, onImport }: SyncCalendarModalProps) {
  const [step, setStep] = useState<SyncStep>('instructions');
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartY = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);

  // Track pointer on window for reliable drag
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const delta = Math.max(0, e.clientY - dragStartY.current);
      setDragY(delta);
    };

    const handlePointerUp = () => {
      if (dragY > DRAG_THRESHOLD) {
        onClose();
      }
      setDragY(0);
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, dragY, onClose]);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.ics')) {
      setErrorMessage('Please select a valid .ics calendar file');
      setStep('error');
      return;
    }

    setStep('importing');
    try {
      const text = await file.text();
      const events = parseICSFile(text);

      await onImport(events);
      setImportedCount(events.length);
      setStep('success');

      setTimeout(() => {
        onClose();
        resetModal();
      }, 2000);
    } catch (error) {
      console.error('Import error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import calendar');
      setStep('error');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragging(true);
  };

  const handleDragLeave = () => {
    setIsFileDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const resetModal = () => {
    setStep('instructions');
    setImportedCount(0);
    setErrorMessage('');
    setIsFileDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetModal, 300);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    setIsDragging(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-elevated animate-slide-up max-h-[80vh] flex flex-col"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Fixed Header Area */}
        <div className="flex-shrink-0">
          {/* Handle bar */}
          <div
            ref={handleRef}
            className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing select-none hover:bg-secondary/40 transition-colors rounded-t-3xl sm:rounded-t-2xl"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
          >
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/40 sm:w-8 sm:h-1" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Sync iOS Calendar</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-secondary rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-6">
            {step === 'instructions' && (
              <div className="space-y-5">
                <div className="bg-primary/10 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-sm">How to export from iOS Calendar</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open Calendar app on your iPhone/iPad</li>
                    <li>Tap "Calendars" at the bottom</li>
                    <li>Tap the info button (i) next to a calendar</li>
                    <li>Tap "Share Calendar" and choose "Export"</li>
                    <li>Save the .ics file and upload it below</li>
                  </ol>
                </div>

                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer",
                      isFileDragging
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-secondary/50"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium mb-1">
                      {isFileDragging ? 'Drop file here' : 'Click or drag .ics file'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Import calendar events from iOS Calendar
                    </p>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground">
                  <strong>Note:</strong> Events will be imported with their energy drain calculated
                  based on duration. You can edit individual events after import to adjust settings.
                </div>
              </div>
            )}

            {step === 'importing' && (
              <div className="py-8 text-center space-y-4">
                <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin" />
                <div>
                  <p className="font-semibold">Importing calendar events...</p>
                  <p className="text-sm text-muted-foreground mt-1">Please wait</p>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="py-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
                <div>
                  <p className="font-semibold">Successfully imported!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {importedCount} event{importedCount !== 1 ? 's' : ''} added to your calendar
                  </p>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="space-y-5">
                <div className="py-8 text-center space-y-4">
                  <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                  <div>
                    <p className="font-semibold">Import failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
                  </div>
                </div>

                <button
                  onClick={() => setStep('instructions')}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition-all hover:shadow-card active:scale-[0.98]"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// RRULE parsing types
interface RRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  until?: Date;
  count?: number;
  byday?: string[]; // MO, TU, WE, TH, FR, SA, SU
  bymonthday?: number[];
}

// Parse RRULE string into structured object
function parseRRule(rruleLine: string): RRule | null {
  const rule: RRule = { freq: 'DAILY', interval: 1 };

  // Extract the rule part after RRULE:
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
        // Parse UNTIL date (format: 20261231T235959Z or 20261231)
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

// Parse a date value (without the property name)
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

// Generate recurring event instances
function expandRecurringEvent(
  baseEvent: any,
  rrule: RRule,
  exdates: Set<string>
): any[] {
  const instances: any[] = [];
  const startDate = new Date(baseEvent.start_time);
  const endDate = new Date(baseEvent.end_time);
  const duration = endDate.getTime() - startDate.getTime();

  // Limit expansion: 1 year from now or UNTIL date, whichever is sooner
  const now = new Date();
  const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const limitDate = rrule.until && rrule.until < maxDate ? rrule.until : maxDate;

  // Start from the original date or 6 months ago (to catch recent past events)
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
          // Move to next day, the BYDAY check above will filter
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        } else {
          currentDate.setUTCDate(currentDate.getUTCDate() + 7 * rrule.interval);
        }
        break;
      case 'MONTHLY':
        if (rrule.bymonthday) {
          // Move to next day, the BYMONTHDAY check above will filter
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

// Simple ICS parser for calendar events with RRULE support
function parseICSFile(icsContent: string): Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[] {
  const events: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[] = [];
  const lines = icsContent.split(/\r?\n/);

  let currentEvent: any = null;
  let currentRRule: RRule | null = null;
  let currentExdates: Set<string> = new Set();
  let inEvent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        title: '',
        start_time: '',
        end_time: '',
        location: undefined,
        is_external: true,
        energy_level: 'medium',
      };
      currentRRule = null;
      currentExdates = new Set();
    } else if (line === 'END:VEVENT' && currentEvent) {
      // Only process events that have required fields
      if (currentEvent.title && currentEvent.start_time && currentEvent.end_time) {
        if (currentRRule) {
          // Expand recurring event into instances
          const instances = expandRecurringEvent(currentEvent, currentRRule, currentExdates);
          events.push(...instances);
        } else {
          // Single event
          events.push(currentEvent);
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
        const dateTime = parseICSDateTime(line);
        if (dateTime) currentEvent.start_time = dateTime;
      } else if (line.startsWith('DTEND')) {
        const dateTime = parseICSDateTime(line);
        if (dateTime) currentEvent.end_time = dateTime;
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9) || undefined;
      } else if (line.startsWith('UID:')) {
        currentEvent.external_id = line.substring(4);
        currentEvent.calendar_source = 'ios_calendar';
      } else if (line.startsWith('RRULE:')) {
        currentRRule = parseRRule(line);
      } else if (line.startsWith('EXDATE')) {
        // Parse exception dates (dates to skip in recurrence)
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const dateStr = line.substring(colonIdx + 1);
          const exDate = parseICSDateValue(dateStr);
          if (exDate) {
            currentExdates.add(exDate.toISOString().split('T')[0]);
          }
        }
      }
    }
  }

  return events;
}

function parseICSDateTime(line: string): string | null {
  // Extract date-time value from lines like:
  // DTSTART:20240115T090000Z
  // DTSTART;VALUE=DATE:20240115
  // DTSTART;TZID=America/New_York:20240115T090000

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
  const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-indexed for Date
  const day = parseInt(dateStr.substring(6, 8));

  // For date-only values (all-day events), use UTC midnight
  // This ensures consistent filtering regardless of local timezone
  if (isDateOnly || !dateStr.includes('T')) {
    return new Date(Date.UTC(year, month, day, 0, 0, 0)).toISOString();
  }

  let hour = 0, minute = 0, second = 0;
  hour = parseInt(dateStr.substring(9, 11)) || 0;
  minute = parseInt(dateStr.substring(11, 13)) || 0;
  second = parseInt(dateStr.substring(13, 15)) || 0;

  // If already UTC (ends with Z), create UTC date directly
  if (dateStr.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
  }

  // If timezone specified, convert from that timezone to UTC
  if (timezone) {
    try {
      // Create a date string and use Intl to determine the UTC offset
      const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

      // Get the UTC time by calculating the timezone offset
      const tempDate = new Date(localDateStr + 'Z'); // Treat as UTC temporarily
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Format the UTC time in the target timezone to find the offset
      const parts = formatter.formatToParts(tempDate);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

      const tzYear = parseInt(getPart('year'));
      const tzMonth = parseInt(getPart('month')) - 1;
      const tzDay = parseInt(getPart('day'));
      const tzHour = parseInt(getPart('hour'));
      const tzMinute = parseInt(getPart('minute'));
      const tzSecond = parseInt(getPart('second'));

      // Calculate offset: how much the timezone differs from UTC
      const utcMs = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond);
      const offsetMs = utcMs - tempDate.getTime();

      // Apply the inverse offset to get the correct UTC time
      const correctUtcMs = Date.UTC(year, month, day, hour, minute, second) - offsetMs;
      return new Date(correctUtcMs).toISOString();
    } catch {
      // Fallback: treat as local timezone if timezone is invalid
      return new Date(year, month, day, hour, minute, second).toISOString();
    }
  }

  // No timezone but has time: treat as local timezone
  return new Date(year, month, day, hour, minute, second).toISOString();
}

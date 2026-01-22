import { useState, useRef, useEffect } from 'react';
import { X, Upload, Calendar, RefreshCw, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types/task';

interface SyncCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (events: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
  onClearSyncedEvents: () => Promise<number>;
  selectedDate: Date;
}

type SyncStep = 'instructions' | 'select-calendars' | 'select-events' | 'importing' | 'success' | 'error' | 'clearing' | 'cleared';

// Event with calendar source info for filtering
interface ParsedEvent extends Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> {
  calendarName?: string;
}

const DRAG_THRESHOLD = 120;

export function SyncCalendarModal({ isOpen, onClose, onImport, onClearSyncedEvents, selectedDate }: SyncCalendarModalProps) {
  const [step, setStep] = useState<SyncStep>('instructions');
  const [importedCount, setImportedCount] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [availableCalendars, setAvailableCalendars] = useState<string[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
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

    try {
      const text = await file.text();
      const allEvents = parseICSFile(text) as ParsedEvent[];

      // Apply +1 hour correction for macOS Calendar export bug
      const MACOS_OFFSET_CORRECTION_MS = 60 * 60 * 1000;
      const correctedEvents = allEvents.map(event => ({
        ...event,
        start_time: new Date(new Date(event.start_time).getTime() + MACOS_OFFSET_CORRECTION_MS).toISOString(),
        end_time: new Date(new Date(event.end_time).getTime() + MACOS_OFFSET_CORRECTION_MS).toISOString(),
      }));

      // Filter events to only include those on the selected date
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const filteredEvents = correctedEvents.filter(event => {
        const eventDateStr = event.start_time.split('T')[0];
        return eventDateStr === selectedDateStr;
      });

      // Extract unique calendar names
      const calendars = new Set<string>();
      filteredEvents.forEach(e => {
        if (e.calendarName) calendars.add(e.calendarName);
      });
      const calendarList = Array.from(calendars).sort();

      console.log('[ICS Import] Calendars found:', calendarList);
      console.log('[ICS Import] Events for', selectedDateStr, ':', filteredEvents.length);

      setParsedEvents(filteredEvents);
      setAvailableCalendars(calendarList);
      setSelectedCalendars(new Set(calendarList));
      // Select all events by default (use index as ID)
      setSelectedEventIds(new Set(filteredEvents.map((_, i) => i)));

      // Always show event selection so user can review/deselect
      if (filteredEvents.length > 0) {
        setStep('select-events');
      } else {
        setErrorMessage('No events found for this date');
        setStep('error');
      }
    } catch (error) {
      console.error('Import error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import calendar');
      setStep('error');
    }
  };

  const importFilteredEvents = async (events: ParsedEvent[]) => {
    setStep('importing');
    try {
      // Remove calendarName before importing (it's not part of CalendarEvent type)
      const eventsToImport = events.map(({ calendarName, ...event }) => event);
      await onImport(eventsToImport);
      setImportedCount(eventsToImport.length);
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

  const handleImportSelectedCalendars = async () => {
    const filtered = parsedEvents.filter(
      e => !e.calendarName || selectedCalendars.has(e.calendarName)
    );
    await importFilteredEvents(filtered);
  };

  const toggleCalendar = (calendar: string) => {
    setSelectedCalendars(prev => {
      const next = new Set(prev);
      if (next.has(calendar)) {
        next.delete(calendar);
      } else {
        next.add(calendar);
      }
      return next;
    });
  };

  const toggleEvent = (index: number) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleImportSelectedEvents = async () => {
    const selectedEvents = parsedEvents.filter((_, i) => selectedEventIds.has(i));
    await importFilteredEvents(selectedEvents);
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
    setClearedCount(0);
    setErrorMessage('');
    setIsFileDragging(false);
    setParsedEvents([]);
    setAvailableCalendars([]);
    setSelectedCalendars(new Set());
    setSelectedEventIds(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearSyncedEvents = async () => {
    setStep('clearing');
    try {
      const count = await onClearSyncedEvents();
      setClearedCount(count);
      setStep('cleared');

      setTimeout(() => {
        onClose();
        resetModal();
      }, 2000);
    } catch (error) {
      console.error('Clear error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to clear synced events');
      setStep('error');
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

                <button
                  onClick={handleClearSyncedEvents}
                  className="w-full py-3 bg-destructive/10 text-destructive rounded-xl font-medium transition-all hover:bg-destructive/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all synced events
                </button>
              </div>
            )}

            {step === 'select-calendars' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h3 className="font-semibold mb-1">Select calendars to import</h3>
                  <p className="text-sm text-muted-foreground">
                    {parsedEvents.length} events found for today
                  </p>
                </div>

                <div className="space-y-2">
                  {availableCalendars.map(calendar => {
                    const eventCount = parsedEvents.filter(e => e.calendarName === calendar).length;
                    return (
                      <label
                        key={calendar}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                          selectedCalendars.has(calendar)
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-secondary/50 border border-transparent hover:bg-secondary"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCalendars.has(calendar)}
                          onChange={() => toggleCalendar(calendar)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{calendar}</p>
                          <p className="text-xs text-muted-foreground">
                            {eventCount} event{eventCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('instructions')}
                    className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium transition-all hover:bg-secondary/80 active:scale-[0.98]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImportSelectedCalendars}
                    disabled={selectedCalendars.size === 0}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition-all hover:shadow-card active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import ({parsedEvents.filter(e => !e.calendarName || selectedCalendars.has(e.calendarName)).length})
                  </button>
                </div>
              </div>
            )}

            {step === 'select-events' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h3 className="font-semibold mb-1">Select events to import</h3>
                  <p className="text-sm text-muted-foreground">
                    {parsedEvents.length} events found • Deselect any you don't want
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedEvents.map((event, index) => {
                    const startTime = new Date(event.start_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                    return (
                      <label
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                          selectedEventIds.has(index)
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-secondary/30 border border-transparent hover:bg-secondary/50 opacity-60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEventIds.has(index)}
                          onChange={() => toggleEvent(index)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {startTime} {event.location && `• ${event.location}`}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('instructions')}
                    className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-medium transition-all hover:bg-secondary/80 active:scale-[0.98]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImportSelectedEvents}
                    disabled={selectedEventIds.size === 0}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition-all hover:shadow-card active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import ({selectedEventIds.size})
                  </button>
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

            {step === 'clearing' && (
              <div className="py-8 text-center space-y-4">
                <RefreshCw className="w-12 h-12 mx-auto text-destructive animate-spin" />
                <div>
                  <p className="font-semibold">Clearing synced events...</p>
                  <p className="text-sm text-muted-foreground mt-1">Please wait</p>
                </div>
              </div>
            )}

            {step === 'cleared' && (
              <div className="py-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
                <div>
                  <p className="font-semibold">Cleared!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {clearedCount} synced event{clearedCount !== 1 ? 's' : ''} removed
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

// VTIMEZONE parsing types - for custom timezone offset definitions in ICS files
interface VTimezoneOffset {
  tzid: string;
  standardOffset: number; // minutes from UTC (positive = east of UTC)
  daylightOffset: number; // minutes from UTC
  // Approximate DST transition months (for simple DST detection)
  standardMonth: number; // Month when standard time starts (1-12)
  daylightMonth: number; // Month when daylight time starts (1-12)
}

// Parse offset string like "+0100" or "-0500" to minutes from UTC
function parseTimezoneOffset(offsetStr: string): number {
  const sign = offsetStr.startsWith('-') ? -1 : 1;
  const cleaned = offsetStr.replace(/[+-]/, '');
  const hours = parseInt(cleaned.substring(0, 2)) || 0;
  const minutes = parseInt(cleaned.substring(2, 4)) || 0;
  return sign * (hours * 60 + minutes);
}

// Parse all VTIMEZONE blocks from ICS content
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

// Determine if a date is in daylight saving time for a given timezone
function isDaylightSavingTime(month: number, tzOffset: VTimezoneOffset): boolean {
  // Simple heuristic: DST is between daylightMonth and standardMonth
  // This works for Northern Hemisphere (DST in summer)
  if (tzOffset.daylightMonth < tzOffset.standardMonth) {
    // Northern hemisphere: DST from ~March to ~October
    return month >= tzOffset.daylightMonth && month < tzOffset.standardMonth;
  } else {
    // Southern hemisphere: DST from ~October to ~March
    return month >= tzOffset.daylightMonth || month < tzOffset.standardMonth;
  }
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

  // First, parse all VTIMEZONE blocks to get custom timezone definitions
  const timezones = parseVTimezones(icsContent);

  const lines = icsContent.split(/\r?\n/);

  let currentEvent: any = null;
  let currentRRule: RRule | null = null;
  let currentExdates: Set<string> = new Set();
  let inEvent = false;
  let currentCalendarName: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track calendar name from X-WR-CALNAME (at VCALENDAR level)
    if (line.startsWith('X-WR-CALNAME:')) {
      currentCalendarName = line.substring(13).trim();
      console.log('[ICS Parser] Calendar name:', currentCalendarName);
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
      // Debug: log event status info for troubleshooting
      if (currentEvent.title && (currentEvent.status || currentEvent.partstat || currentEvent.transparent)) {
        console.log('[ICS Status]', currentEvent.title,
          'STATUS:', currentEvent.status,
          'PARTSTAT:', currentEvent.partstat,
          'TRANSP:', currentEvent.transparent ? 'TRANSPARENT' : undefined);
      }

      // Only process events that have required fields and aren't cancelled/declined/hidden
      const isCancelled = currentEvent.status === 'CANCELLED' ||
                          currentEvent.method === 'CANCEL' ||
                          currentEvent.msInstType === '3';
      const isDeclined = currentEvent.partstat === 'DECLINED';
      const isHidden = currentEvent.transparent === true;

      // Debug: log what's being filtered
      if (isCancelled || isDeclined || isHidden) {
        console.log('[ICS Filter] Skipping:', currentEvent.title,
          isCancelled ? '(CANCELLED)' : '',
          isDeclined ? '(DECLINED)' : '',
          isHidden ? '(TRANSPARENT)' : '');
      }

      if (currentEvent.title && currentEvent.start_time && currentEvent.end_time && !isCancelled && !isDeclined && !isHidden) {
        if (currentRRule) {
          // Expand recurring event into instances
          const instances = expandRecurringEvent(currentEvent, currentRRule, currentExdates);
          events.push(...instances);
        } else {
          // Single event - remove the status field before adding
          delete currentEvent.status;
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
        // Parse exception dates (dates to skip in recurrence)
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const dateStr = line.substring(colonIdx + 1);
          const exDate = parseICSDateValue(dateStr);
          if (exDate) {
            currentExdates.add(exDate.toISOString().split('T')[0]);
          }
        }
      } else if (line.startsWith('STATUS:')) {
        // Track event status (CONFIRMED, TENTATIVE, CANCELLED)
        currentEvent.status = line.substring(7).trim();
      } else if (line.startsWith('METHOD:')) {
        // Track ICS method (REQUEST, CANCEL, etc.)
        currentEvent.method = line.substring(7).trim();
      } else if (line.startsWith('X-MICROSOFT-CDO-INSTTYPE:')) {
        // Microsoft instance type: 0=single, 1=master, 2=instance, 3=cancelled
        currentEvent.msInstType = line.substring(25).trim();
      } else if (line.startsWith('ATTENDEE') && line.includes('PARTSTAT=')) {
        // Extract participation status from ATTENDEE line
        // Format: ATTENDEE;PARTSTAT=DECLINED;CN=Name:mailto:email
        const partstatMatch = line.match(/PARTSTAT=([^;:]+)/);
        if (partstatMatch) {
          const partstat = partstatMatch[1];
          // If this is "me" (has CUTYPE=INDIVIDUAL and the organizer is different)
          // Or if it's marked as DECLINED, track it
          // For simplicity, track the first DECLINED we find
          if (partstat === 'DECLINED' && !currentEvent.partstat) {
            currentEvent.partstat = partstat;
          }
        }
      } else if (line.startsWith('TRANSP:')) {
        // TRANSP:TRANSPARENT means the event doesn't block time (declined/free)
        const transp = line.substring(7).trim();
        if (transp === 'TRANSPARENT') {
          currentEvent.transparent = true;
        }
      }
    }
  }

  return events;
}

function parseICSDateTime(
  line: string,
  timezones: Map<string, VTimezoneOffset> = new Map()
): string | null {
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
  const month = parseInt(dateStr.substring(4, 6)); // 1-indexed for DST check
  const monthIndex = month - 1; // 0-indexed for Date constructor
  const day = parseInt(dateStr.substring(6, 8));

  // For date-only values (all-day events), use UTC midnight
  // This ensures consistent filtering regardless of local timezone
  if (isDateOnly || !dateStr.includes('T')) {
    return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0)).toISOString();
  }

  let hour = 0, minute = 0, second = 0;
  hour = parseInt(dateStr.substring(9, 11)) || 0;
  minute = parseInt(dateStr.substring(11, 13)) || 0;
  second = parseInt(dateStr.substring(13, 15)) || 0;

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
      // Example: 11:00 CET (offset +60min) → 11:00 - 60min = 10:00 UTC
      const localMs = Date.UTC(year, monthIndex, day, hour, minute, second);
      const utcMs = localMs - (offsetMinutes * 60 * 1000);
      return new Date(utcMs).toISOString();
    }

    // Fallback to IANA timezone via Intl API
    try {
      // Create a UTC reference point with our local time values
      const referenceUtc = new Date(Date.UTC(year, monthIndex, day, hour, minute, second));

      // Get what this UTC time looks like in the target timezone
      // Using 'sv-SE' locale gives consistent ISO-like format: "2026-01-22 12:00:00"
      const tzString = referenceUtc.toLocaleString('sv-SE', { timeZone: timezone });

      // Parse the timezone representation
      const [datePart, timePart] = tzString.split(' ');
      const [tzYear, tzMonth, tzDay] = datePart.split('-').map(Number);
      const [tzHour, tzMinute, tzSecond] = timePart.split(':').map(Number);

      // Calculate offset: (timezone representation as UTC) - (actual UTC)
      // If referenceUtc is 11:00 UTC and it shows as 12:00 in Prague, offset = +1 hour
      const tzAsUtcMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
      const offsetMs = tzAsUtcMs - referenceUtc.getTime();

      // Our input (hour, minute, second) is local time in the specified timezone
      // To get UTC: subtract the offset
      // Example: 11:00 Prague with offset +1hr → 11:00 - 1hr = 10:00 UTC
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

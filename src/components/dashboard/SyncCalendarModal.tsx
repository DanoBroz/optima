import { useState, useRef } from 'react';
import { X, Upload, Calendar, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types/task';

interface SyncCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (events: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
}

type SyncStep = 'instructions' | 'importing' | 'success' | 'error';

export function SyncCalendarModal({ isOpen, onClose, onImport }: SyncCalendarModalProps) {
  const [step, setStep] = useState<SyncStep>('instructions');
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const resetModal = () => {
    setStep('instructions');
    setImportedCount(0);
    setErrorMessage('');
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetModal, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-elevated animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

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
                    isDragging
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
                    {isDragging ? 'Drop file here' : 'Click or drag .ics file'}
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
  );
}

// Simple ICS parser for calendar events
function parseICSFile(icsContent: string): Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[] {
  const events: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[] = [];
  const lines = icsContent.split(/\r?\n/);

  let currentEvent: any = null;
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
    } else if (line === 'END:VEVENT' && currentEvent) {
      // Only add events that have required fields
      if (currentEvent.title && currentEvent.start_time && currentEvent.end_time) {
        events.push(currentEvent);
      }
      currentEvent = null;
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

  const match = line.match(/[:;](\d{8}T?\d{0,6}Z?)/);
  if (!match) return null;

  const dateStr = match[1];

  // Format: YYYYMMDDTHHmmssZ or YYYYMMDD
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  let time = '00:00:00';
  if (dateStr.includes('T')) {
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15) || '00';
    time = `${hour}:${minute}:${second}`;
  }

  // Return ISO format
  return `${year}-${month}-${day}T${time}Z`;
}

export const MINUTES_PER_HOUR = 60;

export const getDurationMinutes = (start: string | Date, end: string | Date): number => {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
};

export const formatDuration = (minutes: number): string => {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const mins = totalMinutes % MINUTES_PER_HOUR;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const getDayTimeRange = (dateStr: string) => ({
  startOfDay: `${dateStr}T00:00:00Z`,
  endOfDay: `${dateStr}T23:59:59Z`,
});

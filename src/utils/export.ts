import { db } from '@/db/database';

export const exportAllData = async () => {
  const tasks = await db.tasks.toArray();
  const events = await db.calendar_events.toArray();
  const energy = await db.daily_energy.toArray();

  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    tasks,
    calendar_events: events,
    daily_energy: energy
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scheduler-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importData = async (file: File) => {
  const text = await file.text();
  const backup = JSON.parse(text);

  await db.transaction('rw', db.tasks, db.calendar_events, db.daily_energy, async () => {
    if (backup.tasks) {
      await db.tasks.bulkAdd(backup.tasks);
    }
    if (backup.calendar_events) {
      await db.calendar_events.bulkAdd(backup.calendar_events);
    }
    if (backup.daily_energy) {
      await db.daily_energy.bulkAdd(backup.daily_energy);
    }
  });
};

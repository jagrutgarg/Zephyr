export function buildGoogleCalendarUrl(quest: {
  title: string;
  description?: string;
  dueDate: Date;
  realmName: string;
}): string {
  // Format YYYYMMDD for all-day events
  const year = quest.dueDate.getUTCFullYear();
  const month = String(quest.dueDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(quest.dueDate.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // For all-day events in Google Calendar format, end date is usually exclusive. 
  // We'll just pass the same day, or day + 1. But YYYYMMDD/YYYYMMDD works fine for a single day.
  const endDay = new Date(quest.dueDate);
  endDay.setUTCDate(endDay.getUTCDate() + 1);
  const endYear = endDay.getUTCFullYear();
  const endMonth = String(endDay.getUTCMonth() + 1).padStart(2, '0');
  const endD = String(endDay.getUTCDate()).padStart(2, '0');
  const endDateStr = `${endYear}${endMonth}${endD}`;

  let details = quest.description ? `\n\n${quest.description}` : "";
  details += `\n\nRealm: ${quest.realmName} · Logged from Aetheria`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Aetheria Quest: ${quest.title}`,
    details: details.trim(),
    dates: `${dateStr}/${endDateStr}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

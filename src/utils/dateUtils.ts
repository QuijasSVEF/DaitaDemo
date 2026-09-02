export function formatDate(date: Date): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getWeekStartDate(date: Date = new Date()): Date {
  const newDate = date instanceof Date ? new Date(date) : new Date();
  newDate.setHours(0, 0, 0, 0);
  newDate.setDate(newDate.getDate() - newDate.getDay());
  return newDate;
}

export function getWeekEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

export function isInCurrentWeek(date: Date): boolean {
  const weekStart = getWeekStartDate();
  const weekEnd = getWeekEndDate(weekStart);
  const checkDate = new Date(date);
  return checkDate >= weekStart && checkDate <= weekEnd;
}

export function getAllWeeks(exitTickets: { timestamp: Date }[]): {
  label: string;
  startDate: Date;
  endDate: Date;
  value: string;
}[] {
  if (!exitTickets.length) return [];

  const weeks = new Map<string, { startDate: Date; endDate: Date }>();

  exitTickets.forEach(ticket => {
    const weekStart = getWeekStartDate(ticket.timestamp);
    const weekEnd = getWeekEndDate(weekStart);
    const weekKey = weekStart.toISOString();

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, {
        startDate: weekStart,
        endDate: weekEnd
      });
    }
  });

  return Array.from(weeks.entries())
    .map(([value, { startDate, endDate }]) => ({
      label: `Week of ${startDate.toLocaleDateString()}`,
      startDate,
      endDate,
      value
    }))
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

export function filterDataByWeek<T extends { timestamp: Date }>(
  data: T[],
  selectedWeek: string
): T[] {
  if (selectedWeek === 'all') return data;

  const weekStart = new Date(selectedWeek);
  const weekEnd = getWeekEndDate(weekStart);

  return data.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= weekStart && itemDate <= weekEnd;
  });
}
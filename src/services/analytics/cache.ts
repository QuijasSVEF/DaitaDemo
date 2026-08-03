// Analytics caching service
const CACHE_KEY = 'classroom_analytics_cache';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry {
  data: any;
  timestamp: number;
  teacherUsername: string;
  weekKey: string;
  dataHash: string; // Add hash to detect data changes
}

// Generate a simple hash of the data to detect changes
function generateDataHash(students: any[], exitTickets: any[]): string {
  const dataString = JSON.stringify({
    studentCount: students.length,
    ticketCount: exitTickets.length,
    lastTicketTime: exitTickets.length > 0 ? exitTickets[0].timestamp : null
  });
  return btoa(dataString).slice(0, 16);
}
export function getCachedAnalytics(
  teacherUsername: string, 
  weekKey: string,
  students: any[] = [],
  exitTickets: any[] = []
): any | null {
  try {
    const cache = localStorage.getItem(CACHE_KEY);
    if (!cache) return null;

    const entries: CacheEntry[] = JSON.parse(cache);
    const entry = entries.find(
      e => e.teacherUsername === teacherUsername && 
      e.weekKey === weekKey &&
      Date.now() - e.timestamp < CACHE_DURATION
    );

    if (!entry) return null;

    // Check if data has changed significantly
    const currentHash = generateDataHash(students, exitTickets);
    if (entry.dataHash && entry.dataHash !== currentHash && weekKey === 'all') {
      console.log('Data has changed, invalidating cache');
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Error reading analytics cache:', error);
    return null;
  }
}

export function cacheAnalytics(
  data: any, 
  teacherUsername: string, 
  weekKey: string,
  students: any[] = [],
  exitTickets: any[] = []
): void {
  try {
    const cache = localStorage.getItem(CACHE_KEY);
    const entries: CacheEntry[] = cache ? JSON.parse(cache) : [];
    
    // Remove old entries for this teacher/week
    const filtered = entries.filter(
      e => e.teacherUsername !== teacherUsername || e.weekKey !== weekKey
    );
    
    const dataHash = generateDataHash(students, exitTickets);
    
    // Add new entry
    filtered.push({
      data,
      timestamp: Date.now(),
      teacherUsername,
      weekKey,
      dataHash
    });
    
    // Keep only recent entries
    const recent = filtered.filter(e => Date.now() - e.timestamp < CACHE_DURATION);
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(recent));
  } catch (error) {
    console.error('Error caching analytics:', error);
  }
}
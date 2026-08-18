import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase/config';
import { formatStudentIdentifier, StudentIdentity } from '../utils/studentIdentifier';

export interface StudentIdentifierRow {
  id: number;
  teacher_username: string;
  first_name: string | null;
  last_initial: string | null;
  emoji_password: string | null;
}

export function useStudentIdentifiers(
  studentIds: number[],
  teacherUsername?: string
) {
  const ids = Array.from(new Set(studentIds.filter((n) => Number.isFinite(n))));

  const { data = [] } = useQuery({
    queryKey: ['studentIdentifiers', teacherUsername || 'all', ids.sort((a, b) => a - b).join(',')],
    queryFn: async (): Promise<StudentIdentifierRow[]> => {
      if (ids.length === 0) return [];
      let query = supabase
        .from('students')
        .select('id, teacher_username, first_name, last_initial, emoji_password')
        .in('id', ids);
      if (teacherUsername) {
        query = query.eq('teacher_username', teacherUsername);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error loading student identifiers:', error);
        return [];
      }
      return data || [];
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  const map = new Map<number, StudentIdentity>();
  data.forEach((row) => {
    map.set(row.id, {
      id: row.id,
      first_name: row.first_name,
      last_initial: row.last_initial,
      emoji_password: row.emoji_password,
    });
  });

  const getIdentifier = (studentId: number): string => {
    const identity = map.get(studentId);
    if (identity) return formatStudentIdentifier(identity);
    return `Student #${studentId}`;
  };

  const getName = (studentId: number): string => {
    const identity = map.get(studentId);
    if (!identity) return `Student #${studentId}`;
    const first = identity.first_name || '';
    const initial = identity.last_initial ? `${identity.last_initial.toUpperCase()}.` : '';
    return [first, initial].filter(Boolean).join(' ') || `Student #${studentId}`;
  };

  return { getIdentifier, getName, map };
}

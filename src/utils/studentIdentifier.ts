export interface StudentIdentity {
  firstName?: string | null;
  first_name?: string | null;
  lastInitial?: string | null;
  last_initial?: string | null;
  emoji?: string | null;
  emoji_password?: string | null;
  id?: number | null;
}

export function formatStudentIdentifier(student: StudentIdentity | null | undefined): string {
  if (!student) return 'Unknown student';

  const first = student.firstName ?? student.first_name ?? '';
  const initial = student.lastInitial ?? student.last_initial ?? '';
  const emoji = student.emoji ?? student.emoji_password ?? '';

  const name = [first, initial ? `${initial.toUpperCase()}.` : ''].filter(Boolean).join(' ');
  const identifier = [name, emoji].filter(Boolean).join(' ').trim();
  return identifier || (student.id != null ? `Student #${student.id}` : 'Unknown student');
}

export function formatStudentName(student: StudentIdentity | null | undefined): string {
  if (!student) return 'Unknown student';
  const first = student.firstName ?? student.first_name ?? '';
  const initial = student.lastInitial ?? student.last_initial ?? '';
  const name = [first, initial ? `${initial.toUpperCase()}.` : ''].filter(Boolean).join(' ');
  return name || (student.id != null ? `Student #${student.id}` : 'Unknown student');
}

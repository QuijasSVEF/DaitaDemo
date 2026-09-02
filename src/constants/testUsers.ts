export const TEST_TEACHER_USERNAMES = ['quijas', 'danielleletts', 'olenamclin'];

export const TEST_MENTOR_IDS = ['b571dc40-3373-423c-8892-186478f32442'];

export const TEST_COACH_IDS = ['b9c76d9c-a171-4cd1-a7b3-d06b5ab2ff03'];

export const TEST_STUDENT_IDS = [
  190, 324, 1075, 253, 383, 1834, 1899, 378, 1137, 402, 585, 384,
  2296, 1747, 611, 958,
];

const TEST_NAME_PATTERNS = /^(test|testing|abcd|xxx)$/i;

export function isTestStudentName(firstName: string): boolean {
  return TEST_NAME_PATTERNS.test(firstName.trim());
}

export function isTestStudent(studentId: number, firstName?: string): boolean {
  if (TEST_STUDENT_IDS.includes(studentId)) return true;
  if (firstName && isTestStudentName(firstName)) return true;
  return false;
}

const STORAGE_KEY = 'daita_exclude_test_data';

export function getExcludeTestData(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export function setExcludeTestData(value: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(value));
}

import { Student, ExitTicketResult } from '../../types';
import { WeeklyGroup } from '../firebase/weeklyGroups';
import { v4 as uuidv4 } from 'uuid';
import { openai, MODEL } from '../openai/config';
import { GROUPING_PROMPT } from '../openai/prompts';
import { prepareStudentData } from './utils';
import { GroupingFailedError } from './errors';
import { GroupingResult, StudentGroupData } from './types';
import { DEMO_MODE, DEMO_LATENCY, demoDelay } from '../../config/demoMode';

const MAX_GROUP_SIZE = 5;
const MIN_GROUP_SIZE = 2;

type RawGroup = Omit<WeeklyGroup, 'teacherUsername' | 'weekStartDate' | 'lastUpdated'>;

function buildGroupsByExactStruggles(studentData: StudentGroupData[]): RawGroup[] {
  const struggleGroups = new Map<string, StudentGroupData[]>();

  studentData.forEach(student => {
    const key = student.struggles.slice().sort().join('|');
    if (!struggleGroups.has(key)) {
      struggleGroups.set(key, []);
    }
    struggleGroups.get(key)!.push(student);
  });

  const groups: RawGroup[] = [];

  struggleGroups.forEach((students, key) => {
    const focusAreas = key.split('|');

    for (let i = 0; i < students.length; i += MAX_GROUP_SIZE) {
      const groupStudents = students.slice(i, i + MAX_GROUP_SIZE);
      groups.push({
        id: uuidv4(),
        students: groupStudents.map(s => s.id),
        focusAreas,
        recommendedApproach: groupStudents.length === 1
          ? 'Individual targeted instruction'
          : 'Collaborative learning with peer support on shared struggle areas'
      });
    }
  });

  return mergeSmallGroups(groups);
}

function mergeSmallGroups(groups: RawGroup[]): RawGroup[] {
  const result: RawGroup[] = [];
  const used = new Set<number>();

  for (let i = 0; i < groups.length; i++) {
    if (used.has(i)) continue;
    const group: RawGroup = { ...groups[i], students: [...groups[i].students], focusAreas: [...groups[i].focusAreas] };

    if (group.students.length < MIN_GROUP_SIZE) {
      const groupKey = group.focusAreas.slice().sort().join('|');

      // Try to merge with another small group that has the same focus areas
      for (let j = i + 1; j < groups.length; j++) {
        if (used.has(j)) continue;
        const otherKey = groups[j].focusAreas.slice().sort().join('|');
        if (otherKey === groupKey && group.students.length + groups[j].students.length <= MAX_GROUP_SIZE) {
          group.students.push(...groups[j].students);
          used.add(j);
        }
      }

      // If still too small (solo student), try merging with groups that share most focus areas
      if (group.students.length < MIN_GROUP_SIZE) {
        const groupAreas = new Set(group.focusAreas);
        for (let j = i + 1; j < groups.length; j++) {
          if (used.has(j)) continue;
          if (groups[j].students.length >= MIN_GROUP_SIZE) continue;
          const otherAreas = groups[j].focusAreas;
          const overlapCount = otherAreas.filter(a => groupAreas.has(a)).length;
          const totalAreas = new Set([...group.focusAreas, ...otherAreas]).size;
          const overlapRatio = overlapCount / totalAreas;
          if (overlapRatio >= 0.5 && group.students.length + groups[j].students.length <= MAX_GROUP_SIZE) {
            group.students.push(...groups[j].students);
            const mergedAreas = new Set([...group.focusAreas, ...groups[j].focusAreas]);
            group.focusAreas = [...mergedAreas].sort();
            used.add(j);
          }
        }
      }
    }

    group.recommendedApproach = group.students.length === 1
      ? 'Individual targeted instruction'
      : 'Collaborative small-group instruction on shared struggle areas';
    result.push(group);
  }

  return result;
}

function validateAndFixGroups(
  aiGroups: { students: number[]; focusAreas: string[]; recommendedApproach?: string }[],
  studentData: StudentGroupData[]
): RawGroup[] {
  const studentStrugglesMap = new Map<number, string>();
  studentData.forEach(s => {
    studentStrugglesMap.set(s.id, s.struggles.slice().sort().join('|'));
  });

  // Merge groups with identical focus area sets and enforce max size
  const mergedMap = new Map<string, number[]>();

  for (const group of aiGroups) {
    const groupKey = group.focusAreas.slice().sort().join('|');

    // Validate each student actually has these exact struggles
    for (const studentId of group.students) {
      const studentKey = studentStrugglesMap.get(studentId);
      if (studentKey === groupKey) {
        if (!mergedMap.has(groupKey)) {
          mergedMap.set(groupKey, []);
        }
        mergedMap.get(groupKey)!.push(studentId);
      }
    }
  }

  // Check for unassigned students
  const assignedStudents = new Set<number>();
  for (const students of mergedMap.values()) {
    students.forEach(id => assignedStudents.add(id));
  }

  // Add unassigned students to their correct group by struggle key
  for (const student of studentData) {
    if (!assignedStudents.has(student.id)) {
      const key = student.struggles.slice().sort().join('|');
      if (!mergedMap.has(key)) {
        mergedMap.set(key, []);
      }
      mergedMap.get(key)!.push(student.id);
    }
  }

  // Deduplicate student IDs and split into max-size groups
  const splitGroups: RawGroup[] = [];

  mergedMap.forEach((studentIds, key) => {
    const uniqueIds = [...new Set(studentIds)];
    const focusAreas = key.split('|');

    for (let i = 0; i < uniqueIds.length; i += MAX_GROUP_SIZE) {
      const chunk = uniqueIds.slice(i, i + MAX_GROUP_SIZE);
      splitGroups.push({
        id: uuidv4(),
        students: chunk,
        focusAreas,
        recommendedApproach: chunk.length === 1
          ? 'Individual targeted instruction'
          : 'Collaborative small-group instruction on shared struggle areas'
      });
    }
  });

  return mergeSmallGroups(splitGroups);
}

export async function groupStudentsByStruggleAreas(
  students: Student[],
  exitTickets: ExitTicketResult[]
): Promise<RawGroup[]> {
  const studentData = prepareStudentData(students, exitTickets);

  if (studentData.length === 0) {
    return [];
  }

  // In demo mode, always use deterministic grouping (no AI calls)
  if (DEMO_MODE) {
    await demoDelay(DEMO_LATENCY.grouping);
    return buildGroupsByExactStruggles(studentData);
  }

  // If few students, skip AI and use deterministic grouping
  if (studentData.length <= 6) {
    return buildGroupsByExactStruggles(studentData);
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: GROUPING_PROMPT(studentData) }],
      model: MODEL,
      temperature: 0.3,
      max_completion_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    let cleanedResponse = responseText;
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
    cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    cleanedResponse = cleanedResponse.trim();

    let response;
    try {
      response = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return buildGroupsByExactStruggles(studentData);
    }

    if (!response?.groups?.length) {
      return buildGroupsByExactStruggles(studentData);
    }

    const rawGroups = response.groups
      .filter((g: any) => Array.isArray(g.students) && Array.isArray(g.focusAreas))
      .map((g: any) => ({
        students: g.students as number[],
        focusAreas: g.focusAreas.map((a: string) => a.trim()),
        recommendedApproach: g.recommendedApproach
      }));

    // Validate, merge duplicates, enforce max size, and ensure all students assigned
    const validated = validateAndFixGroups(rawGroups, studentData);
    return validated.length > 0 ? validated : buildGroupsByExactStruggles(studentData);
  } catch (error) {
    console.error('Error grouping students:', error);
    return buildGroupsByExactStruggles(studentData);
  }
}

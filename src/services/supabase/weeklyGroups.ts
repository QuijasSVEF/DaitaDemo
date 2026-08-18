import { supabase } from './config';
import { WeeklyGroup } from '../../types';

export async function saveWeeklyGroups(
  groups: Omit<WeeklyGroup, 'teacherUsername' | 'weekStartDate' | 'lastUpdated'>[],
  teacherUsername: string
): Promise<WeeklyGroup[] | null> {
  try {
    if (!teacherUsername || !teacherUsername.trim()) {
      console.error('Invalid teacher username');
      return null;
    }

    // First verify the teacher exists and is active
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('username, account_status, account_locked')
      .eq('username', teacherUsername.trim())
      .single();

    if (teacherError) {
      console.error('Error verifying teacher:', teacherError);
      throw new Error('Teacher not found or not properly configured');
    }

    if (!teacherData) {
      console.error('Teacher not found:', teacherUsername);
      throw new Error('Teacher not found');
    }

    if (teacherData.account_locked) {
      console.error('Teacher account is locked:', teacherUsername);
      throw new Error('Teacher account is locked');
    }

    if (teacherData.account_status !== 'active') {
      console.error('Teacher account is not active:', teacherUsername);
      throw new Error('Teacher account is not active');
    }
    
    if (!groups || groups.length === 0) {
      console.log('No groups to save');
      return [];
    }

    // Delete existing groups for the current week
    await deleteExistingWeekGroups(teacherUsername);

    const weekStartDate = getWeekStartDate();
    const savedGroups: WeeklyGroup[] = [];

    // Insert new groups
    const { data, error } = await supabase
      .from('weekly_groups')
      .insert(
        groups.map(group => ({
          teacher_username: teacherUsername,
          week_start_date: weekStartDate.toISOString(),
          focus_areas: group.focusAreas,
          students: group.students,
          recommended_approach: group.recommendedApproach,
          lesson_plan_id: group.lessonPlanId
        }))
      )
      .select();

    if (error) {
      console.error('Error inserting weekly groups:', error);
      throw error;
    }

    return data.map(group => ({
      id: group.id,
      teacherUsername: group.teacher_username,
      weekStartDate: new Date(group.week_start_date),
      focusAreas: group.focus_areas,
      students: group.students,
      recommendedApproach: group.recommended_approach,
      lessonPlanId: group.lesson_plan_id,
      lastUpdated: new Date(group.created_at)
    }));
  } catch (error) {
    console.error('Error saving weekly groups:', error);
    throw error;
  }
}

async function deleteExistingWeekGroups(teacherUsername: string): Promise<void> {
  try {
    const weekStartDate = getWeekStartDate();
    const weekDateStr = weekStartDate.toISOString().slice(0, 10);

    const { error } = await supabase
      .from('weekly_groups')
      .delete()
      .eq('teacher_username', teacherUsername)
      .gte('week_start_date', weekStartDate.toISOString());

    if (error) {
      console.error('Error deleting existing groups:', error);
    }

    // Also clean up mentor groups for this week so teachers must reassign
    const { data: mentorGroups } = await supabase
      .from('mentor_groups')
      .select('id')
      .eq('teacher_username', teacherUsername)
      .like('name', `Week ${weekDateStr}%`);

    if (mentorGroups && mentorGroups.length > 0) {
      const groupIds = mentorGroups.map(g => g.id);
      await supabase
        .from('mentor_group_assignments')
        .delete()
        .in('group_id', groupIds);
      await supabase
        .from('mentor_group_students')
        .delete()
        .in('group_id', groupIds);
      await supabase
        .from('mentor_groups')
        .delete()
        .in('id', groupIds);
    }
  } catch (error) {
    console.error('Error deleting existing groups:', error);
  }
}

export async function getCurrentWeekGroups(teacherUsername: string): Promise<WeeklyGroup[]> {
  try {
    // First verify the teacher exists and is active
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('username, account_status, account_locked')
      .eq('username', teacherUsername)
      .maybeSingle();

    if (teacherError) {
      console.error('Error verifying teacher:', teacherError);
      return [];
    }

    if (!teacherData) {
      console.error('Teacher not found:', teacherUsername);
      return [];
    }

    if (teacherData.account_locked) {
      console.error('Teacher account is locked:', teacherUsername);
      return [];
    }

    if (teacherData.account_status !== 'active') {
      console.error('Teacher account is not active:', teacherUsername);
      return [];
    }

    const weekStartDate = getWeekStartDate();
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('weekly_groups')
      .select('*')
      .eq('teacher_username', teacherUsername)
      .gte('week_start_date', weekStartDate.toISOString())
      .lte('week_start_date', weekEndDate.toISOString());

    if (error) {
      console.error('Error fetching weekly groups:', error);
      return [];
    }

    return data.map(group => ({
      id: group.id,
      teacherUsername: group.teacher_username,
      weekStartDate: new Date(group.week_start_date),
      focusAreas: group.focus_areas,
      students: group.students,
      recommendedApproach: group.recommended_approach,
      lessonPlanId: group.lesson_plan_id,
      lastUpdated: new Date(group.created_at)
    }));
  } catch (error) {
    console.error('Error getting weekly groups:', error);
    return [];
  }
}

export async function getAvailableWeeks(teacherUsername: string): Promise<Date[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_groups')
      .select('week_start_date')
      .eq('teacher_username', teacherUsername)
      .order('week_start_date', { ascending: false });

    if (error || !data) return [];

    const uniqueWeeks = new Map<string, Date>();
    data.forEach(row => {
      const d = new Date(row.week_start_date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay());
      const key = d.toISOString();
      if (!uniqueWeeks.has(key)) uniqueWeeks.set(key, d);
    });

    return Array.from(uniqueWeeks.values());
  } catch {
    return [];
  }
}

export async function getGroupsByWeek(teacherUsername: string, weekStart: Date): Promise<WeeklyGroup[]> {
  try {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('weekly_groups')
      .select('*')
      .eq('teacher_username', teacherUsername)
      .gte('week_start_date', weekStart.toISOString())
      .lte('week_start_date', weekEnd.toISOString());

    if (error || !data) return [];

    return data.map(group => ({
      id: group.id,
      teacherUsername: group.teacher_username,
      weekStartDate: new Date(group.week_start_date),
      focusAreas: group.focus_areas,
      students: group.students,
      recommendedApproach: group.recommended_approach,
      lessonPlanId: group.lesson_plan_id,
      lastUpdated: new Date(group.created_at)
    }));
  } catch {
    return [];
  }
}

function getWeekStartDate(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

export async function moveStudentBetweenGroups(
  studentId: number,
  fromGroupId: string,
  toGroupId: string
): Promise<void> {
  // Fetch both groups
  const { data: fromGroup, error: fromErr } = await supabase
    .from('weekly_groups')
    .select('*')
    .eq('id', fromGroupId)
    .single();

  if (fromErr || !fromGroup) throw new Error('Source group not found');

  const { data: toGroup, error: toErr } = await supabase
    .from('weekly_groups')
    .select('*')
    .eq('id', toGroupId)
    .single();

  if (toErr || !toGroup) throw new Error('Target group not found');

  // Remove student from source group
  const updatedFromStudents = (fromGroup.students as number[]).filter(id => id !== studentId);

  // Add student to target group (avoid duplicates)
  const toStudents = toGroup.students as number[];
  if (!toStudents.includes(studentId)) {
    toStudents.push(studentId);
  }

  // If source group is now empty, delete it
  if (updatedFromStudents.length === 0) {
    await supabase.from('weekly_groups').delete().eq('id', fromGroupId);
  } else {
    await supabase
      .from('weekly_groups')
      .update({ students: updatedFromStudents })
      .eq('id', fromGroupId);
  }

  // Update target group
  await supabase
    .from('weekly_groups')
    .update({ students: toStudents })
    .eq('id', toGroupId);

  // Sync mentor_group_students: move student from source mentor group to target mentor group
  const weekDate = new Date(fromGroup.week_start_date).toISOString().slice(0, 10);
  const teacherUsername = fromGroup.teacher_username;

  const { data: mentorGroups } = await supabase
    .from('mentor_groups')
    .select('id, name')
    .eq('teacher_username', teacherUsername)
    .like('name', `Week ${weekDate}%`);

  if (mentorGroups && mentorGroups.length > 0) {
    // Remove student from any mentor group for this week
    const allMentorGroupIds = mentorGroups.map(g => g.id);
    await supabase
      .from('mentor_group_students')
      .delete()
      .eq('student_id', studentId)
      .in('group_id', allMentorGroupIds);

    // Determine the target group's index to find its mentor group
    const { data: allWeeklyGroups } = await supabase
      .from('weekly_groups')
      .select('id')
      .eq('teacher_username', teacherUsername)
      .gte('week_start_date', new Date(fromGroup.week_start_date).toISOString())
      .order('created_at', { ascending: true });

    if (allWeeklyGroups) {
      const targetIndex = allWeeklyGroups.findIndex(g => g.id === toGroupId);
      if (targetIndex >= 0) {
        const targetMentorGroupName = `Week ${weekDate} - Group ${targetIndex + 1}`;
        const targetMentorGroup = mentorGroups.find(g => g.name === targetMentorGroupName);

        if (targetMentorGroup) {
          await supabase
            .from('mentor_group_students')
            .insert({ group_id: targetMentorGroup.id, student_id: studentId });
        }
      }
    }
  }
}
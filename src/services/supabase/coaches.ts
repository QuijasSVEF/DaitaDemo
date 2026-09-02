import { supabase } from './config';
import { Coach, TeacherAssignment } from '../../types';

export async function signInCoach(email: string, password: string): Promise<Coach> {
  const { data, error } = await supabase.rpc('authenticate_coach', {
    p_email: email.toLowerCase(),
    p_password: password
  });

  if (error) {
    throw new Error('Login failed. Please try again.');
  }

  const result = data as any;

  if (!result?.success) {
    throw new Error(result?.message || 'Invalid credentials');
  }

  const coach = result.coach;
  return {
    id: coach.id,
    email: coach.email,
    fullName: coach.full_name
  };
}

export async function getAssignedTeachers(coachId: string): Promise<TeacherAssignment[]> {
  const { data, error } = await supabase
    .from('coach_teacher_assignments')
    .select(`
      id,
      teacher_username,
      teachers (
        username,
        name,
        last_login
      )
    `)
    .eq('coach_id', coachId);

  if (error) {
    throw error;
  }

  return (data || []).map((assignment: any) => ({
    id: assignment.id,
    teacherUsername: assignment.teacher_username,
    teacherName: assignment.teachers?.name || assignment.teacher_username,
    lastLogin: assignment.teachers?.last_login || null
  }));
}

export async function assignTeacherToCoach(coachId: string, teacherUsername: string): Promise<void> {
  const { data, error } = await supabase.rpc('assign_teacher_to_coach', {
    p_coach_id: coachId,
    p_teacher_username: teacherUsername
  });

  if (error) {
    throw new Error('Failed to assign teacher to coach');
  }

  const result = data as any;
  if (!result?.success) {
    throw new Error(result?.message || 'Failed to assign teacher');
  }
}

export async function unassignTeacherFromCoach(coachId: string, teacherUsername: string): Promise<void> {
  const { data, error } = await supabase.rpc('unassign_teacher_from_coach', {
    p_coach_id: coachId,
    p_teacher_username: teacherUsername
  });

  if (error) {
    throw new Error('Failed to unassign teacher from coach');
  }

  const result = data as any;
  if (!result?.success) {
    throw new Error(result?.message || 'Failed to unassign teacher');
  }
}

export async function deleteCoach(coachId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_coach', {
    p_coach_id: coachId
  });

  if (error) {
    throw new Error('Failed to delete coach');
  }

  const result = data as any;
  if (!result?.success) {
    throw new Error(result?.message || 'Failed to delete coach');
  }
}

export async function toggleCoachLock(coachId: string, locked: boolean): Promise<void> {
  const { data, error } = await supabase.rpc('toggle_coach_lock', {
    p_coach_id: coachId,
    p_locked: locked
  });

  if (error) {
    throw new Error('Failed to update coach status');
  }

  const result = data as any;
  if (!result?.success) {
    throw new Error(result?.message || 'Failed to update coach status');
  }
}

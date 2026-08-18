import { supabase } from './config';
import { Student } from '../../types';

// Get all students for a teacher
export async function getTeacherStudents(teacherUsername: string): Promise<Student[]> {
  try {
    if (!teacherUsername) {
      console.warn('Teacher username is required');
      return [];
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        student_id,
        quiz_templates!inner (
          grade_level
        )
      `)
      .eq('teacher_username', teacherUsername)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error getting students with assessments:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const studentMap = new Map<number, { gradeLevel: string }>();
    data.forEach(attempt => {
      if (!studentMap.has(attempt.student_id)) {
        studentMap.set(attempt.student_id, {
          gradeLevel: attempt.quiz_templates.grade_level
        });
      }
    });

    const ids = Array.from(studentMap.keys());
    const { data: studentRows, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_initial, emoji_password, grade_level, subject')
      .eq('teacher_username', teacherUsername)
      .in('id', ids);

    if (studentsError) {
      console.error('Error getting student profiles:', studentsError);
    }

    const profileMap = new Map<number, any>();
    (studentRows || []).forEach(s => profileMap.set(s.id, s));

    return ids.map(id => {
      const p = profileMap.get(id);
      return {
        id,
        firstName: p?.first_name || '',
        lastInitial: p?.last_initial || '',
        emoji: p?.emoji_password || '',
        gradeLevel: studentMap.get(id)?.gradeLevel || p?.grade_level || '6',
        subject: p?.subject || 'Mathematics',
        teacherUsername
      };
    });
  } catch (error) {
    console.error('Error getting students with assessments:', error);
    return [];
  }
}

// Get students with assessments for the current week
export async function getStudentsWithAssessmentsForWeek(
  teacherUsername: string,
  weekStart: Date,
  weekEnd: Date
): Promise<Student[]> {
  try {
    // Get quiz attempts for the current week
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('student_id')
      .eq('teacher_username', teacherUsername)
      .gte('completed_at', weekStart.toISOString())
      .lte('completed_at', weekEnd.toISOString());

    if (attemptsError) throw attemptsError;
    
    // Get unique student IDs
    const studentIds = [...new Set(attempts?.map(a => a.student_id) || [])];
    
    // Get student details
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, grade_level, subject')
      .in('id', studentIds);
      
    if (studentsError) throw studentsError;
    
    const { data: profileRows } = await supabase
      .from('students')
      .select('id, first_name, last_initial, emoji_password')
      .eq('teacher_username', teacherUsername)
      .in('id', studentIds);
    const profileMap = new Map<number, any>();
    (profileRows || []).forEach(p => profileMap.set(p.id, p));

    return students.map(s => {
      const p = profileMap.get(s.id);
      return {
        id: s.id,
        firstName: p?.first_name || '',
        lastInitial: p?.last_initial || '',
        emoji: p?.emoji_password || '',
        gradeLevel: s.grade_level,
        subject: s.subject || 'Mathematics',
        teacherUsername
      };
    });
  } catch (error) {
    console.error('Error getting students with assessments:', error);
    return [];
  }
}

export async function deleteAllStudentData(teacherUsername: string): Promise<void> {
  try {
    // Use the RPC function to delete all student data
    const { error: deleteError } = await supabase.rpc('delete_all_student_data', {
      p_teacher_username: teacherUsername
    });

    if (deleteError) {
      console.error('Error deleting student data:', deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('Error in deleteAllStudentData:', error);
    throw new Error('Failed to delete student data. Please try again.');
  }
}

export async function saveStudent(
  student: Student,
  teacherUsername: string
): Promise<Student | null> {
  try {
    if (!teacherUsername) {
      throw new Error('Teacher username is required');
    }
    
    // Get the active quiz to determine the correct grade level
    const { data: activeQuiz, error: quizError } = await supabase
      .from('quiz_templates')
      .select('grade_level')
      .eq('teacher_username', teacherUsername)
      .eq('is_active', true)
      .maybeSingle();

    const gradeLevel = activeQuiz?.grade_level || student.gradeLevel || '6';
    console.log(`Using grade level ${gradeLevel} from active quiz for student ${student.id}`);

    console.log(`Saving student ${student.id} for teacher ${teacherUsername} with grade ${student.gradeLevel}`);

    // Use the RPC function to ensure student exists
    const { data: result, error: rpcError } = await supabase.rpc('ensure_student_exists', {
      p_student_id: student.id,
      p_teacher_username: teacherUsername,
      p_grade_level: gradeLevel,
      p_subject: student.subject || 'Mathematics'
    });

    if (rpcError) {
      console.error('Error saving student:', rpcError);
      throw rpcError;
      return null;
    }

    return {
      id: student.id,
      firstName: student.firstName || '',
      lastInitial: student.lastInitial || '',
      emoji: student.emoji || '',
      gradeLevel: gradeLevel,
      subject: student.subject || 'Mathematics',
      teacherUsername: teacherUsername
    };
  } catch (error) {
    console.error('Error in saveStudent:', error);
    throw error;
  }
}


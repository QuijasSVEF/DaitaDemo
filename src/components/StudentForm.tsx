import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Student, ExitTicketResult } from '../types';
import { GraduationCap, AlertCircle, Users } from 'lucide-react';
import { cn } from '../utils/cn';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase/config';
import { getWeekStartDate, getWeekEndDate } from '../utils/dateUtils';

interface Props {
  onSubmit: (data: Student) => void;
  students: Student[];
  exitTickets: ExitTicketResult[];
  teacherUsername: string;
}

interface FormData {
  selectedStudent: string;
}

export function StudentForm({ onSubmit, students, exitTickets, teacherUsername }: Props) {
  const { 
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch
  } = useForm<FormData>({
    defaultValues: {
      selectedStudent: ''
    }
  });  

  // Get current week's start and end dates
  const weekStart = getWeekStartDate();
  const weekEnd = getWeekEndDate(weekStart);
  const queryClient = useQueryClient();

  // Use React Query to fetch students with assessments
  const { data: assessedStudents = [], isLoading: isLoadingStudents, error: studentsError, refetch } = useQuery({
    queryKey: ['studentsWithAssessmentsDropdown', teacherUsername, weekStart.toISOString()],
    queryFn: async () => {
      try {
        console.log('Fetching students with assessments for week:', weekStart.toISOString(), 'to', weekEnd.toISOString());
        console.log('Teacher username:', teacherUsername);

        // First approach: Use the RPC function
        const { data: studentData, error: studentError } = await supabase.rpc(
          'get_students_with_assessments_for_dropdown',
          { p_teacher_username: teacherUsername }
        );

        if (studentError) {
          console.error('Error using RPC function for teacher', teacherUsername, ':', studentError);
          
          // Fallback approach: Direct query
          const { data: quizData, error: quizError } = await supabase
            .from('quiz_attempts')
            .select('student_id, completed_at')
            .eq('teacher_username', teacherUsername)
            .gte('completed_at', weekStart.toISOString())
            .lte('completed_at', weekEnd.toISOString());
          
          if (quizError) throw quizError;
          
          // If no quiz attempts found, return empty array
          if (!quizData || quizData.length === 0) {
            console.log('No quiz attempts found for teacher', teacherUsername, 'this week');
            return [];
          }
          
          // Get unique student IDs
          const studentIds = [...new Set(quizData.map(qa => qa.student_id))];
          console.log('Found student IDs for teacher', teacherUsername, ':', studentIds);
          
          // Get student details for these IDs
          const { data: studentData2, error: studentError2 } = await supabase
            .from('students')
            .select('id, grade_level, subject')
            .eq('teacher_username', teacherUsername)
            .in('id', studentIds);
            
          if (studentError2) throw studentError2;
          return (studentData2 || []).map(student => ({
            id: student.id,
            gradeLevel: student.grade_level,
            subject: student.subject || 'Mathematics',
            teacherUsername
          }));
        }
        
        console.log('Found students for teacher', teacherUsername, ':', studentData?.length || 0);
        
        // Map student data to the expected format
        return (studentData || []).map(student => ({
          id: student.id,
          gradeLevel: student.grade_level,
          subject: student.subject || 'Mathematics',
          teacherUsername
        }));
      } catch (error) {
        console.error('Error fetching students with assessments:', error);
        throw error;
      }
    },
    enabled: !!teacherUsername,
    staleTime: 30000 // 30 seconds
  });

  const selectedStudentId = watch('selectedStudent');
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return assessedStudents.find(s => s.id === Number(selectedStudentId));
  }, [selectedStudentId, assessedStudents]);

  const onSubmitForm = (data: FormData) => {
    if (!selectedStudent) return;
    
    if (!data.selectedStudent) {
      return;
    }

    onSubmit({
      id: Number(data.selectedStudent),
      gradeLevel: selectedStudent?.gradeLevel || '6',
      subject: selectedStudent?.subject || 'Mathematics',
      teacherUsername: teacherUsername
    });
  };


  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Users className="w-6 h-6 text-svef-purple" />
        <h2 className="font-oswald text-2xl font-medium text-svef-gray">Student Information</h2>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="selectedStudent" className="block font-open-sans text-sm font-medium text-svef-gray mb-1">
            Select Student
          </label>
          <select
            {...register('selectedStudent', {
              required: 'Please select a student'
            })}
            className={cn(
              "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-green focus:border-svef-green",
              errors.selectedStudent ? "border-red-300" : "border-gray-300"
            )}
          >
            <option value="" disabled>Select a student...</option>
            {assessedStudents.map(student => (
              <option 
                key={`student-${student.id}`}
                value={String(student.id)}
              >
                {student.firstName ? `${student.firstName} ${student.lastInitial ? student.lastInitial.toUpperCase() + '.' : ''}${student.emoji ? ' ' + student.emoji : ''}`.trim() : `Student #${student.id}`} - Grade {student.gradeLevel}
              </option>
            ))}
          </select>
          {assessedStudents.length > 0 && (
            <p className="text-xs text-green-600 mt-1">Found {assessedStudents.length} students with assessments this week</p>
          )}
          {errors.selectedStudent && (
            <div className="mt-1 flex items-center text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>{errors.selectedStudent.message}</span>
            </div>
          )}
          {studentsError && (
            <p className="text-sm text-red-600 mt-1">Error loading students: {studentsError instanceof Error ? studentsError.message : 'Unknown error'}</p>
          )}
          {isLoadingStudents && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-svef-purple"></div>
              <span className="ml-2 text-sm text-svef-gray">Loading students...</span>
            </div>
          )}
          {!isLoadingStudents && assessedStudents.length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              No students with assessments found this week. Students will appear here after they complete assessments.
            </p>
          )}
        </div>

        {selectedStudent && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-svef-gray mb-2">Selected Student Details</h3>
            <div className="space-y-1 text-sm text-svef-gray">
              <p>Student Number: {selectedStudent.id}</p>
              <p>Grade Level: {selectedStudent.gradeLevel}</p>
              <p>Subject: Mathematics</p>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm",
          "font-open-sans text-sm font-medium text-white",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-green",
          isSubmitting
            ? "bg-svef-green/70 cursor-not-allowed"
            : "bg-svef-green hover:bg-svef-green/90"
        )}
      >
        {isSubmitting ? 'Processing...' : 'Continue'}
      </button>
    </form>
  );
}
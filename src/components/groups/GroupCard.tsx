import React, { useState, useEffect } from 'react';
import { BookOpen, Users, X, Loader2, ArrowRight } from 'lucide-react';
import { Student, WeeklyGroup } from '../../types';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase/config';

interface GroupCardProps {
  group: WeeklyGroup;
  students: Student[];
  allGroups: WeeklyGroup[];
  onGeneratePlan: (group: WeeklyGroup) => void;
  onMoveStudent?: (studentId: number, fromGroupId: string, toGroupId: string) => void;
  groupIndex: number;
  teacherUsername?: string;
  isGenerating?: boolean;
  isReadOnly?: boolean;
}

interface Mentor {
  id: string;
  full_name: string;
  email: string;
}

export function GroupCard({ group, students, allGroups, onGeneratePlan, onMoveStudent, groupIndex, teacherUsername, isGenerating = false, isReadOnly = false }: GroupCardProps) {
  const [assignedMentors, setAssignedMentors] = useState<Mentor[]>([]);
  const [availableMentors, setAvailableMentors] = useState<Mentor[]>([]);
  const [showMentorSelect, setShowMentorSelect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mentorGroupId, setMentorGroupId] = useState<string | null>(null);
  const [movingStudentId, setMovingStudentId] = useState<number | null>(null);

  const getMentorGroupName = () => {
    const weekDate = group.weekStartDate ? new Date(group.weekStartDate) : new Date();
    return `Week ${weekDate.toISOString().slice(0, 10)} - Group ${groupIndex + 1}`;
  };

  useEffect(() => {
    if (teacherUsername) {
      loadMentors();
    }
  }, [teacherUsername, group.id, group.students.length]);

  const loadMentors = async () => {
    if (!teacherUsername) return;

    try {
      const { data: mentorGroup } = await supabase
        .from('mentor_groups')
        .select('id')
        .eq('teacher_username', teacherUsername)
        .eq('name', getMentorGroupName())
        .maybeSingle();

      const resolvedGroupId = mentorGroup?.id || null;
      setMentorGroupId(resolvedGroupId);

      if (resolvedGroupId) {
        // Sync mentor_group_students with current weekly group students
        const { data: existingStudents } = await supabase
          .from('mentor_group_students')
          .select('student_id')
          .eq('group_id', resolvedGroupId);

        const existingIds = new Set((existingStudents || []).map(s => s.student_id));
        const currentIds = new Set(group.students);

        const toAdd = group.students.filter(id => !existingIds.has(id));
        const toRemove = [...existingIds].filter(id => !currentIds.has(id));

        if (toAdd.length > 0) {
          await supabase
            .from('mentor_group_students')
            .insert(toAdd.map(sid => ({ group_id: resolvedGroupId, student_id: sid })));
        }
        if (toRemove.length > 0) {
          await supabase
            .from('mentor_group_students')
            .delete()
            .eq('group_id', resolvedGroupId)
            .in('student_id', toRemove);
        }

        const { data: assignments, error: assignError } = await supabase
          .from('mentor_group_assignments')
          .select(`
            mentor_id,
            college_mentors (
              id,
              full_name,
              email
            )
          `)
          .eq('group_id', resolvedGroupId);

        if (!assignError && assignments) {
          const mentors = assignments
            .map(a => a.college_mentors)
            .filter(Boolean) as unknown as Mentor[];
          setAssignedMentors(mentors);
        }
      } else {
        setAssignedMentors([]);
      }

      const { data: teacherMentors, error: mentorError } = await supabase
        .from('mentor_teacher_assignments')
        .select(`
          mentor_id,
          college_mentors (
            id,
            full_name,
            email
          )
        `)
        .eq('teacher_username', teacherUsername)
        .eq('status', 'active');

      if (!mentorError && teacherMentors) {
        const mentors = teacherMentors
          .map(tm => tm.college_mentors)
          .filter(Boolean) as unknown as Mentor[];
        setAvailableMentors(mentors);
      }
    } catch (error) {
      console.error('Error loading mentors:', error);
    }
  };

  const getOrCreateMentorGroup = async (): Promise<string> => {
    if (mentorGroupId) {
      // Sync mentor_group_students with current weekly group students
      const { data: existingStudents } = await supabase
        .from('mentor_group_students')
        .select('student_id')
        .eq('group_id', mentorGroupId);

      const existingIds = new Set((existingStudents || []).map(s => s.student_id));
      const currentIds = new Set(group.students);

      // Add students that are in weekly group but not in mentor group
      const toAdd = group.students.filter(id => !existingIds.has(id));
      if (toAdd.length > 0) {
        await supabase
          .from('mentor_group_students')
          .insert(toAdd.map(studentId => ({ group_id: mentorGroupId, student_id: studentId })));
      }

      // Remove students that are in mentor group but not in weekly group
      const toRemove = [...existingIds].filter(id => !currentIds.has(id));
      if (toRemove.length > 0) {
        await supabase
          .from('mentor_group_students')
          .delete()
          .eq('group_id', mentorGroupId)
          .in('student_id', toRemove);
      }

      return mentorGroupId;
    }

    const { data: newGroup, error: groupError } = await supabase
      .from('mentor_groups')
      .insert({
        name: getMentorGroupName(),
        teacher_username: teacherUsername,
        description: `Focus areas: ${group.focusAreas.join(', ')}`,
        status: 'active'
      })
      .select('id')
      .single();

    if (groupError) throw groupError;

    if (group.students.length > 0) {
      await supabase
        .from('mentor_group_students')
        .insert(
          group.students.map(studentId => ({
            group_id: newGroup.id,
            student_id: studentId
          }))
        );
    }

    setMentorGroupId(newGroup.id);
    return newGroup.id;
  };

  const handleAssignMentor = async (mentorId: string) => {
    setIsLoading(true);
    try {
      const resolvedGroupId = await getOrCreateMentorGroup();

      const { error: assignError } = await supabase
        .from('mentor_group_assignments')
        .insert({
          mentor_id: mentorId,
          group_id: resolvedGroupId,
          assigned_by: teacherUsername
        });

      if (assignError) {
        if (assignError.code === '23505') {
          alert('This mentor is already assigned to this group');
        } else {
          throw assignError;
        }
      } else {
        await loadMentors();
        setShowMentorSelect(false);
      }
    } catch (error) {
      console.error('Error assigning mentor:', error);
      alert('Failed to assign mentor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMentor = async (mentorId: string) => {
    if (!confirm('Remove this mentor from the group?')) return;
    if (!mentorGroupId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('mentor_group_assignments')
        .delete()
        .eq('mentor_id', mentorId)
        .eq('group_id', mentorGroupId);

      if (error) throw error;
      await loadMentors();
    } catch (error) {
      console.error('Error removing mentor:', error);
      alert('Failed to remove mentor');
    } finally {
      setIsLoading(false);
    }
  };

  const otherGroups = allGroups.filter(g => g.id !== group.id);

  const handleMoveStudent = (studentId: number, toGroupId: string) => {
    setMovingStudentId(null);
    if (onMoveStudent) {
      onMoveStudent(studentId, group.id, toGroupId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-svef-beige/30 p-4">
        {assignedMentors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {assignedMentors.map(m => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                <Users className="w-3 h-3" />
                CM: {m.full_name}
              </span>
            ))}
          </div>
        )}
        <h3 className="font-medium text-svef-gray mb-2">Focus Areas:</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {group.focusAreas.map((area, index) => (
            <span
              key={`group-${group.id}-${groupIndex}-area-${index}`}
              className="px-2 py-1 bg-white rounded-md text-xs text-svef-gray"
            >
              {area}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h4 className="text-sm font-medium text-svef-gray mb-2">Students:</h4>
        <ul className="space-y-2 mb-4">
          {group.students.map((studentId, studentIndex) => {
            const student = students.find(s => s.id === studentId);
            if (!student) return null;
            const studentLabel = student.firstName
              ? `${student.firstName} ${student.lastInitial ? student.lastInitial.toUpperCase() + '.' : ''}${student.emoji ? ' ' + student.emoji : ''}`.trim()
              : `Student #${studentId}`;
            return (
              <li
                key={`group-${group.id}-${groupIndex}-student-${studentId}-${studentIndex}`}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-svef-purple" />
                  <span className="text-sm text-svef-gray">
                    {studentLabel} (Grade {student.gradeLevel})
                  </span>
                </div>
                {!isReadOnly && onMoveStudent && otherGroups.length > 0 && (
                  <div className="relative">
                    {movingStudentId === studentId ? (
                      <div className="absolute right-0 top-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[180px]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-600">Move to:</span>
                          <button onClick={() => setMovingStudentId(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1 max-h-[120px] overflow-y-auto">
                          {otherGroups.map((g, idx) => (
                            <button
                              key={g.id}
                              onClick={() => handleMoveStudent(studentId, g.id)}
                              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-teal-50 text-gray-700 hover:text-teal-700 transition-colors"
                            >
                              Group {allGroups.indexOf(g) + 1}: {g.focusAreas.slice(0, 2).join(', ')}{g.focusAreas.length > 2 ? '...' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMovingStudentId(studentId)}
                        className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                        title="Move to another group"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {teacherUsername && assignedMentors.length > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <h4 className="text-sm font-medium text-svef-gray mb-2">Assigned Mentors:</h4>
            <div className="space-y-2">
              {assignedMentors.map(mentor => (
                <div key={mentor.id} className="flex items-center justify-between text-sm bg-svef-beige/20 p-2 rounded">
                  <span className="text-svef-gray">{mentor.full_name}</span>
                  <button
                    onClick={() => handleRemoveMentor(mentor.id)}
                    className="text-red-600 hover:text-red-800"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {teacherUsername && availableMentors.length > 0 && (
          <div className="mb-4">
            {!showMentorSelect ? (
              <Button
                onClick={() => setShowMentorSelect(true)}
                className="w-full mb-2"
                variant="secondary"
                disabled={isLoading}
              >
                <Users className="w-4 h-4 mr-2" />
                Assign Mentor
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-svef-gray">Select Mentor:</span>
                  <button
                    onClick={() => setShowMentorSelect(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {availableMentors.map(mentor => {
                  const isAssigned = assignedMentors.some(m => m.id === mentor.id);
                  return (
                    <button
                      key={mentor.id}
                      onClick={() => handleAssignMentor(mentor.id)}
                      disabled={isAssigned || isLoading}
                      className={`w-full text-left p-2 rounded text-sm ${
                        isAssigned
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-svef-beige/20 text-svef-gray hover:bg-svef-beige/40'
                      }`}
                    >
                      {mentor.full_name}
                      {isAssigned && ' (Already assigned)'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <Button
            onClick={() => onGeneratePlan(group)}
            className="w-full"
            variant={group.lessonPlanId ? 'secondary' : 'primary'}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Lesson Plan...
              </>
            ) : (
              group.lessonPlanId ? 'View Lesson Plan' : 'Generate Lesson Plan'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { User, ChevronRight, GraduationCap } from 'lucide-react';
import { LessonPlan, ExitTicketResult } from '../types';
import { LessonPlanDetails } from './lesson-plan/LessonPlanDetails';
import { formatDate } from '../utils/dateUtils';
import { useStudentIdentifiers } from '../hooks/useStudentIdentifiers';

interface StudentGroup {
  studentId: number;
  studentGrade: string;
  lessons: {
    plan: LessonPlan;
    exitTicket: ExitTicketResult;
    uniqueId: string;
  }[];
}

interface Props {
  groups: StudentGroup[];
  onBack: () => void;
}

export function StudentLessonGroup({ groups, onBack }: Props) {
  const { getIdentifier } = useStudentIdentifiers(groups.map((g) => g.studentId));
  const [selectedLesson, setSelectedLesson] = useState<{
    plan: LessonPlan;
    exitTicket: ExitTicketResult;
    studentId: number;
    studentGrade: string;
  } | null>(null);

  if (selectedLesson) {
    return (
      <LessonPlanDetails
        {...selectedLesson}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={`student-group-${group.studentId}`} className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-svef-beige/30 p-4">
            <div className="flex items-center space-x-3">
              <User className="w-6 h-6 text-svef-purple" />
              <div>
                <h3 className="font-oswald text-xl font-medium text-svef-gray">
                  {getIdentifier(group.studentId)}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-svef-gray">
                  <GraduationCap className="w-4 h-4" />
                  <span>Grade {group.studentGrade}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {group.lessons.map((lesson) => (
              <button
                key={lesson.uniqueId}
                onClick={() => setSelectedLesson({
                  plan: lesson.plan,
                  exitTicket: lesson.exitTicket,
                  studentId: group.studentId,
                  studentGrade: group.studentGrade
                })}
                className="w-full p-4 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-svef-gray mb-1">
                      {lesson.exitTicket.lastLesson}
                    </h4>
                    <p className="text-sm text-svef-gray mb-2">
                      {formatDate(lesson.exitTicket.timestamp)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lesson.exitTicket.struggledAreas.map((area, i) => (
                        <span
                          key={`${lesson.uniqueId}-area-${i}`}
                          className="px-2 py-1 bg-svef-beige/30 rounded-md text-xs text-svef-gray"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-svef-gray mt-2">
                      Score: {lesson.exitTicket.score}/{lesson.exitTicket.totalQuestions}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-svef-purple flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
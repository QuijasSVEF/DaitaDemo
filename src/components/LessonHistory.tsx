import React from 'react';
import { Book, ArrowLeft } from 'lucide-react';
import { LessonPlan, ExitTicketResult } from '../types';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { useStudentIdentifiers } from '../hooks/useStudentIdentifiers';

interface LessonHistoryItem {
  plan: LessonPlan;
  exitTicket: ExitTicketResult;
  studentId: number;
  studentGrade: string;
  uniqueId: string;
}

interface Props {
  lessonPlans: LessonHistoryItem[];
  onBack: () => void;
}

export function LessonHistory({ lessonPlans, onBack }: Props) {
  const navigate = useNavigate();
  const { getIdentifier } = useStudentIdentifiers(lessonPlans.map((p) => p.studentId));

  // Create a map of unique assessments using a more specific key
  const uniqueAssessments = new Map<string, LessonHistoryItem>();
  
  // Process lesson plans to keep only unique assessments
  lessonPlans.forEach(plan => {
    // Create a unique key combining student ID, lesson name, and timestamp
    const key = `${plan.studentId}-${plan.exitTicket.lastLesson}-${plan.exitTicket.timestamp.getTime()}`;
    
    // Check if we already have this exact assessment
    if (!uniqueAssessments.has(key)) {
      uniqueAssessments.set(key, plan);
    }
  });

  // Sort unique plans by timestamp in descending order
  const sortedPlans = Array.from(uniqueAssessments.values())
    .sort((a, b) => b.exitTicket.timestamp.getTime() - a.exitTicket.timestamp.getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Book className="w-6 h-6 text-svef-purple" />
          <h2 className="font-oswald text-2xl font-medium text-svef-gray">Previous Lesson Plans</h2>
        </div>
        <Button variant="secondary" onClick={onBack} className="flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>

      {sortedPlans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-svef-gray text-lg">No lesson plans found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedPlans.map((item) => (
            <div 
              key={`${item.studentId}-${item.exitTicket.lastLesson}-${item.exitTicket.timestamp.getTime()}-${item.uniqueId}`}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
            >
              <div className="bg-svef-beige/30 p-4">
                <h3 className="font-medium text-svef-gray text-lg mb-2">
                  {item.exitTicket.lastLesson}
                </h3>
                <div className="flex items-center space-x-3 text-sm text-svef-gray">
                  <span>{getIdentifier(item.studentId)}</span>
                  <span>Grade {item.studentGrade}</span>
                  <span>{item.exitTicket.timestamp.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-svef-gray mb-2">Assessment Results</h4>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                    <span className="text-svef-gray">
                      Score: {item.exitTicket.score}/{item.exitTicket.totalQuestions}
                    </span>
                    <span className="text-svef-purple">
                      {Math.round((item.exitTicket.score / item.exitTicket.totalQuestions) * 100)}%
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-svef-gray mb-2">Areas of Focus</h4>
                  <div className="flex flex-wrap gap-2">
                    {item.exitTicket.struggledAreas.map((area, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-svef-beige/30 rounded-md text-xs text-svef-gray"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button
                    onClick={() => {
                      navigate(`/lesson-plan/${item.uniqueId}`, {
                        state: {
                          lessonPlan: item.plan,
                          exitTicket: item.exitTicket,
                          studentId: item.studentId,
                          studentGrade: item.studentGrade,
                          lessonPlanId: item.uniqueId
                        }
                      });
                    }}
                    className="w-full"
                  >
                    View Lesson Plan
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
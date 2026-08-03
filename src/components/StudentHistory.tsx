import React from 'react';
import { History, Clock, Loader2, AlertCircle } from 'lucide-react';
import { ExitTicketResult, Student } from '../types';
import { formatDate } from '../utils/dateUtils';
import { cn } from '../utils/cn';

interface Props {
  student: Student;
  exitTickets: ExitTicketResult[];
  onViewLessonPlan: (exitTicket: ExitTicketResult) => void;
  isLoading: boolean;
  error?: string | null;
}

export function StudentHistory({ student, exitTickets, onViewLessonPlan, isLoading, error }: Props) {
  const studentTickets = exitTickets
    .filter(ticket => ticket.studentId === student.id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-6">
        <History className="w-6 h-6 text-svef-purple" />
        <h3 className="font-oswald text-xl font-medium text-svef-gray">Assessment History</h3>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-svef-purple animate-spin" />
        </div>
      )}

      {studentTickets.length === 0 ? (
        <p className="text-svef-gray text-sm">No previous assessments found.</p>
      ) : (
        <div className="space-y-4">
          {studentTickets.map((ticket) => (
            <button
              key={`${ticket.studentId}-${ticket.timestamp.getTime()}`}
              className={cn(
                "w-full border border-gray-200 rounded-md p-4 text-left transition-colors duration-200",
                !isLoading && "hover:bg-gray-50 cursor-pointer",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => onViewLessonPlan(ticket)}
              disabled={isLoading}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-svef-gray">{ticket.lastLesson}</h4>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDate(ticket.timestamp)}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-svef-gray">
                  Score: {ticket.score}/{ticket.totalQuestions}
                </span>
                <span className={cn(
                  "flex items-center",
                  !isLoading && "text-svef-purple hover:text-svef-purple/80",
                  isLoading && "text-svef-purple/50"
                )}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'View Lesson Plan →'
                  )}
                </span>
              </div>
              {ticket.struggledAreas.length > 0 && (
                <div className="mt-4 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-red-800 mb-2">Areas of Struggle:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {ticket.struggledAreas.map((area, i) => (
                          <li key={i} className="text-sm text-red-700">{area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
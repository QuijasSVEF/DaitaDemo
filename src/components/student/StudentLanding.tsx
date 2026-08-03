import React from 'react';
import { ClipboardList, BookOpen, History, LogOut } from 'lucide-react';
import { Logo } from '../Logo';
import { formatStudentIdentifier, StudentIdentity } from '../../utils/studentIdentifier';

interface Props {
  studentId: number;
  student?: StudentIdentity & { emojiPassword?: string };
  onAssessment: () => void;
  onLogSession: () => void;
  onViewLogs: () => void;
  onLogout: () => void;
}

export function StudentLanding({
  studentId,
  student,
  onAssessment,
  onLogSession,
  onViewLogs,
  onLogout,
}: Props) {
  const identifier = student
    ? formatStudentIdentifier({ ...student, emoji: student.emojiPassword || student.emoji })
    : `Student #${studentId}`;
  return (
    <div className="min-h-screen flex items-center justify-center bg-svef-beige/30 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-oswald text-2xl font-medium text-svef-gray">
              Welcome, {identifier}
            </h1>
            <p className="font-open-sans text-sm text-svef-brown mt-1">
              What would you like to do today?
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={onAssessment}
              className="w-full flex items-center gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Take Assessment</p>
                <p className="text-sm text-gray-600">
                  Complete your math assessment
                </p>
              </div>
            </button>

            <button
              onClick={onLogSession}
              className="w-full flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 hover:border-green-300 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Log My Session</p>
                <p className="text-sm text-gray-600">
                  Record what you worked on today
                </p>
              </div>
            </button>

            <button
              onClick={onViewLogs}
              className="w-full flex items-center gap-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl hover:bg-amber-100 hover:border-amber-300 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">View Session Logs</p>
                <p className="text-sm text-gray-600">
                  See your past session history
                </p>
              </div>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Return to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

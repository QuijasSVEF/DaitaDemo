import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { Logo } from '../Logo';
import { QuizComponent } from './quiz/QuizComponent';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveQuiz } from '../../services/supabase/quizzes';
import { useSpeech } from '../../hooks/useSpeech';
import { supabase } from '../../services/supabase/config';

import { formatStudentIdentifier, StudentIdentity } from '../../utils/studentIdentifier';

interface Props {
  studentId: number;
  teacherUsername: string;
  student?: StudentIdentity & { emojiPassword?: string };
  onBack: () => void;
  onAssessmentComplete?: () => void;
  onLogout?: () => void;
}

export function StudentAssessment({ studentId, teacherUsername, student, onBack, onAssessmentComplete, onLogout }: Props) {
  const identifier = student
    ? formatStudentIdentifier({ ...student, emoji: student.emojiPassword || student.emoji })
    : `Student #${studentId}`;
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { speak, stop, speaking } = useSpeech();
  const [studentGradeLevel, setStudentGradeLevel] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch student grade level
  const { data: studentData } = useQuery({
    queryKey: ['studentData', studentId, teacherUsername],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('grade_level')
          .eq('id', studentId)
          .eq('teacher_username', teacherUsername)
        .maybeSingle();
          
        if (!error && data) {
          setStudentGradeLevel(data.grade_level);
          return data;
        }
        return null;
      } catch (err) {
        console.error('Error fetching student data:', err);
        return null;
      }
    },
    enabled: !!studentId && !!teacherUsername
  });

  // Fetch active quiz for this teacher
  const { data: quiz, isLoading, error: quizError } = useQuery({
    queryKey: ['activeQuiz', teacherUsername, studentId],
    queryFn: async () => {
      try {
        console.log(`Fetching active quiz for teacher ${teacherUsername}`);
        const result = await getActiveQuiz(teacherUsername);
        console.log('Active quiz result:', result);
        return result;
      } catch (err) {
        console.error('Error fetching active quiz:', err);
        throw err;
      }
    },
    onError: (err) => {
      console.error('Error fetching active quiz:', err);
      setError('Failed to load assessment. Please try again or contact your teacher.');
    },
    enabled: !!teacherUsername
  });
  
  const handleReadInstructions = () => {
    const instructions = "Welcome to your math assessment. Read each question carefully and select the best answer. You can use the speaker buttons to have questions and answers read aloud to you.";
    speak(instructions);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-8">
            <Logo />
          </div>
          <h2 className="font-oswald text-2xl font-medium text-svef-gray mb-4">
            Assessment Submitted!
          </h2>
          <p className="text-svef-gray mb-8">
            Your assessment has been recorded and sent to your teacher.
          </p>
          <button
            onClick={onLogout || onBack}
            className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-white bg-svef-gray hover:bg-svef-gray/90 font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-svef-beige/30">
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <button
            onClick={() => {
              stop();
              onBack();
            }}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-svef-gray" />
          </button>
          <Logo />
          <div className="ml-4">
            <h1 className="font-oswald text-xl font-medium text-svef-gray">
              Math Assessment
              {quiz?.gradeLevel && (
                <span className="ml-2 text-sm text-svef-purple">
                  Grade {quiz.gradeLevel}
                </span>
              )}
              <button
                onClick={handleReadInstructions}
                className="ml-2 p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
                aria-label="Read instructions aloud"
              >
                {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </h1>
            <p className="text-sm text-svef-gray">
              {identifier}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-svef-purple mx-auto"></div>
            <p className="mt-4 text-svef-gray">Loading assessment...</p>
          </div>
        ) : quizError || error ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Assessment</h3>
            <p className="text-svef-gray mb-4">
              {error || "Failed to load assessment. Please try again."}
              <button
                onClick={() => speak(error || "Failed to load assessment. Please try again.")}
                className="ml-2 p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
                aria-label="Read error message aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </p>
            <button
              onClick={() => {
                stop();
                onBack();
              }}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-svef-purple hover:bg-svef-purple/90"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Login
            </button>
          </div>
        ) : !quiz ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Assessment</h3>
            <p className="text-svef-gray mb-4">
              There is no active assessment available right now. Please check back later or contact your teacher.
              <button
                onClick={() => speak("There is no active assessment available right now. Please check back later or contact your teacher.")}
                className="ml-2 p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
                aria-label="Read message aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </p>
            <button
              onClick={() => {
                stop();
                onBack();
              }}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-svef-purple hover:bg-svef-purple/90"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Login
            </button>
          </div>
        ) : (
          <QuizComponent
            studentId={studentId}
            teacherUsername={teacherUsername}
            onComplete={() => setIsComplete(true)}
          />
        )}
      </div>
    </div>
  );
}
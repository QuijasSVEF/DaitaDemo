import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveQuiz, getQuizQuestions } from '../../../services/supabase/quizzes';
import { QuizTemplate, QuizQuestion } from '../../../types/quiz';
import { Button } from '../../ui/Button';
import { CheckCircle, AlertCircle, ArrowRight, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabase/config';
import { useSpeech } from '../../../hooks/useSpeech';
import { renderMathContent, detectTablePattern, inferTableFromContext, detectMultiTablePattern, detectDataVisualizationPattern } from '../../../utils/mathUtils.tsx';
import { automatedWorkflow } from '../../../services/assessment/automatedWorkflow';
import { MathVisual } from '../../quiz/MathVisual';

interface Props {
  studentId: number;
  teacherUsername: string;
  onComplete: () => void;
}

export function QuizComponent({ studentId, teacherUsername, onComplete }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [readingOption, setReadingOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoReadEnabled, setAutoReadEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const { speak, stop, speaking } = useSpeech();
  const answersInitialized = useRef(false);
  const quizStartTime = useRef<string>(new Date().toISOString());

  // Fetch the active quiz - no background refetch during assessment
  const { data: quiz, isLoading: quizLoading, error: quizError } = useQuery({
    queryKey: ['activeQuiz', teacherUsername],
    queryFn: () => getActiveQuiz(teacherUsername),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity
  });

  // Fetch quiz questions when we have a quiz - no background refetch during assessment
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['quizQuestions', quiz?.id],
    queryFn: () => quiz ? getQuizQuestions(quiz.id) : Promise.resolve([]),
    enabled: !!quiz?.id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity
  });

  // Initialize selected answers array - only once when questions first load
  useEffect(() => {
    if (questions.length > 0 && !answersInitialized.current) {
      answersInitialized.current = true;
      console.log(`Initializing ${questions.length} answer slots for student ${studentId}`);
      setSelectedAnswers(new Array(questions.length).fill(''));
      setIsLoading(false);
    }
  }, [questions]);

  // Auto-read question when changing to a new question
  useEffect(() => {
    if (autoReadEnabled && currentQ) {
      const timer = setTimeout(() => {
        readQuestion();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, autoReadEnabled]);

  // Function to read question text aloud
  const readQuestion = () => {
    if (!currentQ) return;
    const questionText = currentQ.questionText;
    speak(questionText);
  };

  // Function to read an answer option aloud
  const readOption = (option: string, index: number) => {
    const letter = String.fromCharCode(65 + index);
    const optionText = `Option ${letter}. ${option}`;
    speak(optionText);
    setReadingOption(option);
  };

  // Function to toggle auto-read feature
  const toggleAutoRead = () => {
    setAutoReadEnabled(!autoReadEnabled);
    stop(); // Stop any current speech
  };

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    stop(); // Stop any current speech
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      stop(); // Stop any current speech
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    const unansweredCount = selectedAnswers.filter(a => !a).length;
    if (unansweredCount > 0 && !showUnansweredWarning) {
      setShowUnansweredWarning(true);
      return;
    }
    setShowUnansweredWarning(false);

    try {
      setIsSubmitting(true);
      setError(null);
      console.log(`Submitting quiz for student ${studentId} and teacher ${teacherUsername}`);
      
      // Prepare answers format
      const answers = questions.map((question, index) => ({
        questionId: question.id,
        questionText: question.questionText,
        questionSubtopic: question.subtopic || quiz?.topic || 'General',
        answer: selectedAnswers[index] || '',
        correct: selectedAnswers[index] === question.correctAnswer,
        correctAnswer: question.correctAnswer,
        visual: question.visual || undefined,
        explanation: question.explanation || ''
      }));
      
      // Calculate score
      const score = answers.filter(a => a.correct).length;
      
      console.log(`Score: ${score}/${questions.length}`);
      
      // Trigger automated workflow for assessment completion
      await automatedWorkflow.processAssessmentCompletion({
        studentId,
        teacherUsername,
        templateId: quiz?.id || '',
        score,
        totalQuestions: questions.length,
        answers,
        gradeLevel: quiz?.gradeLevel,
        startTime: quizStartTime.current
      });
      
      console.log('✅ Automated assessment workflow completed successfully');
      
      onComplete();
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (quizLoading || questionsLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading quiz...</p>
      </div>
    );
  }

  if (quizError) {
    console.error('Quiz error:', quizError);
    return (
      <div className="text-center py-10 px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Quiz</h3>
        <p className="text-gray-600">There was a problem loading the assessment. Please try again later.</p>
      </div>
    );
  }

  if (!quiz) {
    console.log('No active quiz found for teacher', teacherUsername);
    return (
      <div className="text-center py-10 px-4">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Quiz</h3>
        <p className="text-gray-600">There is no active assessment available at this time. Please check back later.</p>
      </div>
    );
  }

  if (questions.length === 0) {
    console.log('No questions found for quiz', quiz.id);
    return (
      <div className="text-center py-10 px-4">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Available</h3>
        <p className="text-gray-600">This assessment doesn't have any questions yet.</p>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin mb-4" />
        <p className="text-gray-600">Loading questions...</p>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-gray-900 mb-2">{quiz.title}</h2>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <p className="text-sm text-gray-600">
              {quiz.topic} • Grade {quiz.gradeLevel}
              {studentId && <span className="ml-2">• Student #{studentId}</span>}
            </p>
            <button
              onClick={toggleAutoRead}
              className={`ml-2 p-1 rounded-full ${autoReadEnabled ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}
              aria-label={autoReadEnabled ? "Disable auto-read" : "Enable auto-read"}
              title={autoReadEnabled ? "Disable auto-read" : "Enable auto-read"}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-medium">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div 
            className="bg-blue-500 h-2 rounded-full" 
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <div className="flex items-center justify-between">
            <span>{renderMathContent(currentQ.questionText)}</span>
            <button
              onClick={readQuestion}
              className="p-2 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
              aria-label="Read question aloud"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </h3>

        {/* Render visual (table, number line, or coordinate plot) if present */}
        {currentQ.visual ? (
          <div className="mb-4">
            <MathVisual visual={currentQ.visual} />
          </div>
        ) : detectTablePattern(currentQ.questionText) ? (
          <div className="mb-4">
            <MathVisual visual={detectTablePattern(currentQ.questionText)!} />
          </div>
        ) : inferTableFromContext(currentQ.questionText, currentQ.explanation || '') ? (
          <div className="mb-4">
            <MathVisual visual={inferTableFromContext(currentQ.questionText, currentQ.explanation || '')!} />
          </div>
        ) : detectMultiTablePattern(currentQ.questionText, currentQ.explanation || '', currentQ.options) ? (
          <div className="mb-4">
            <MathVisual visual={detectMultiTablePattern(currentQ.questionText, currentQ.explanation || '', currentQ.options)!} />
          </div>
        ) : detectDataVisualizationPattern(currentQ.questionText, currentQ.explanation || '', currentQ.options) ? (
          <div className="mb-4">
            <MathVisual visual={detectDataVisualizationPattern(currentQ.questionText, currentQ.explanation || '', currentQ.options)!} />
          </div>
        ) : null}
        
        <div className="space-y-3">
          {currentQ.options.map((option, index) => (
            <div key={index} className="relative">
              <button
                onClick={() => handleAnswerSelect(option)}
                className={`w-full text-left p-4 pr-12 rounded-lg border ${
                  selectedAnswers[currentQuestion] === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{renderMathContent(option)}</span>
                </div>
              </button>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    readOption(option, index);
                  }}
                  className={`p-2 rounded-full ${speaking && readingOption === option ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                  aria-label={`Read option ${String.fromCharCode(65 + index)} aloud`}
                >
                  {speaking && readingOption === option ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showUnansweredWarning && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
            <p className="text-sm">
              You have {selectedAnswers.filter(a => !a).length} unanswered question(s). Submit anyway?
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setShowUnansweredWarning(false)}
              className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              Go Back
            </button>
            <button
              onClick={handleSubmit}
              className="text-sm px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Submit Anyway
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={handlePreviousQuestion}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        {currentQuestion < questions.length - 1 ? (
          <Button
            onClick={handleNextQuestion}
            disabled={!selectedAnswers[currentQuestion] || speaking}
            className="flex items-center"
          >
            Next <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || speaking}
            className="flex items-center"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            <CheckCircle className="ml-2 w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default QuizComponent;
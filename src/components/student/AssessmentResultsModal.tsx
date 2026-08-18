import React from 'react';
import { X, CheckCircle, XCircle, Clock, BarChart } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { renderMathContent, detectTablePattern, inferTableFromContext, detectMultiTablePattern, detectDataVisualizationPattern } from '../../utils/mathUtils.tsx';
import { MathVisual } from '../quiz/MathVisual';

interface AssessmentAttempt {
  id: string;
  score: number;
  total_questions: number;
  answers: any[];
  completed_at: string;
  duration?: number;
  quiz_templates: {
    title: string;
    topic: string;
    grade_level: string;
  };
}

interface Props {
  attempt: AssessmentAttempt | null;
  onClose: () => void;
}

export function AssessmentResultsModal({ attempt, onClose }: Props) {
  if (!attempt) return null;

  const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
  const correctAnswers = attempt.answers?.filter(a => a.correct) || [];
  const incorrectAnswers = attempt.answers?.filter(a => !a.correct) || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 bg-svef-beige/30 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-oswald text-2xl font-medium text-svef-gray">
                Assessment Results
              </h2>
              <p className="text-sm text-svef-gray mt-1">
                {attempt.quiz_templates.title} • {attempt.quiz_templates.topic}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-svef-gray" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Score Overview */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart className="w-6 h-6 text-svef-purple" />
                </div>
                <p className="text-3xl font-oswald text-svef-purple">
                  {attempt.score}/{attempt.total_questions}
                </p>
                <p className="text-sm text-svef-gray">Score</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    percentage >= 80 ? "bg-green-100" :
                    percentage >= 60 ? "bg-yellow-100" : "bg-red-100"
                  )}>
                    <span className={cn(
                      "text-sm font-medium",
                      percentage >= 80 ? "text-green-600" :
                      percentage >= 60 ? "text-yellow-600" : "text-red-600"
                    )}>
                      %
                    </span>
                  </div>
                </div>
                <p className="text-3xl font-oswald text-svef-purple">
                  {percentage}%
                </p>
                <p className="text-sm text-svef-gray">Percentage</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-3xl font-oswald text-green-600">
                  {correctAnswers.length}
                </p>
                <p className="text-sm text-svef-gray">Correct</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-3xl font-oswald text-red-600">
                  {incorrectAnswers.length}
                </p>
                <p className="text-sm text-svef-gray">Incorrect</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-svef-gray">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Completed: {new Date(attempt.completed_at).toLocaleString()}</span>
                </div>
                {attempt.duration && (
                  <span>Duration: {Math.round(attempt.duration / 60)} minutes</span>
                )}
              </div>
            </div>
          </div>

          {/* Question Details */}
          {attempt.answers && attempt.answers.length > 0 && (
            <div className="space-y-6">
              <h3 className="font-oswald text-xl font-medium text-svef-gray">
                Question Breakdown
              </h3>
              
              <div className="space-y-4">
                {attempt.answers.map((answer, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "border rounded-lg p-4",
                      answer.correct 
                        ? "border-green-200 bg-green-50" 
                        : "border-red-200 bg-red-50"
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {answer.correct ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-svef-gray">
                            Question {index + 1}
                          </h4>
                          {answer.questionSubtopic && (
                            <span className="px-2 py-1 bg-svef-beige/30 rounded-md text-xs text-svef-gray">
                              {answer.questionSubtopic}
                            </span>
                          )}
                        </div>
                        
                        {answer.questionText && (
                          <div className="text-sm text-svef-gray mb-3">
                            <p>{renderMathContent(answer.questionText)}</p>
                            {answer.visual ? (
                              <div className="mt-2">
                                <MathVisual visual={answer.visual} />
                              </div>
                            ) : detectTablePattern(answer.questionText) ? (
                              <div className="mt-2">
                                <MathVisual visual={detectTablePattern(answer.questionText)!} />
                              </div>
                            ) : inferTableFromContext(answer.questionText, answer.explanation || '') ? (
                              <div className="mt-2">
                                <MathVisual visual={inferTableFromContext(answer.questionText, answer.explanation || '')!} />
                              </div>
                            ) : detectMultiTablePattern(answer.questionText, answer.explanation || '', answer.options || []) ? (
                              <div className="mt-2">
                                <MathVisual visual={detectMultiTablePattern(answer.questionText, answer.explanation || '', answer.options || [])!} />
                              </div>
                            ) : detectDataVisualizationPattern(answer.questionText, answer.explanation || '', answer.options || []) ? (
                              <div className="mt-2">
                                <MathVisual visual={detectDataVisualizationPattern(answer.questionText, answer.explanation || '', answer.options || [])!} />
                              </div>
                            ) : null}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-svef-gray">Student Answer:</span>
                            <span className={cn(
                              "text-sm",
                              answer.correct ? "text-green-700" : "text-red-700"
                            )}>
                              {answer.answer}
                            </span>
                          </div>
                          
                          {!answer.correct && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium text-svef-gray">Correct Answer:</span>
                              <span className="text-sm text-green-700">
                                {answer.correctAnswer || answer.correct_answer || 'Not available'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
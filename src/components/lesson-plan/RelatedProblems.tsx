import React, { useState, useEffect } from 'react';
import { Calculator, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { createChatCompletion } from '../../services/openai/config';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';
import { renderMathContent, formatMathContent } from '../../utils/mathUtils.tsx';
import { MathVisual } from '../quiz/MathVisual';
import { QuestionVisual } from '../../types/quiz';

interface PracticeQuestion {
  id: string;
  questionText: string;
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  visual?: QuestionVisual;
}

interface Props {
  struggledAreas: string[];
  gradeLevel: string;
  studentId?: number;
  teacherUsername?: string;
}

const PRACTICE_QUESTIONS_PROMPT = (area: string, gradeLevel: string, assessmentContext?: any) => `
Generate 3 practice problems for students struggling with "${area}" at grade ${gradeLevel} level.

${assessmentContext ? `
CRITICAL: Base these practice problems EXACTLY on the student's recent assessment format:
- Assessment Topic: ${assessmentContext.topic}
- Question Types Used: ${assessmentContext.questionTypes?.join(', ')}
- Specific Subtopics Missed: ${assessmentContext.missedSubtopics?.join(', ')}
- Assessment Format: Multiple Choice Questions
- Sample Questions from Assessment: ${JSON.stringify(assessmentContext.sampleQuestions?.slice(0, 2))}

MANDATORY REQUIREMENTS:
1. Create practice problems that match the EXACT SAME FORMAT as the assessment
2. If the assessment had multiple choice questions, create multiple choice practice problems
3. If the assessment had calculation problems, create calculation problems
4. DO NOT create word problems unless the assessment specifically contained word problems
5. Use the same mathematical structure and question style as the sample questions
6. Focus on direct calculation and procedural practice, not story-based problems
` : ''}

VISUAL FORMATTING RULES:
When a problem involves data sets, value pairs, proportional relationships, direct/inverse variation, function tables, input/output patterns, or ordered pairs, include a "visual" field so the data is displayed as a structured table, number line, or coordinate plot rather than just listing numbers in the text.

Supported visual types:
- "table": { "headers": ["x", "y"], "rows": [["1", "5"], ["2", "10"]] }
- "number_line": { "min": 0, "max": 10, "points": [{"value": 3, "label": "A"}] }
- "coordinate_plot": { "points": [{"x": 1, "y": 2}], "xLabel": "x", "yLabel": "y" }

Return ONLY a valid JSON object with this exact format:
{
  "questions": [
    {
      "questionText": "Direct calculation question matching assessment format",
      "answer": "Correct answer",
      "explanation": "Step-by-step explanation",
      "difficulty": "easy|medium|hard",
      "options": ["option1", "option2", "option3", "option4"],
      "visual": { "type": "table", "data": { "headers": [...], "rows": [...] }, "caption": "..." }
    }
  ]
}

Note: Only include "visual" when the problem actually requires a table, number line, or coordinate plot. Omit it for simple computation problems.

Requirements:
1. Questions should be progressively difficult (easy, medium, hard)
2. Include step-by-step solutions
3. Use grade-appropriate language and concepts
4. Focus specifically on the struggle area: ${area}
5. ${assessmentContext ? 'EXACTLY match the question format from the assessment - if it was multiple choice, make multiple choice; if it was calculation, make calculation' : 'Create direct calculation problems'}
6. ${assessmentContext ? 'Use the SAME mathematical structure as the sample questions provided' : 'Focus on procedural practice'}
7. DO NOT create word problems or story problems unless the original assessment contained them
8. Focus on direct mathematical calculation and procedural fluency
9. When data should be presented in a table format (like the printed Elevate Math curriculum), ALWAYS use the "visual" field with type "table"
`;

export function RelatedProblems({ struggledAreas, gradeLevel, studentId, teacherUsername }: Props) {
  const [questions, setQuestions] = useState<Record<string, PracticeQuestion[]>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [assessmentContext, setAssessmentContext] = useState<any>(null);

  // Fetch student's latest assessment context
  useEffect(() => {
    const fetchAssessmentContext = async () => {
      if (!studentId || !teacherUsername) return;
      
      try {
        const { data: latestAttempt, error } = await supabase
          .from('quiz_attempts')
          .select(`
            answers,
            quiz_templates!inner (
              title,
              topic,
              subtopics,
              question_types,
              questions,
              processed_questions
            )
          `)
          .eq('student_id', studentId)
          .eq('teacher_username', teacherUsername)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !latestAttempt) return;

        // Extract missed subtopics from incorrect answers
        const missedSubtopics = latestAttempt.answers
          ?.filter((answer: any) => !answer.correct)
          ?.map((answer: any) => answer.questionSubtopic)
          ?.filter(Boolean) || [];

        // Get sample questions from the assessment
        const questions = latestAttempt.quiz_templates.processed_questions || latestAttempt.quiz_templates.questions || [];
        const sampleQuestions = questions.slice(0, 3).map((q: any) => ({
          questionText: q.questionText,
          options: q.options,
          type: q.type
        }));

        setAssessmentContext({
          topic: latestAttempt.quiz_templates.topic,
          questionTypes: latestAttempt.quiz_templates.question_types,
          missedSubtopics: [...new Set(missedSubtopics)],
          format: 'Multiple Choice',
          questions: questions,
          sampleQuestions: sampleQuestions
        });
      } catch (error) {
        console.error('Error fetching assessment context:', error);
      }
    };

    fetchAssessmentContext();
  }, [studentId, teacherUsername]);

  const generateQuestionsForArea = async (area: string) => {
    try {
      setIsLoading(prev => ({ ...prev, [area]: true }));
      setError(null);

      const response = await createChatCompletion(
        PRACTICE_QUESTIONS_PROMPT(area, gradeLevel, assessmentContext),
        0.7
      );

      if (!response) {
        throw new Error('No response from AI service');
      }

      // Clean the response
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanedResponse);
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format');
      }

      const formattedQuestions = parsed.questions.map((q: any, index: number) => ({
        id: `${area}-${index}`,
        questionText: formatMathContent(q.questionText || ''),
        answer: formatMathContent(q.answer || ''),
        explanation: formatMathContent(q.explanation || ''),
        difficulty: q.difficulty || (index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard'),
        options: q.options,
        visual: q.visual || undefined
      }));

      setQuestions(prev => ({
        ...prev,
        [area]: formattedQuestions
      }));
    } catch (error) {
      console.error('Error generating questions for area:', area, error);
      setError(`Failed to generate questions for ${area}`);
    } finally {
      setIsLoading(prev => ({ ...prev, [area]: false }));
    }
  };

  const regenerateQuestionsForArea = async (area: string) => {
    await generateQuestionsForArea(area);
  };

  useEffect(() => {
    // Generate questions for all struggle areas on mount
    if (struggledAreas.length > 0) {
      struggledAreas.forEach(area => {
        generateQuestionsForArea(area);
      });
    }
  }, [struggledAreas.join(',')]); // Use join to prevent array reference changes

  const toggleAnswer = (questionId: string) => {
    setExpandedAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (struggledAreas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Struggle Areas Identified</h3>
        <p className="text-gray-600">
          Practice problems will appear here when struggle areas are identified from assessments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Calculator className="w-6 h-6 text-svef-purple" />
          <h3 className="font-oswald text-xl font-medium text-svef-gray">
            Practice Problems
          </h3>
        </div>
        <p className="text-sm text-svef-gray mb-6">
          Targeted practice questions for each identified struggle area. Questions progress from easy to hard difficulty.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {struggledAreas.map((area, areaIndex) => (
            <div key={`area-${areaIndex}`} className="border-b border-gray-100 last:border-0 pb-8 last:pb-0">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-medium text-svef-gray text-lg">
                  {area}
                </h4>
                <Button
                  variant="secondary"
                  onClick={() => regenerateQuestionsForArea(area)}
                  disabled={isLoading[area]}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading[area] ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </Button>
              </div>

              {isLoading[area] ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-svef-purple animate-spin" />
                  <span className="ml-3 text-svef-gray">Generating practice questions...</span>
                </div>
              ) : questions[area] && questions[area].length > 0 ? (
                <div className="space-y-6">
                  {questions[area].map((question, questionIndex) => (
                    <div key={question.id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="bg-svef-purple text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                            {questionIndex + 1}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h5 className="font-medium text-svef-gray mb-2">Question:</h5>
                        <p className="text-svef-gray">{renderMathContent(question.questionText)}</p>
                        {question.visual && <MathVisual visual={question.visual} />}
                      </div>

                      {question.options && question.options.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-svef-gray mb-2">Options:</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {question.options.map((option: string, optionIndex: number) => (
                              <div key={optionIndex} className="p-2 bg-gray-100 rounded text-sm">
                                {String.fromCharCode(65 + optionIndex)}. {renderMathContent(option)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <button
                          onClick={() => toggleAnswer(question.id)}
                          className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-svef-purple transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-svef-gray">
                              {expandedAnswers[question.id] ? 'Hide Answer' : 'Show Answer'}
                            </span>
                            <span className="text-svef-purple">
                              {expandedAnswers[question.id] ? '−' : '+'}
                            </span>
                          </div>
                        </button>

                        {expandedAnswers[question.id] && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                            <div>
                              <h6 className="font-medium text-svef-gray mb-1">Answer:</h6>
                              <p className="text-svef-purple font-medium">{renderMathContent(question.answer)}</p>
                            </div>
                            <div>
                              <h6 className="font-medium text-svef-gray mb-1">Explanation:</h6>
                              <p className="text-sm text-svef-gray">{renderMathContent(question.explanation)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No practice questions generated yet.</p>
                  {assessmentContext && (
                    <div className="text-xs text-svef-gray bg-blue-50 px-2 py-1 rounded">
                      Matching assessment format: {assessmentContext.questionTypes?.join(', ') || 'Multiple Choice'}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => generateQuestionsForArea(area)}
                    className="mt-2"
                  >
                    Generate Questions
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
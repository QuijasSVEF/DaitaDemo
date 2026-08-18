import { supabase } from './config';
import { QuizTemplate, QuizQuestion, QuizAttempt, QuestionVisual, TableData } from '../../types/quiz';
import { Standard } from './standards';
import { detectTablePattern, inferTableFromContext, detectMultiTablePattern, detectDataVisualizationPattern } from '../../utils/mathUtils';

export async function processQuizAnswersForAnalysis(quizAttemptId: string) {
  try {
    const { data, error } = await supabase.rpc('process_quiz_answers_for_analysis', {
      p_attempt_id: quizAttemptId
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error processing quiz answers:', error);
    return null;
  }
}

export async function setActiveQuiz(quizId: string, teacherUsername: string): Promise<void> {
  try {
    console.log('Setting active quiz:', quizId, 'for teacher:', teacherUsername);
    
    // First deactivate any currently active quizzes for this teacher
    const { error: deactivateError } = await supabase
      .from('quiz_templates')
      .update({ is_active: false })
      .eq('teacher_username', teacherUsername)
      .neq('id', quizId);

    if (deactivateError) {
      console.error('Error deactivating other quizzes:', deactivateError);
      throw deactivateError;
    }

    // Then activate the selected quiz
    const { error: activateError } = await supabase
      .from('quiz_templates')
      .update({ is_active: true })
      .eq('id', quizId);

    if (activateError) {
      console.error('Error activating quiz:', activateError);
      throw activateError;
    }
    
    console.log('Quiz activated successfully');
  } catch (error) {
    console.error('Error setting active quiz:', error);
    throw error;
  }
}

export async function getLatestQuizAttempt(studentId: number, teacherUsername?: string) {
  try {
    if (!studentId) {
      console.warn('Student ID is required to fetch quiz attempt');
      return null;
    }
    
    console.log(`Fetching latest quiz attempt for student ${studentId}${teacherUsername ? ` and teacher ${teacherUsername}` : ''}`);
    
    let query = supabase
      .from('quiz_attempts') 
      .select(`
        *,
        quiz_templates!inner (
          title, 
          topic, 
          subtopics, 
          grade_level,
          questions,
          processed_questions
        )
      `)
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(1);
      
    // Add teacher filter if provided
    if (teacherUsername) {
      query = query.eq('teacher_username', teacherUsername);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // No quiz attempt found - this is okay
        console.log(`No quiz attempts found for student ${studentId}${teacherUsername ? ` and teacher ${teacherUsername}` : ''}`);
        return null;
      }
      console.error(`Error fetching quiz attempt for student ${studentId}:`, error);
      throw error;
    }

    if (!data) {
      console.log(`No quiz attempts found for student ${studentId}${teacherUsername ? ` and teacher ${teacherUsername}` : ''}`);
      return null;
    }
    
    console.log(`Found quiz attempt for student ${studentId}:`, data.id);

    // Enhance answers with correct answer information from quiz questions
    const questions = data.quiz_templates.processed_questions || data.quiz_templates.questions || [];
    const enhancedAnswers = (data.answers || []).map((answer: any) => {
      const question = questions.find((q: any) => q.id === answer.questionId);
      return {
        ...answer,
        correctAnswer: answer.correctAnswer || question?.correctAnswer || question?.correct_answer,
        questionText: answer.questionText || question?.questionText || question?.question_text
      };
    });
    return {
      id: data.id,
      score: data.score,
      totalQuestions: data.total_questions,
      answers: enhancedAnswers,
      teacher_username: data.teacher_username,
      completed_at: data.completed_at,
      quiz_templates: {
        title: data.quiz_templates.title,
        topic: data.quiz_templates.topic,
        subtopics: data.quiz_templates.subtopics,
        grade_level: data.quiz_templates.grade_level
      }
    };
  } catch (error) {
    console.error('Error fetching quiz attempt:', error);
    return null;
  }
}

export async function getTeacherQuizzes(teacherUsername: string): Promise<QuizTemplate[]> {
  try {
    console.log('Fetching quizzes for teacher:', teacherUsername);
    
    const { data, error } = await supabase
      .from('quiz_templates')
      .select('*')
      .eq('teacher_username', teacherUsername)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teacher quizzes:', error);
      throw error;
    }

    console.log('Fetched quizzes:', data?.length || 0);

    return (data || []).map(quiz => ({
      id: quiz.id,
      teacherUsername: quiz.teacher_username,
      title: quiz.title,
      topic: quiz.topic,
      subtopics: quiz.subtopics,
      questionTypes: quiz.question_types,
      numQuestions: quiz.num_questions,
      gradeLevel: quiz.grade_level,
      difficulty: quiz.difficulty,
      isActive: quiz.is_active || false,
      createdAt: new Date(quiz.created_at)
    }));
  } catch (error) {
    console.error('Error getting teacher quizzes:', error);
    throw error;
  }
}

export async function getActiveQuiz(teacherUsername: string): Promise<QuizTemplate | null> {
  try {
    if (!teacherUsername) {
      throw new Error("Teacher username is required to fetch active quiz");
    }
    
    console.log('Fetching active quiz for teacher:', teacherUsername);
    
    // First verify the teacher exists and is active
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('username, account_status, account_locked')
      .eq('username', teacherUsername)
      .maybeSingle();

    if (teacherError) {
      console.error('Error verifying teacher:', teacherError);
      return null;
    }

    if (!teacherData || teacherData.account_locked || teacherData.account_status !== 'active') {
      console.warn('Teacher not active or locked:', teacherUsername);
      return null;
    }

    const { data, error } = await supabase
      .from('quiz_templates')
      .select('*')
      .eq('teacher_username', teacherUsername) 
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No active quiz found for teacher:', teacherUsername);
        return null;
      }
      throw error;
    }

    if (!data) {
      console.log('No active quiz found for teacher:', teacherUsername);
      return null;
    }
    
    console.log('Found active quiz:', data.id);
    
    return {
      id: data.id,
      teacherUsername: data.teacher_username,
      title: data.title,
      topic: data.topic,
      subtopics: data.subtopics,
      questionTypes: data.question_types,
      numQuestions: data.num_questions,
      gradeLevel: data.grade_level,
      difficulty: data.difficulty,
      isActive: true,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error('Error getting active quiz:', error);
    return null;
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  try {
    console.log('Starting quiz deletion process for ID:', quizId);
    
    // Delete in the correct order to handle foreign key constraints
    
    // 1. Delete quiz attempts first
    const { error: attemptsError } = await supabase
      .from('quiz_attempts')
      .delete()
      .eq('template_id', quizId);

    if (attemptsError) {
      console.error('Error deleting quiz attempts:', attemptsError);
      throw new Error(`Failed to delete quiz attempts: ${attemptsError.message}`);
    }
    
    console.log('Quiz attempts deleted successfully');

    // 2. Delete quiz questions
    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('template_id', quizId);

    if (questionsError) {
      console.error('Error deleting quiz questions:', questionsError);
      throw new Error(`Failed to delete quiz questions: ${questionsError.message}`);
    }
    
    console.log('Quiz questions deleted successfully');

    // 3. Finally delete the quiz template
    const { error: templateError } = await supabase
      .from('quiz_templates')
      .delete()
      .eq('id', quizId);

    if (templateError) {
      console.error('Error deleting quiz template:', templateError);
      throw new Error(`Failed to delete quiz template: ${templateError.message}`);
    }
    
    console.log('Quiz template deleted successfully');
    
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
}

function inferVisualFromQuestion(questionText: string, explanation: string, options: string[] = []): QuestionVisual | null {
  // For dot/line plot and bar chart questions, prioritize the correct visualization type
  const isDotLineRef = /\b(?:line plot|dot plot|dotplot|lineplot)\b/i.test(questionText);
  const isBarChartRef = /\b(?:bar chart|bar graph|histogram|tally chart)\b/i.test(questionText);
  if (isDotLineRef || isBarChartRef) {
    return detectDataVisualizationPattern(questionText, explanation, options);
  }
  // For table/other questions, use the full inference chain
  return detectTablePattern(questionText)
    || inferTableFromContext(questionText, explanation)
    || detectMultiTablePattern(questionText, explanation, options)
    || detectDataVisualizationPattern(questionText, explanation, options);
}

const VIZ_REF_PATTERN = /\b(?:the (?:table|line plot|dot plot|bar chart|bar graph|histogram|tally chart|number line|data|plot|graph) (?:shows|below|above|displays|lists|represents)|use the (?:table|line plot|dot plot|bar chart|data|graph)|from the (?:table|line plot|dot plot|bar chart|data|graph)|according to the (?:table|data|graph)|based on the (?:table|data|graph|chart)|look at the (?:table|line plot|dot plot|bar chart|data|graph)|a (?:table|line plot|dot plot|bar chart) (?:shows|displays|lists)|the data (?:shows|below|above|displays))\b/i;

export async function getQuizQuestions(templateId: string): Promise<QuizQuestion[]> {
  try {
    if (!templateId) {
      console.warn('Template ID is required to fetch questions');
      return [];
    }
    
    console.log('Fetching questions for template:', templateId);
    
    // First try to get questions from the processed_questions field
    const { data: template, error: templateError } = await supabase
      .from('quiz_templates')
      .select('questions, processed_questions')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      throw templateError;
    }

    // Use processed_questions if available, otherwise use questions
    const questionsArray = template.processed_questions && template.processed_questions.length > 0 
      ? template.processed_questions 
      : template.questions;

    if (!questionsArray || !Array.isArray(questionsArray) || questionsArray.length === 0) {
      console.log('No questions found for template:', templateId);
      return [];
    }

    console.log('Found questions:', questionsArray.length);

    // Normalize the questions to ensure consistent property names
    return questionsArray.map((q: any, index: number) => {
      const normalizedQuestion: any = {
        id: q.id || `${templateId}-${index}`,
        templateId,
        questionText: q.questionText || q.question_text || '',
        correctAnswer: q.correctAnswer || q.correct_answer || '',
        explanation: q.explanation || '',
        options: Array.isArray(q.options) ? q.options : [],
        type: q.type || 'Multiple Choice',
        subtopic: q.subtopic || '',
        createdAt: new Date()
      };

      if (q.visual && q.visual.type !== 'unavailable') {
        normalizedQuestion.visual = q.visual;
      } else {
        const inferred = inferVisualFromQuestion(
          normalizedQuestion.questionText,
          normalizedQuestion.explanation,
          normalizedQuestion.options
        );
        if (inferred) {
          normalizedQuestion.visual = inferred;
        }
      }

      return normalizedQuestion;
    });
  } catch (error) {
    console.error('Error getting quiz questions:', error);
    throw error;
  }
}

export async function getQuizStandards(quizAttemptId: string): Promise<{
  questionId: string;
  standardCode: string;
  description: string;
}[]> {
  try {
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        answers,
        quiz_templates!inner (
          grade_level,
          quiz_questions!inner (
            id,
            subtopic
          )
        )
      `)
      .eq('id', quizAttemptId)
      .maybeSingle();

    if (attemptError) throw attemptError;
    if (!attempt || !attempt.answers) return [];
    
    // Check if quiz_templates and quiz_questions exist
    if (!attempt.quiz_templates || !attempt.quiz_templates.quiz_questions) {
      console.warn('Quiz template or questions not found for attempt:', quizAttemptId);
      return [];
    }

    // Get standards for the grade level
    const { data: standards, error: standardsError } = await supabase
      .from('ca_standards')
      .select('standard_code, description, domain, cluster')
      .eq('grade_level', attempt.quiz_templates.grade_level)
      .eq('subject', 'Mathematics');

    if (standardsError) {
      console.error('Error fetching standards:', standardsError);
      return [];
    }
    
    if (!standards || standards.length === 0) {
      console.warn('No standards found for grade level:', attempt.quiz_templates.grade_level);
      return [];
    }

    // Match standards to questions based on subtopic similarity
    const questions = attempt.quiz_templates.quiz_questions || [];
    const standardAlignments = questions.map(question => {
      // Find most relevant standard for the question's subtopic
      const matchingStandard = standards.reduce((best, current) => {
        const currentSimilarity = Math.max(
          similarity(question.subtopic, current.description),
          similarity(question.subtopic, current.domain),
          similarity(question.subtopic, current.cluster)
        );

        if (!best || currentSimilarity > best.similarity) {
          return { standard: current, similarity: currentSimilarity };
        }
        return best;
      }, null as { standard: Standard; similarity: number } | null);

      if (matchingStandard && matchingStandard.similarity > 0.3) {
        return {
          questionId: question.id,
          standardCode: matchingStandard.standard.standard_code,
          description: matchingStandard.standard.description
        };
      }
      return null;
    }).filter((alignment): alignment is NonNullable<typeof alignment> => alignment !== null);

    return standardAlignments;
  } catch (error) {
    console.error('Error getting quiz standards:', error);
    return [];
  }
}

// Helper function to calculate text similarity
function similarity(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  
  if (longerLength === 0) return 1.0;
  
  const costs = new Array(shorter.length + 1);
  for (let i = 0; i <= shorter.length; i++) {
    costs[i] = i;
  }
  
  let currentValue;
  for (let i = 1; i <= longer.length; i++) {
    costs[0] = i;
    let nw = i - 1;
    for (let j = 1; j <= shorter.length; j++) {
      const cj = Math.min(
        1 + Math.min(costs[j], costs[j - 1]),
        longer[i - 1] === shorter[j - 1] ? nw : nw + 1
      );
      nw = costs[j];
      costs[j] = cj;
    }
  }
  return (longerLength - costs[shorter.length]) / longerLength;
}
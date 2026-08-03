import { openai } from './openai/config';
import { createChatCompletion } from './openai/config';
import { GENERATE_QUIZ_PROMPT, VALIDATE_ANSWER_PROMPT } from './openai/prompts/quizPrompts';
import { QuizSettings, QuizQuestion } from '../types/quiz';
import { supabase } from './supabase/config';
import { v4 as uuidv4 } from 'uuid';
import { formatMathContent, detectTablePattern, inferTableFromContext, detectMultiTablePattern, detectDataVisualizationPattern } from '../utils/mathUtils.tsx';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function balanceAnswerPositions(questions: QuizQuestion[]): QuizQuestion[] {
  const positionCounts = [0, 0, 0, 0];

  return questions.map((q) => {
    if (!Array.isArray(q.options) || q.options.length !== 4) return q;

    let shuffledOptions = shuffleArray(q.options);
    let correctIndex = shuffledOptions.indexOf(q.correctAnswer);

    if (correctIndex === -1) {
      shuffledOptions[0] = q.correctAnswer;
      correctIndex = 0;
    }

    const minCount = Math.min(...positionCounts);
    const underRepresented = positionCounts
      .map((c, i) => (c === minCount ? i : -1))
      .filter((i) => i !== -1);

    const targetPos = underRepresented[Math.floor(Math.random() * underRepresented.length)];

    if (targetPos !== correctIndex) {
      [shuffledOptions[correctIndex], shuffledOptions[targetPos]] = [shuffledOptions[targetPos], shuffledOptions[correctIndex]];
      correctIndex = targetPos;
    }

    positionCounts[correctIndex]++;

    return { ...q, options: shuffledOptions };
  });
}

function ensureTableVisuals(questions: QuizQuestion[]): QuizQuestion[] {
  const vizRefPattern = /\b(?:the (?:table|line plot|dot plot|bar chart|bar graph|histogram|tally chart|number line|data|plot|graph) (?:shows|below|above|displays|lists|represents)|use the (?:table|line plot|dot plot|bar chart|data|graph)|from the (?:table|line plot|dot plot|bar chart|data|graph)|according to the (?:table|data|graph)|based on the (?:table|data|graph|chart)|look at the (?:table|line plot|dot plot|bar chart|data|graph)|a (?:table|line plot|dot plot|bar chart|bar graph) (?:shows|displays|lists)|the data (?:shows|below|above|displays))\b/i;

  return questions.map(q => {
    if (q.visual && q.visual.type !== 'unavailable') return q;
    if (!vizRefPattern.test(q.questionText)) return q;

    const inferred = detectTablePattern(q.questionText)
      || inferTableFromContext(q.questionText, q.explanation || '')
      || detectMultiTablePattern(q.questionText, q.explanation || '', q.options)
      || detectDataVisualizationPattern(q.questionText, q.explanation || '', q.options);

    if (inferred) {
      const cleanedText = cleanQuestionTextWithTable(q.questionText);
      return { ...q, questionText: cleanedText || q.questionText, visual: inferred };
    }
    return q;
  });
}

function cleanQuestionTextWithTable(text: string): string {
  // If we extracted a table, remove the inline data portion from the question text
  // Keep sentences that form the actual question (contain ? or are the first sentence)
  const sentences = text.split(/(?<=[.?!])\s+/);
  if (sentences.length <= 1) return text;

  // Keep: intro sentence (mentions table) + question sentence (has ?)
  const kept = sentences.filter(s =>
    /\b(?:table|chart|data)\b/i.test(s) ||
    /\?/.test(s) ||
    /\b(?:which|what|how|find|determine|calculate)\b/i.test(s)
  );

  if (kept.length > 0) {
    // Remove pure data sentences (only contain Header words and numbers)
    const cleaned = kept.filter(s => {
      const stripped = s.replace(/[A-Z][a-z]+/g, '').replace(/[\d,.\s]/g, '').trim();
      return stripped.length > 0 || /\?/.test(s) || /\b(?:table|shows|chart)\b/i.test(s);
    });
    return cleaned.length > 0 ? cleaned.join(' ') : kept.join(' ');
  }

  return text;
}

export async function generateQuiz(settings: QuizSettings & { templateId?: string; teacherUsername?: string }): Promise<QuizQuestion[]> {
  try {
    console.log('Generating quiz with settings:', settings);

    // Verify teacher status if username is provided
    if (settings.teacherUsername) {
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('username, account_status, account_locked')
        .eq('username', settings.teacherUsername)
        .maybeSingle();

      if (teacherError) {
        console.error('Error verifying teacher:', teacherError);
        throw new Error('Failed to verify teacher account');
      }

      if (!teacherData || teacherData.account_locked || teacherData.account_status !== 'active') {
        throw new Error('Teacher account not found, locked, or inactive');
      }
    }

    console.log('Teacher verified, proceeding with OpenAI request');

    const tokensPerQuestion = 350;
    const maxTokens = Math.min(16000, 500 + settings.numQuestions * tokensPerQuestion);

    const responseText = await createChatCompletion(
      GENERATE_QUIZ_PROMPT(settings),
      0.8,
      maxTokens
    );

    // Clean the response text by removing markdown formatting
    let cleanedResponse = responseText;
    try {
      // Try to parse as is first
      JSON.parse(responseText);
    } catch (e) {
      // If parsing fails, clean up markdown formatting
      cleanedResponse = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
    }

    let response;
    try {
      response = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Raw response:', responseText);
      console.log('Cleaned response:', cleanedResponse);
      throw new Error('Invalid response format from question generation');
    }

    const rawQuestions: QuizQuestion[] = (response.questions || []).map((q: any, index: number) => ({
      id: uuidv4(),
      templateId: settings.templateId || null,
      questionText: formatMathContent(q.questionText),
      correctAnswer: formatMathContent(q.correctAnswer),
      explanation: formatMathContent(q.explanation),
      options: Array.isArray(q.options) ? q.options.map(formatMathContent) : [],
      type: q.type,
      subtopic: q.subtopic || settings.subtopics?.[index % settings.subtopics.length] || settings.topic,
      createdAt: new Date(),
      visual: q.visual || undefined
    }));

    const withTables = ensureTableVisuals(rawQuestions);
    return balanceAnswerPositions(withTables);
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw error;
  }
}

export async function saveQuizTemplate(settings: QuizSettings, teacherUsername: string) {
  try {
    console.log('Saving quiz template for teacher:', teacherUsername);
    
    // Ensure questions are in a consistent format
    const normalizedQuestions = settings.questions?.map(q => ({
      id: q.id || uuidv4(),
      questionText: formatMathContent(q.questionText || ''),
      correctAnswer: formatMathContent(q.correctAnswer || ''),
      explanation: formatMathContent(q.explanation || ''),
      options: Array.isArray(q.options) ? q.options.map(formatMathContent) : [],
      type: q.type || '',
      subtopic: q.subtopic || '',
      visual: q.visual || undefined
    })) || [];
    
    console.log('Normalized questions to save:', normalizedQuestions);
    
    // First verify the teacher exists and is active
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers') 
      .select('username, account_status, account_locked')
      .eq('username', teacherUsername.trim())
      .maybeSingle();

    if (teacherError) {
      console.error('Error fetching teacher data:', teacherError);
      throw new Error('Failed to verify teacher account');
    }

    if (!teacherData) {
      throw new Error('Teacher account not found');
    }

    if (teacherData.account_locked) {
      throw new Error('Your account is currently locked. Please contact an administrator.');
    }

    if (teacherData.account_status !== 'active') {
      throw new Error('Your account is not active. Please contact an administrator.');
    }

    console.log('Teacher verified, proceeding with quiz template creation/update');

    // Only deactivate other quizzes if this one will be active
    if (settings.isActive) {
      await supabase
        .from('quiz_templates')
        .update({ is_active: false })
        .eq('teacher_username', teacherUsername)
        .eq('is_active', true);
    }

    // Use the normalized questions for both questions and processed_questions
    const processedQuestions = normalizedQuestions;

    // Check for existing template with same title
    const { data: existingTemplate, error: templateError } = await supabase
      .from('quiz_templates')
      .select('id, questions, processed_questions')
      .eq('teacher_username', teacherUsername)
      .eq('title', settings.title)
      .maybeSingle();

    if (templateError && templateError.code !== 'PGRST116') {
      console.error('Error checking for existing template:', templateError);
      throw new Error('Failed to check for existing template: ' + templateError.message);
    }

    if (existingTemplate) {
      console.log('Updating existing template:', existingTemplate.id);
      
      // Merge existing questions with new ones if we're updating
      // This ensures we don't lose any edits made in the preview
      const existingQuestions = existingTemplate.processed_questions?.length > 0 
        ? existingTemplate.processed_questions 
        : existingTemplate.questions || [];
        
      console.log('Existing questions:', existingQuestions);
      console.log('New questions to save:', normalizedQuestions);
      
      // If we have new questions, use them; otherwise keep existing ones
      const finalQuestions = normalizedQuestions.length > 0 
        ? normalizedQuestions 
        : existingQuestions;
      
      if (settings.isActive) {
        await supabase
          .from('quiz_templates')
          .update({ is_active: false })
          .eq('teacher_username', teacherUsername)
          .neq('id', existingTemplate.id);
      }

      // Update existing template
      const { error: updateError } = await supabase
        .from('quiz_templates')
        .update({
          is_active: settings.isActive !== false,
          topic: settings.topic,
          subtopics: settings.subtopics,
          question_types: settings.questionTypes,
          num_questions: settings.numQuestions,
          grade_level: settings.gradeLevel,
          difficulty: settings.difficulty,
          questions: finalQuestions,
          processed_questions: finalQuestions,
          em_level_code: settings.emLevelCode || null,
          em_module_id: settings.emModuleId || null,
          em_subtopic_ids: settings.emSubtopicIds || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTemplate.id);

      if (updateError) throw updateError;
      return existingTemplate.id;
    }
    
    console.log('Creating new template with questions:', normalizedQuestions);

    // Create new template if none exists
    const { data, error: createTemplateError } = await supabase.rpc('create_quiz_template_safe', {
      p_teacher_username: teacherUsername,
      p_title: settings.title,
      p_topic: settings.topic,
      p_subtopics: settings.subtopics,
      p_question_types: settings.questionTypes,
      p_num_questions: settings.numQuestions,
      p_grade_level: settings.gradeLevel,
      p_difficulty: settings.difficulty,
      p_show_answers: settings.showAnswers
    });

    if (createTemplateError) {
      console.error('RPC function error:', createTemplateError);
      throw new Error('Failed to create quiz template: ' + createTemplateError.message);
    }

    if (!data || !data.success) {
      console.error('RPC function returned failure:', data);
      throw new Error('Failed to create quiz template: ' + (data?.message || 'Unknown error'));
    }

    console.log('Template created successfully:', data.id);

    // Update the newly created template with the generated questions
    if (normalizedQuestions.length > 0) {
      console.log('Updating template with questions using RPC function...');
      const { data: updateResult, error: updateError } = await supabase.rpc('update_quiz_template_questions', {
        p_quiz_id: data.id,
        p_teacher_username: teacherUsername,
        p_questions: normalizedQuestions,
        p_num_questions: normalizedQuestions.length
      });

      if (updateError) {
        console.error('Error updating template with questions:', updateError);
        throw new Error('Failed to save questions to quiz template: ' + updateError.message);
      }

      if (!updateResult || !updateResult.id) {
        throw new Error('Failed to save questions: RPC function returned no data');
      }
    }

    // Always deactivate other templates for this teacher and activate the new one
    const { error: deactivateOthersError } = await supabase
      .from('quiz_templates')
      .update({ is_active: false })
      .eq('teacher_username', teacherUsername)
      .neq('id', data.id);
    if (deactivateOthersError) {
      console.error('Error deactivating other templates:', deactivateOthersError);
    }

    const { error: activateError } = await supabase
      .from('quiz_templates')
      .update({
        is_active: true,
        em_level_code: settings.emLevelCode || null,
        em_module_id: settings.emModuleId || null,
        em_subtopic_ids: settings.emSubtopicIds || null,
      })
      .eq('id', data.id);

    if (activateError) {
      console.error('Error activating new quiz template:', activateError);
    }

    return data.id;
  } catch (error) {
    console.error('Error saving quiz:', error);
    throw error instanceof Error ? error : new Error('Failed to save quiz template');
  }
}

export async function validateAnswer(
  question: string,
  studentAnswer: string,
  correctAnswer: string
) {
  try {
    const responseText = await createChatCompletion(
      VALIDATE_ANSWER_PROMPT(question, studentAnswer, correctAnswer),
      0.3
    );

    const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Error validating answer:', error);
    throw error;
  }
}
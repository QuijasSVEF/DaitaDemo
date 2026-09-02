import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Star, Send, CheckCircle, Volume2, VolumeX, Target, ChevronDown } from 'lucide-react';
import { Logo } from '../Logo';
import { supabase } from '../../services/supabase/config';
import { useQuery } from '@tanstack/react-query';
import { useSpeech } from '../../hooks/useSpeech';

import { formatStudentIdentifier, StudentIdentity } from '../../utils/studentIdentifier';

interface Props {
  studentId: number;
  teacherUsername: string;
  student?: StudentIdentity & { emojiPassword?: string };
  onBack: () => void;
  onComplete: () => void;
}

const NEXT_STEPS_OPTIONS = [
  'Practicing more problems',
  'Using visuals/models',
  'Checking my work',
  'Explaining my reasoning',
  'Solving word problems',
];

const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Not confident', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 2, label: 'A little confident', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 3, label: 'Somewhat confident', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 4, label: 'Confident', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 5, label: 'Very confident', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
];

export function StudentTracker({ studentId, teacherUsername, student, onBack, onComplete }: Props) {
  const identifier = student
    ? formatStudentIdentifier({ ...student, emoji: student.emojiPassword || student.emoji })
    : `Student #${studentId}`;
  const { speak, speaking } = useSpeech();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selfReflection, setSelfReflection] = useState('');
  const [confidence, setConfidence] = useState<number>(0);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [nextStepsOpen, setNextStepsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleNextStep = (option: string) => {
    setNextSteps(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const { data: recentTopics = [] } = useQuery({
    queryKey: ['recentStudentTopics', studentId, teacherUsername],
    queryFn: async () => {
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('answers, quiz_templates(topic)')
        .eq('student_id', studentId)
        .eq('teacher_username', teacherUsername)
        .order('completed_at', { ascending: false })
        .limit(3);

      const topics = new Set<string>();
      (attempts || []).forEach((a: any) => {
        if (a.quiz_templates?.topic) topics.add(a.quiz_templates.topic);
        (a.answers || []).forEach((ans: any) => {
          if (ans.questionSubtopic) topics.add(ans.questionSubtopic);
        });
      });

      return Array.from(topics).slice(0, 12);
    }
  });

  const handleToggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTopics.length === 0 && !selfReflection.trim() && nextSteps.length === 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('student_session_logs')
        .insert({
          student_id: studentId,
          teacher_username: teacherUsername,
          session_date: new Date().toISOString().split('T')[0],
          topics_practiced: selectedTopics,
          self_reflection: selfReflection.trim() || null,
          confidence_rating: confidence > 0 ? confidence : null,
          next_steps: nextSteps
        });

      if (error) throw error;
      setIsSubmitted(true);
      setTimeout(onComplete, 2500);
    } catch (err) {
      console.error('Error submitting session log:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <Logo />
          </div>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="font-oswald text-2xl font-medium text-svef-gray mb-2">
            Great job today!
          </h2>
          <p className="text-svef-gray">
            Your session log has been saved. Keep up the hard work!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-svef-beige/30">
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-svef-gray" />
          </button>
          <Logo />
          <div className="ml-4 flex-1">
            <h1 className="font-oswald text-xl font-medium text-svef-gray">
              My Session Log
              <button
                onClick={() => speak("Tell us what you worked on today and how you feel about it.")}
                className="ml-2 p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
              >
                {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </h1>
            <p className="text-sm text-svef-gray">{identifier}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">What did you work on today?</h2>
            </div>
            {recentTopics.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">Select the topics you practiced:</p>
                <div className="flex flex-wrap gap-2">
                  {recentTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleToggleTopic(topic)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        selectedTopics.includes(topic)
                          ? 'bg-blue-100 border-blue-400 text-blue-800'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tell us more about what you worked on
              </label>
              <textarea
                value={selfReflection}
                onChange={(e) => setSelfReflection(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="What did you learn? What was tricky?"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">How confident do you feel?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {CONFIDENCE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setConfidence(level.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    confidence === level.value
                      ? level.color + ' ring-2 ring-offset-1 ring-blue-400'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {'*'.repeat(level.value).split('').map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 inline-block ${
                          confidence === level.value ? 'text-amber-500' : 'text-gray-400'
                        }`}
                        fill={confidence === level.value ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium">{level.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <button
              type="button"
              onClick={() => setNextStepsOpen(!nextStepsOpen)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Next Steps</h2>
                {nextSteps.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {nextSteps.length} selected
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  nextStepsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {nextStepsOpen && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-3">Next time, I will focus on:</p>
                <div className="space-y-2">
                  {NEXT_STEPS_OPTIONS.map((option) => {
                    const checked = nextSteps.includes(option);
                    return (
                      <label
                        key={option}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          checked
                            ? 'bg-blue-50 border-blue-400'
                            : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleNextStep(option)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-800">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (selectedTopics.length === 0 && !selfReflection.trim() && nextSteps.length === 0)}
            className="w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit My Session Log
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

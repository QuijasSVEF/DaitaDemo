import React from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Smile, Volume2, VolumeX } from 'lucide-react';
import { Logo } from '../Logo';
import { FormField } from '../forms/FormField';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';
import { cn } from '../../utils/cn';
import { useSpeech } from '../../hooks/useSpeech';
import { DEMO_MODE } from '../../config/demoMode';

const EMOJI_OPTIONS = [
  'smile', 'star', 'balloon', 'rainbow', 'lion', 'dog', 'cat', 'panda',
  'fox', 'frog', 'unicorn', 'fish', 'butterfly', 'flower', 'soccer', 'art'
];

const EMOJI_MAP: Record<string, string> = {
  smile: '\u{1F60A}', star: '\u{1F31F}', balloon: '\u{1F388}', rainbow: '\u{1F308}',
  lion: '\u{1F981}', dog: '\u{1F436}', cat: '\u{1F431}', panda: '\u{1F43C}',
  fox: '\u{1F98A}', frog: '\u{1F438}', unicorn: '\u{1F984}', fish: '\u{1F420}',
  butterfly: '\u{1F98B}', flower: '\u{1F33A}', soccer: '\u26BD\uFE0F', art: '\u{1F3A8}',
};

const EMOJIS = EMOJI_OPTIONS.map((k) => EMOJI_MAP[k]);

interface StudentLoginForm {
  firstName: string;
  lastInitial: string;
  teacherUsername: string;
  districtId: string;
  emojiPassword: string;
}

interface Props {
  onSubmit: (data: {
    studentId: number;
    firstName: string;
    lastInitial: string;
    teacherUsername: string;
    districtId?: string;
    emojiPassword?: string;
  }) => void;
  onBack: () => void;
}

export function StudentLogin({ onSubmit, onBack }: Props) {
  const { speak, speaking } = useSpeech();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<StudentLoginForm>({
    defaultValues: {
      firstName: '',
      lastInitial: '',
      districtId: '',
      emojiPassword: '',
      teacherUsername: ''
    }
  });

  const selectedDistrict = watch('districtId');
  const selectedEmoji = watch('emojiPassword');
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { data: districts = [] } = useQuery({
    queryKey: ['districts-with-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('district_id, school_districts!inner(id, name, code)')
        .eq('account_status', 'active')
        .not('district_id', 'is', null);

      if (error) throw error;

      const seen = new Map<string, { id: string; name: string; code: string }>();
      for (const row of data || []) {
        const d = row.school_districts as any;
        if (d && !seen.has(d.id)) {
          seen.set(d.id, { id: d.id, name: d.name, code: d.code });
        }
      }
      return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', selectedDistrict],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('username, name')
        .eq('account_status', 'active')
        .eq('district_id', selectedDistrict)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDistrict
  });

  const handleFormSubmit = async (data: StudentLoginForm) => {
    setServerError(null);
    try {
      if (!data.emojiPassword?.trim()) {
        setServerError('Please pick your secret emoji.');
        return;
      }

      const { data: result, error } = await supabase.rpc('register_or_login_student', {
        p_teacher_username: data.teacherUsername,
        p_first_name: data.firstName.trim(),
        p_last_initial: data.lastInitial.trim(),
        p_emoji_password: data.emojiPassword.trim(),
        p_grade_level: '6'
      });

      if (error) {
        console.error('Login error:', error);
        if (error.message?.toLowerCase().includes('wrong emoji')) {
          setServerError('Oops! That is not the right emoji. Pick the emoji you chose the first time you logged in.');
        } else {
          setServerError(error.message || 'Could not log in. Please check your info.');
        }
        return;
      }

      const row = Array.isArray(result) ? result[0] : result;
      if (!row?.student_id) {
        setServerError('Could not log in. Please check your info.');
        return;
      }

      onSubmit({
        studentId: row.student_id,
        firstName: row.first_name ?? data.firstName.trim(),
        lastInitial: row.last_initial ?? data.lastInitial.trim(),
        teacherUsername: data.teacherUsername,
        districtId: data.districtId,
        emojiPassword: data.emojiPassword
      });
    } catch (err) {
      console.error('Login error:', err);
      setServerError('Something went wrong. Please try again.');
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setValue('emojiPassword', emoji === selectedEmoji ? '' : emoji);
  };

  const readInstructions = () => {
    speak('Welcome to D A T A. Pick your school district, your teacher, type your first name and last initial, then choose your secret emoji to continue.');
  };

  const readEmojiOptions = () => {
    speak('Choose your secret emoji password from the options below.');
  };

  if (DEMO_MODE) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-svef-beige/30 px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-8">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-svef-gray" />
            </button>
            <Logo />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-oswald text-2xl font-medium text-svef-gray">Welcome to D[ai]TA</h1>
            <p className="font-open-sans text-sm text-svef-brown mt-1">Log in with your name and secret emoji</p>
          </div>

          <form onSubmit={handleSubmit((data) => {
            if (!data.emojiPassword?.trim()) {
              setServerError('Please pick your secret emoji.');
              return;
            }
            handleFormSubmit({ ...data, districtId: 'demo', teacherUsername: 'quijas' });
          })} className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <FormField label="First Name" error={errors.firstName?.message}>
                  <input
                    type="text"
                    autoComplete="given-name"
                    {...register('firstName', {
                      required: 'First name is required',
                      pattern: { value: /^[A-Za-z]+$/, message: 'Letters only' },
                      maxLength: { value: 30, message: 'Too long' }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                    placeholder="Jane"
                  />
                </FormField>
              </div>
              <FormField label="Last Initial" error={errors.lastInitial?.message}>
                <input
                  type="text"
                  maxLength={1}
                  {...register('lastInitial', {
                    required: 'Required',
                    pattern: { value: /^[A-Za-z]$/, message: 'One letter' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple uppercase text-center"
                  placeholder="D"
                />
              </FormField>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Smile className="w-5 h-5 text-svef-purple flex-shrink-0" />
                <label className="block font-open-sans text-sm font-medium text-svef-gray flex-1">
                  Choose Your Emoji
                </label>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className={cn(
                      'w-full aspect-square flex items-center justify-center',
                      'text-2xl rounded-lg border-2 transition-all relative',
                      selectedEmoji === emoji
                        ? 'border-svef-purple bg-svef-purple/10'
                        : 'border-gray-200 hover:border-svef-purple/50'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="flex justify-center">
                <div
                  className={cn(
                    'w-16 h-16 rounded-lg border-2 flex items-center justify-center text-3xl',
                    selectedEmoji ? 'border-svef-purple' : 'border-gray-200'
                  )}
                >
                  {selectedEmoji || ''}
                </div>
              </div>
            </div>

            {serverError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-svef-purple hover:bg-svef-purple/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-purple disabled:opacity-50"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-svef-beige/30 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-svef-gray" />
          </button>
          <div className="flex items-center">
            <Logo />
            <button
              type="button"
              onClick={readInstructions}
              className="ml-2 p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
              aria-label="Read instructions aloud"
            >
              {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-oswald text-2xl font-medium text-svef-gray">Welcome to D[ai]TA</h1>
          <p className="font-open-sans text-sm text-svef-brown mt-1">Log in with your name and secret emoji</p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <FormField label="Select School District" error={errors.districtId?.message}>
            <select
              {...register('districtId', { required: 'Please select a school district' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
            >
              <option value="">Select a district...</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name} ({district.code})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Select Your Teacher" error={errors.teacherUsername?.message}>
            <select
              {...register('teacherUsername', { required: 'Please select your teacher' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
              disabled={!selectedDistrict}
            >
              <option value="">Select a teacher...</option>
              {teachers.map((teacher) => (
                <option key={teacher.username} value={teacher.username}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label="First Name" error={errors.firstName?.message}>
                <input
                  type="text"
                  autoComplete="given-name"
                  {...register('firstName', {
                    required: 'First name is required',
                    pattern: { value: /^[A-Za-z]+$/, message: 'Letters only' },
                    maxLength: { value: 30, message: 'Too long' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                  placeholder="Jane"
                />
              </FormField>
            </div>
            <FormField label="Last Initial" error={errors.lastInitial?.message}>
              <input
                type="text"
                maxLength={1}
                {...register('lastInitial', {
                  required: 'Required',
                  pattern: { value: /^[A-Za-z]$/, message: 'One letter' }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple uppercase text-center"
                placeholder="D"
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Smile className="w-5 h-5 text-svef-purple flex-shrink-0" />
              <label className="block font-open-sans text-sm font-medium text-svef-gray flex-1">
                Choose Your Secret Emoji
              </label>
              <button
                type="button"
                onClick={readEmojiOptions}
                className="p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
                aria-label="Read emoji instructions aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className={cn(
                    'w-full aspect-square flex items-center justify-center',
                    'text-2xl rounded-lg border-2 transition-all relative',
                    selectedEmoji === emoji
                      ? 'border-svef-purple bg-svef-purple/10'
                      : 'border-gray-200 hover:border-svef-purple/50'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <div
                className={cn(
                  'w-16 h-16 rounded-lg border-2 flex items-center justify-center text-3xl',
                  selectedEmoji ? 'border-svef-purple' : 'border-gray-200'
                )}
              >
                {selectedEmoji || ''}
              </div>
            </div>
          </div>

          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-svef-purple hover:bg-svef-purple/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-purple disabled:opacity-50"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { StudentLogin } from './StudentLogin';
import { StudentLanding } from './StudentLanding';
import { StudentAssessment } from './StudentAssessment';
import { StudentTracker } from './StudentTracker';
import { StudentSessionLogs } from './StudentSessionLogs';
import { StudentAcknowledgmentModal } from '../legal/StudentAcknowledgmentModal';
import { checkTosAccepted, recordTosAcceptance } from '../../services/supabase/tos';

interface Props {
  onBack: () => void;
}

type FlowStep = 'login' | 'tos' | 'landing' | 'assessment' | 'tracker' | 'logs';

export interface StudentSessionInfo {
  studentId: number;
  firstName: string;
  lastInitial: string;
  teacherUsername: string;
  districtId?: string;
  emojiPassword?: string;
}

export function StudentFlow({ onBack }: Props) {
  const [step, setStep] = useState<FlowStep>('login');
  const [studentInfo, setStudentInfo] = useState<StudentSessionInfo | null>(null);
  const [tosSubmitting, setTosSubmitting] = useState(false);

  const handleLogin = async (data: StudentSessionInfo) => {
    setStudentInfo(data);
    setStep('landing');
  };

  const handleTosAcknowledge = async () => {
    if (!studentInfo) return;
    setTosSubmitting(true);
    try {
      await recordTosAcceptance('student', String(studentInfo.studentId));
      setStep('landing');
    } catch (err) {
      console.error('Error recording student ToS:', err);
      setStep('landing');
    } finally {
      setTosSubmitting(false);
    }
  };

  const handleLogout = () => {
    setStudentInfo(null);
    setStep('login');
  };

  if (!studentInfo || step === 'login') {
    return (
      <StudentLogin
        onSubmit={handleLogin}
        onBack={onBack}
      />
    );
  }

  if (step === 'tos') {
    return (
      <StudentAcknowledgmentModal
        onAcknowledge={handleTosAcknowledge}
        isSubmitting={tosSubmitting}
      />
    );
  }

  if (step === 'landing') {
    return (
      <StudentLanding
        studentId={studentInfo.studentId}
        student={studentInfo}
        onAssessment={() => setStep('assessment')}
        onLogSession={() => setStep('tracker')}
        onViewLogs={() => setStep('logs')}
        onLogout={handleLogout}
      />
    );
  }

  if (step === 'logs') {
    return (
      <StudentSessionLogs
        studentId={studentInfo.studentId}
        teacherUsername={studentInfo.teacherUsername}
        student={studentInfo}
        onBack={() => setStep('landing')}
      />
    );
  }

  if (step === 'tracker') {
    return (
      <StudentTracker
        studentId={studentInfo.studentId}
        teacherUsername={studentInfo.teacherUsername}
        student={studentInfo}
        onBack={() => setStep('landing')}
        onComplete={() => setStep('landing')}
      />
    );
  }

  return (
    <StudentAssessment
      studentId={studentInfo.studentId}
      teacherUsername={studentInfo.teacherUsername}
      student={studentInfo}
      onBack={() => setStep('landing')}
      onAssessmentComplete={() => setStep('tracker')}
      onLogout={handleLogout}
    />
  );
}

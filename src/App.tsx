import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase/config';
import { StartPage } from './components/StartPage';
import { TeacherLogin } from './components/TeacherLogin';
import { StudentFlow } from './components/student/StudentFlow';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CoachLogin } from './components/coach/CoachLogin';
import { CoachDashboard } from './components/coach/CoachDashboard';
import { MentorLogin, CollegeMentor } from './components/mentor/MentorLogin';
import { MentorDashboard } from './components/mentor/MentorDashboard';
import { BetaFeedback } from './components/BetaFeedback';
import { LegalFooter } from './components/legal/LegalFooter';
import { TermsOfServiceModal } from './components/legal/TermsOfServiceModal';
import { DemoErrorBoundary } from './components/DemoErrorBoundary';
import { DemoBadge } from './components/DemoBadge';
import { useAuth } from './hooks/useAuth';
import { signOut } from './services/auth';
import { DEMO_MODE } from './config/demoMode';
import { checkTosAccepted, recordTosAcceptance } from './services/supabase/tos';

function getStoredSession<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(key);
      return null;
    }
    return session as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function App() {
  const [userType, setUserType] = useState<'teacher' | 'student' | 'admin' | 'coach' | 'mentor' | null>(() => {
    const stored = localStorage.getItem('userType');
    if (stored === 'teacher' || stored === 'admin' || stored === 'coach' || stored === 'mentor') {
      return stored;
    }
    return null;
  });
  const [teacher, setTeacher] = useState<{ username: string; name: string } | null>(null);
  const [coach, setCoach] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [admin, setAdmin] = useState<{ id: string; email: string } | null>(null);
  const [mentor, setMentor] = useState<CollegeMentor | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState<boolean | null>(null);
  const [tosChecking, setTosChecking] = useState(false);
  const [tosSubmitting, setTosSubmitting] = useState(false);
  const { user, loading } = useAuth();

  // Persist userType to localStorage whenever it changes
  useEffect(() => {
    if (userType) {
      localStorage.setItem('userType', userType);
    } else {
      localStorage.removeItem('userType');
    }
  }, [userType]);

  // Restore non-teacher sessions from localStorage on mount
  useEffect(() => {
    const storedType = localStorage.getItem('userType');

    if (storedType === 'coach') {
      const session = getStoredSession<{ id: string; email: string; fullName: string }>('coachSession');
      if (session) {
        setCoach({ id: session.id, email: session.email, fullName: session.fullName });
      } else {
        localStorage.removeItem('userType');
        setUserType(null);
      }
    } else if (storedType === 'admin') {
      const session = getStoredSession<{ id: string; email: string }>('adminSession');
      if (session) {
        setAdmin({ id: session.id, email: session.email });
      } else {
        localStorage.removeItem('userType');
        setUserType(null);
      }
    } else if (storedType === 'mentor') {
      const session = getStoredSession<CollegeMentor & { expiresAt?: string }>('mentorSession');
      if (session) {
        setMentor(session);
      } else {
        localStorage.removeItem('userType');
        setUserType(null);
      }
    }
  }, []);

  // Check auth state on mount and user changes (teacher flow)
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        if (user) {
          const { data: teacherData, error: teacherError } = await supabase
            .from('teachers')
            .select('username, name, email, account_status, account_locked')
            .eq('email', user.email)
            .single();

          if (teacherError || !teacherData) {
            await signOut();
            setTeacher(null);
            return;
          }

          if (teacherData.account_locked || teacherData.account_status !== 'active') {
            await signOut();
            setTeacher(null);
            return;
          }

          setTeacher({
            username: teacherData.username,
            name: teacherData.name || teacherData.username
          });
          setUserType('teacher');
        } else {
          setTeacher(null);
        }
      } catch (error) {
        console.error('Error in auth state check:', error);
        setTeacher(null);
      }
    };

    checkAuthState();
  }, [user]);

  // Check ToS acceptance after login for non-admin roles
  useEffect(() => {
    const checkTos = async () => {
      // Determine the user identifier and role for ToS check
      let identifier: string | null = null;
      let role: 'teacher' | 'coach' | 'mentor' | null = null;

      if (teacher) {
        identifier = teacher.username;
        role = 'teacher';
      } else if (coach) {
        identifier = coach.email;
        role = 'coach';
      } else if (mentor) {
        identifier = mentor.email;
        role = 'mentor';
      }

      // Skip check if no user logged in or admin role
      if (!identifier || !role) {
        setTosAccepted(null);
        return;
      }

      // Skip ToS in demo mode
      if (DEMO_MODE) {
        setTosAccepted(true);
        return;
      }

      setTosChecking(true);
      try {
        const accepted = await checkTosAccepted(role, identifier);
        setTosAccepted(accepted);
      } catch (err) {
        console.error('Error checking ToS:', err);
        setTosAccepted(false);
      } finally {
        setTosChecking(false);
      }
    };

    checkTos();
  }, [teacher, coach, mentor]);

  const handleTosAccept = async () => {
    let identifier: string | null = null;
    let role: 'teacher' | 'coach' | 'mentor' | null = null;

    if (teacher) {
      identifier = teacher.username;
      role = 'teacher';
    } else if (coach) {
      identifier = coach.email;
      role = 'coach';
    } else if (mentor) {
      identifier = mentor.email;
      role = 'mentor';
    }

    if (!identifier || !role) return;

    setTosSubmitting(true);
    try {
      const success = await recordTosAcceptance(role, identifier);
      if (success) {
        setTosAccepted(true);
      }
    } catch (err) {
      console.error('Error recording ToS acceptance:', err);
    } finally {
      setTosSubmitting(false);
    }
  };

  const handleTosDecline = async () => {
    await handleSignOut();
  };

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('mentorSession');
    localStorage.removeItem('coachSession');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('userType');
    setTeacher(null);
    setCoach(null);
    setAdmin(null);
    setMentor(null);
    setUserType(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-svef-purple"></div>
      </div>
    );
  }

  if (!userType) {
    return <StartPage onSelectUserType={setUserType} />;
  }

  const feedbackUserIdentifier =
    teacher?.username || coach?.email || admin?.email || mentor?.email || 'anonymous';

  const renderPortal = () => {
    switch (userType) {
      case 'teacher':
        if (teacher) {
          // Show ToS modal if not yet accepted
          if (tosChecking) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-svef-green"></div>
              </div>
            );
          }
          if (tosAccepted === false) {
            return (
              <TermsOfServiceModal
                userRole="teacher"
                onAccept={handleTosAccept}
                onDecline={handleTosDecline}
                isSubmitting={tosSubmitting}
              />
            );
          }
          return <TeacherDashboard teacher={teacher} onSignOut={handleSignOut} />;
        }
        return (
          <TeacherLogin
            onBack={() => setUserType(null)}
            onLogin={setTeacher}
            error={loginError}
            isLoading={isLoginLoading}
          />
        );

      case 'student':
        return <StudentFlow onBack={() => setUserType(null)} />;

      case 'admin':
        return admin ? (
          <AdminDashboard onSignOut={handleSignOut} />
        ) : (
          <AdminLogin onBack={() => setUserType(null)} onLogin={(adminData) => {
            localStorage.setItem('adminSession', JSON.stringify({
              ...adminData,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }));
            setAdmin(adminData);
          }} />
        );

      case 'coach':
        if (coach) {
          if (tosChecking) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-svef-brown"></div>
              </div>
            );
          }
          if (tosAccepted === false) {
            return (
              <TermsOfServiceModal
                userRole="coach"
                onAccept={handleTosAccept}
                onDecline={handleTosDecline}
                isSubmitting={tosSubmitting}
              />
            );
          }
          return <CoachDashboard coach={coach} onSignOut={handleSignOut} />;
        }
        return <CoachLogin onBack={() => setUserType(null)} onLogin={(coachData) => {
            localStorage.setItem('coachSession', JSON.stringify({
              ...coachData,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }));
            setCoach(coachData);
          }} />;

      case 'mentor':
        if (mentor) {
          if (tosChecking) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            );
          }
          if (tosAccepted === false) {
            return (
              <TermsOfServiceModal
                userRole="mentor"
                onAccept={handleTosAccept}
                onDecline={handleTosDecline}
                isSubmitting={tosSubmitting}
              />
            );
          }
          return <MentorDashboard mentor={mentor} onSignOut={handleSignOut} />;
        }
        return <MentorLogin onBack={() => setUserType(null)} onLogin={setMentor} />;

      default:
        return <StartPage onSelectUserType={setUserType} />;
    }
  };

  return (
    <DemoErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          {renderPortal()}
        </div>
        <LegalFooter />
        <BetaFeedback userRole={userType} userIdentifier={feedbackUserIdentifier} />
        <DemoBadge />
      </div>
    </DemoErrorBoundary>
  );
}

export default App;
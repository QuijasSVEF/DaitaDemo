import React, { useState, useEffect } from 'react';
import { StartPage } from './components/StartPage';
import { TeacherLogin } from './components/TeacherLogin';
import { StudentFlow } from './components/student/StudentFlow';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CoachLogin } from './components/coach/CoachLogin';
import { CoachDashboard } from './components/coach/CoachDashboard';
import { useAuth } from './hooks/useAuth';
import { supabase } from './services/supabase/config';
import { signIn, signOut } from './services/auth';

interface TeacherData {
  username: string;
  name: string;
  account_status: string;
  account_locked: boolean;
}

function App() {
  const [userType, setUserType] = useState<'teacher' | 'student' | 'admin' | 'coach' | null>(null);
  const [teacher, setTeacher] = useState<{ username: string; name: string } | null>(null);
  const [coach, setCoach] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [coachViewingTeacher, setCoachViewingTeacher] = useState<{ username: string; name: string } | null>(null);
  const [admin, setAdmin] = useState<{ id: string; email: string } | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const checkTeacherStatus = async () => {
      try {
        if (!user) {
          setTeacher(null);
          return;
        }

        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select<'teachers', TeacherData>('username, name, account_status, account_locked')
          .eq('email', user.email)
          .single();

        if (teacherError || !teacherData) {
          console.error('Error verifying teacher:', teacherError);
          await signOut();
          setTeacher(null);
          return;
        }

        if (teacherData.account_locked || teacherData.account_status !== 'active') {
          console.error('Teacher account is locked or inactive');
          await signOut();
          setTeacher(null);
          return;
        }

        setTeacher({
          username: teacherData.username,
          name: teacherData.name || teacherData.username
        });
      } catch (error) {
        console.error('Error checking auth:', error);
        await signOut();
        setTeacher(null);
      }
    };

    checkTeacherStatus();
  }, [user]);

  const handleTeacherLogin = async (email: string, password: string, rememberMe: boolean) => {
    try {
      setIsLoginLoading(true);
      setLoginError(null);

      const teacherData = await signIn(email, password);
      if (teacherData) {
        setTeacher(teacherData);
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setTeacher(null);
    setCoach(null);
    setCoachViewingTeacher(null);
    setAdmin(null);
    setUserType(null);
  };

  const handleCoachSelectTeacher = async (username: string) => {
    const { data, error } = await supabase
      .from('teachers')
      .select('username, name')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) return;
    setCoachViewingTeacher({ username: data.username, name: data.name || data.username });
  };

  const handleCoachBackToDashboard = () => {
    setCoachViewingTeacher(null);
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

  switch (userType) {
    case 'teacher':
      return teacher ? (
        <TeacherDashboard teacher={teacher} onSignOut={handleSignOut} />
      ) : (
        <TeacherLogin
          onBack={() => setUserType(null)}
          onLogin={(teacher) => setTeacher(teacher)}
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
        <AdminLogin onBack={() => setUserType(null)} onLogin={setAdmin} />
      );

    case 'coach':
      if (!coach) {
        return <CoachLogin onBack={() => setUserType(null)} onLogin={setCoach} />;
      }
      if (coachViewingTeacher) {
        return (
          <TeacherDashboard
            teacher={coachViewingTeacher}
            onSignOut={handleCoachBackToDashboard}
            isCoachView
            coachName={coach.fullName}
          />
        );
      }
      return (
        <CoachDashboard
          coach={coach}
          onSignOut={handleSignOut}
          onSelectTeacher={handleCoachSelectTeacher}
        />
      );

    default:
      return <StartPage onSelectUserType={setUserType} />;
  }
}

export default App;

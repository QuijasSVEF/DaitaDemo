import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase/config';
import { getTeacherFromSession } from '../services/auth';
import { workflowMonitor } from '../services/assessment/workflowMonitor';

interface User {
  username: string;
  email: string;
  name?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        console.log('Checking for existing session...');
        
        // Check for teacher session in localStorage
        const sessionStr = localStorage.getItem('teacherSession');
        if (!sessionStr) {
          console.log('No session found in localStorage');
          setUser(null);
          setLoading(false);
          return;
        }
        
        try {
          const session = JSON.parse(sessionStr);
          console.log('Session found:', { username: session.username, expiresAt: session.expiresAt });
          
          // Check if session is expired
          if (new Date(session.expiresAt) < new Date()) {
            console.log('Session expired, clearing localStorage');
            setUser(null);
            localStorage.removeItem('teacherSession');
            setLoading(false);
            return;
          }
          
          // Get teacher from session
          const teacher = getTeacherFromSession(sessionStr);
          if (teacher) {
            console.log('Valid teacher found in session:', teacher);
            setUser(teacher);
            
            // Start monitoring for this teacher
            workflowMonitor.startMonitoring(teacher.username);
          } else {
            console.log('Invalid teacher data in session');
            setUser(null);
          }
        } catch (parseError) {
          console.error('Error parsing session:', parseError);
          localStorage.removeItem('teacherSession');
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

  }, []);

  const logout = useCallback(async () => {
    try {
      // Stop monitoring when logging out
      if (user?.username) {
        workflowMonitor.stopMonitoring(user.username);
      }
      
      // Clear localStorage
      localStorage.removeItem('teacherSession');
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout
  };
}
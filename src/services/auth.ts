import { supabase } from './supabase/config';
import { Teacher } from '../types';
import { authenticateTeacher } from './supabase/teachers';

interface TeacherSession {
  token: string;
  expiresAt: Date;
  username: string;
  email: string;
  name: string;
}

export function getTeacherFromSession(sessionStr: string): Teacher | null {
  try {
    const session = JSON.parse(sessionStr);
    if (!session || !session.username) {
      return null;
    }
    
    // Return teacher data from session
    return {
      username: session.username,
      name: session.name || session.username,
      email: session.email || ''
    };
  } catch (error) {
    console.error('Error parsing teacher session:', error);
    return null;
  }
}

export async function signIn(username: string, password: string): Promise<Teacher> {
  try {
    console.log('Attempting to authenticate teacher with email:', username);
    
    // Use the RPC function for authentication
    const { data: authResult, error: authError } = await supabase.rpc('authenticate_teacher_by_email', {
      p_email: username.toLowerCase(),
      p_password: password
    });

    if (authError) {
      console.error('Authentication RPC error:', authError);
      throw new Error(authError.message || 'Authentication failed');
    }

    if (!authResult || !authResult.success) {
      console.error('Authentication failed:', authResult?.message);
      throw new Error(authResult?.message || 'Invalid credentials');
    }
    
    if (!authResult.teacher) {
      throw new Error('Teacher data not found');
    }

    const teacher = authResult.teacher;
    console.log('Authentication successful for teacher:', teacher.username);
    
    // Create session data
    const sessionData: TeacherSession = {
      token: `teacher_${teacher.username}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      username: teacher.username,
      email: username.toLowerCase(),
      name: teacher.name
    };
    
    // Store session in localStorage
    localStorage.setItem('teacherSession', JSON.stringify(sessionData));
    console.log('Session stored successfully');
    
    return teacher;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    // Clear localStorage
    localStorage.removeItem('teacherSession');
    
    // Sign out from Supabase if there's an active session
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}
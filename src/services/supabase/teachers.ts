import { supabase } from './config';
import { Teacher } from '../../types';

export interface AuthResult {
  success: boolean;
  message?: string;
  teacher?: {
    username: string;
    name: string;
  };
}

export interface BulkImportTeacher {
  username: string;
  email: string;
  fullName: string;
  password: string;
  districtCode: string;
}

export async function authenticateTeacher(email: string, password: string): Promise<AuthResult> {
  try {
    console.log('Authenticating teacher with email:', email);
    
    const { data, error } = await supabase.rpc('authenticate_teacher_by_email', {
      p_email: email.toLowerCase(),
      p_password: password
    });

    if (error) {
      console.error('RPC authentication error:', error);
      throw error;
    }

    console.log('Authentication RPC response:', data);
    
    if (!data) {
      return {
        success: false,
        message: 'No response from authentication service'
      };
    }

    return data as AuthResult;
  } catch (error) {
    console.error('Error authenticating teacher:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('teachers')
    .select('username, name');

  if (error) {
    console.error('Error getting teachers:', error);
    return [];
  }

  return data.map(teacher => ({
    username: teacher.username,
    name: teacher.name
  }));
}

export async function saveTeacher(teacher: Teacher): Promise<Teacher | null> {
  if (!teacher?.username?.trim() || !teacher?.name?.trim()) {
    console.error('Invalid teacher data:', teacher);
    return null;
  }

  const normalizedUsername = teacher.username.trim().toLowerCase();

  // Check if teacher already exists
  const existingTeacher = await getTeacher(normalizedUsername);
  if (existingTeacher) {
    return existingTeacher;
  }

  const { data, error } = await supabase
    .from('teachers')
    .insert([{
      username: normalizedUsername,
      name: teacher.name.trim()
    }])
    .select()
    .single();

  if (error) {
    console.error('Error saving teacher:', error);
    return null;
  }

  return {
    username: data.username,
    name: data.name
  };
}

export async function getTeacher(username: string): Promise<Teacher | null> {
  if (!username?.trim()) {
    console.warn('Username is required');
    return null;
  }

  const normalizedUsername = username.trim().toLowerCase();

  const { data, error } = await supabase
    .from('teachers')
    .select('username, name')
    .eq('username', normalizedUsername)
    .single();

  if (error) {
    console.error('Error getting teacher:', error);
    return null;
  }

  return {
    username: data.username,
    name: data.name
  };
}

export async function bulkImportTeachers(teachers: BulkImportTeacher[]): Promise<{
  success: boolean;
  total: number;
  successCount: number;
  errorCount: number;
  results: {
    success: boolean;
    username: string;
    message: string;
  }[];
}> {
  try {
    // Validate input
    if (!Array.isArray(teachers) || teachers.length === 0) {
      throw new Error('No teachers provided for import');
    }

    // Process each teacher individually
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const teacher of teachers) {
      try {
        // Find or create district
        let districtId = null;
        if (teacher.districtCode) {
          // Try to find existing district
          const { data: existingDistrict } = await supabase
            .from('school_districts')
            .select('id')
            .eq('code', teacher.districtCode)
            .maybeSingle();
            
          if (existingDistrict) {
            districtId = existingDistrict.id;
          } else {
            // Create new district
            const { data: newDistrict, error: districtError } = await supabase
              .from('school_districts')
              .insert({
                name: teacher.districtCode,
                code: teacher.districtCode
              })
              .select()
              .single();
              
            if (districtError) throw districtError;
            districtId = newDistrict.id;
          }
        }
        
        // Create teacher record
        const { error: teacherError } = await supabase
          .from('teachers')
          .insert({
            username: teacher.username.toLowerCase(),
            email: teacher.email.toLowerCase(),
            name: teacher.fullName,
            password_hash: teacher.password, // Will be hashed by database trigger
            temp_password: true,
            plaintext_password: teacher.password,
            account_status: 'active',
            district_id: districtId
          });
          
        if (teacherError) throw teacherError;
        
        results.push({
          success: true,
          username: teacher.username,
          message: 'Account created successfully'
        });
        successCount++;
      } catch (err) {
        results.push({
          success: false,
          username: teacher.username,
          message: err instanceof Error ? err.message : 'Failed to create account'
        });
        errorCount++;
      }
    }

    return {
      success: errorCount === 0,
      total: teachers.length,
      successCount,
      errorCount,
      results
    };
  } catch (error) {
    console.error('Error bulk importing teachers:', error);
    throw error;
  }
}
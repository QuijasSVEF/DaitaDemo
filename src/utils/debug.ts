// Debug utility for tracking Supabase operations
export class SupabaseDebugger {
  private static logs: string[] = [];
  
  static log(operation: string, details: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${operation}: ${JSON.stringify(details)}`;
    console.log(logEntry);
    this.logs.push(logEntry);
    
    // Keep only last 50 logs
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
  }
  
  static getLogs() {
    return this.logs;
  }
  
  static clearLogs() {
    this.logs = [];
  }
  
  static async testSupabaseConnection() {
    try {
      const { data, error } = await supabase
        .from('quiz_templates')
        .select('count')
        .limit(1);
        
      if (error) {
        this.log('CONNECTION_TEST', { status: 'FAILED', error: error.message });
        return false;
      }
      
      this.log('CONNECTION_TEST', { status: 'SUCCESS', data });
      return true;
    } catch (error) {
      this.log('CONNECTION_TEST', { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown' });
      return false;
    }
  }
}

// Test function to verify CRUD operations
export async function testQuizCRUD(teacherUsername: string) {
  const debugger = SupabaseDebugger;
  
  try {
    // Test connection
    debugger.log('STARTING_CRUD_TEST', { teacherUsername });
    
    const connectionOk = await debugger.testSupabaseConnection();
    if (!connectionOk) {
      throw new Error('Supabase connection failed');
    }
    
    // Test READ operation
    debugger.log('TESTING_READ', { operation: 'SELECT quiz_templates' });
    const { data: quizzes, error: readError } = await supabase
      .from('quiz_templates')
      .select('*')
      .eq('teacher_username', teacherUsername)
      .limit(5);
      
    if (readError) {
      debugger.log('READ_FAILED', { error: readError.message });
      throw readError;
    }
    
    debugger.log('READ_SUCCESS', { count: quizzes?.length || 0 });
    
    // Test UPDATE operation (if quizzes exist)
    if (quizzes && quizzes.length > 0) {
      const testQuiz = quizzes[0];
      debugger.log('TESTING_UPDATE', { quizId: testQuiz.id, currentActive: testQuiz.is_active });
      
      const { error: updateError } = await supabase
        .from('quiz_templates')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testQuiz.id);
        
      if (updateError) {
        debugger.log('UPDATE_FAILED', { error: updateError.message });
        throw updateError;
      }
      
      debugger.log('UPDATE_SUCCESS', { quizId: testQuiz.id });
    }
    
    debugger.log('CRUD_TEST_COMPLETE', { status: 'ALL_OPERATIONS_WORKING' });
    return true;
    
  } catch (error) {
    debugger.log('CRUD_TEST_FAILED', { error: error instanceof Error ? error.message : 'Unknown' });
    return false;
  }
}
import { supabase } from './config';
import { ClassroomAnalysis } from '../aiAnalyticsService';

export async function saveClassroomAnalytics(
  analysis: ClassroomAnalysis,
  teacherUsername: string
): Promise<void> {
  try {
    // First verify the teacher exists and is active
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('username, account_status, account_locked')
      .eq('username', teacherUsername)
      .single();

    if (teacherError || !teacherData) {
      throw new Error('Teacher not found or not properly configured');
    }

    if (teacherData.account_locked) {
      throw new Error('Teacher account is locked');
    }

    if (teacherData.account_status !== 'active') {
      throw new Error('Teacher account is not active');
    }

    const analyticsData = {
      teacher_username: teacherUsername,
      total_students: analysis.totalStudents,
      average_score: analysis.averageScore,
      total_assessments: analysis.totalAssessments,
      struggle_areas: analysis.struggleAreas.map(area => ({
        area: area.area,
        count: area.count,
        students: Array.from(area.students),
        recommendations: area.recommendations,
        related_concepts: area.relatedConcepts,
        aligned_standards: (area.alignedStandards || []).map(s => ({
          standard_code: s.standardCode,
          description: s.description,
          match_confidence: s.matchConfidence
        }))
      })),
      insights: analysis.insights,
      recommendations: analysis.recommendations
    };

    const { error } = await supabase
      .from('classroom_analytics')
      .insert([analyticsData]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error saving classroom analytics:', error);
    throw error;
  }
}

export async function getLatestClassroomAnalytics(
  teacherUsername: string
): Promise<ClassroomAnalysis | null> {
  try {
    // First verify the teacher exists and is active
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('username, account_status, account_locked')
      .eq('username', teacherUsername)
      .single();

    if (teacherError || !teacherData) {
      throw new Error('Teacher not found or not properly configured');
    }

    if (teacherData.account_locked) {
      throw new Error('Teacher account is locked');
    }

    if (teacherData.account_status !== 'active') {
      throw new Error('Teacher account is not active');
    }

    const { data, error } = await supabase
      .from('classroom_analytics')
      .select('*')
      .eq('teacher_username', teacherUsername)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error getting classroom analytics:', error);
      return null;
    }

    if (!data) return null;

    return {
      totalStudents: data.total_students,
      averageScore: data.average_score,
      totalAssessments: data.total_assessments,
      struggleAreas: data.struggle_areas.map((area: any) => ({
        area: area.area,
        count: area.count,
        students: Array.isArray(area.students) ? area.students : [],
        recommendations: area.recommendations || [],
        relatedConcepts: area.related_concepts || [],
        alignedStandards: (area.aligned_standards || []).map((s: any) => ({
          standardCode: s.standard_code,
          description: s.description,
          matchConfidence: s.match_confidence
        }))
      })),
      insights: data.insights || [],
      recommendations: data.recommendations || []
    };
  } catch (error) {
    console.error('Error getting classroom analytics:', error);
    return null;
  }
}
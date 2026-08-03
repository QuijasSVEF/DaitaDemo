import { supabase } from './config';

export interface Standard {
  standardCode: string;
  standard_code: string;
  description: string;
  domain: string;
  cluster: string;
}

export async function getStandardsByGrade(gradeLevels: string[]): Promise<Standard[]> {
  try {
    const { data, error } = await supabase
      .from('ca_standards')
      .select('standard_code, description, domain, cluster')
      .in('grade_level', gradeLevels)
      .order('standard_code');

    if (error) {
      console.error('Error fetching standards:', error);
      return [];
    }

    return data.map(standard => ({
      standardCode: standard.standard_code,
      standard_code: standard.standard_code,
      description: standard.description,
      domain: standard.domain,
      cluster: standard.cluster
    }));
  } catch (error) {
    console.error('Error fetching standards:', error);
    return [];
  }
}

export async function generateDOKLessonPlan(
  gradeLevel: string,
  standardCode: string | null,
  struggleAreas: string[]
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('generate_dok_lesson_plan', {
      p_grade_level: gradeLevel,
      p_standard_code: standardCode,
      p_struggle_areas: struggleAreas
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error generating DOK lesson plan:', error);
    return null;
  }
}
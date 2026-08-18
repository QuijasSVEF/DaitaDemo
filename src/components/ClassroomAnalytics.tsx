import React, { useState, useEffect } from 'react';
import { BarChart2, AlertTriangle, Loader2, ClipboardList, Table2 } from 'lucide-react';
import { ExitTicketResult, Student } from '../types';
import { WeekSelector } from './analytics/WeekSelector';
import { getAllWeeks } from '../utils/dateUtils';
import { useAnalytics } from '../hooks/useAnalytics';
import { AnalyticsOverview } from './analytics/AnalyticsOverview';
import { StruggleAreas } from './analytics/StruggleAreas';
import { Insights } from './analytics/Insights';
import { AssessmentAnalysis } from './analytics/AssessmentAnalysis';
import { GradebookView } from './analytics/GradebookView';
import { useQuery } from '@tanstack/react-query';
import { getStandardsByGrade } from '../services/supabase/standards';
import { StandardsAlignment } from './analytics/StandardsAlignment';
import { supabase } from '../services/supabase/config';
import { useQueryClient } from '@tanstack/react-query';
import { RegenerateButton } from './analytics/RegenerateButton';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { cn } from '../utils/cn';

interface Props {
  exitTickets: ExitTicketResult[];
  students: Student[];
  teacherUsername: string;
  shouldUpdate: boolean;
  onUpdateComplete: () => void;
}

export function ClassroomAnalytics({ 
  exitTickets, 
  students, 
  teacherUsername,
  shouldUpdate,
  onUpdateComplete 
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'assessment' | 'gradebook'>('overview');
  const [selectedWeek, setSelectedWeek] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [forceUpdate, setForceUpdate] = useState(false);
  const queryClient = useQueryClient();
  const weeks = getAllWeeks(exitTickets);

  // Set up real-time updates for analytics
  useRealTimeUpdates({
    teacherUsername,
    onAssessmentCompleted: () => {
      console.log('🔔 Analytics: New assessment completed, updating analytics');
      setForceUpdate(true);
    },
    onLessonPlanGenerated: () => {
      console.log('🔔 Analytics: Lesson plan generated, refreshing data');
      setForceUpdate(true);
    }
  });

  // Get unique grade levels from students
  const gradeLevels = [...new Set(students.map(s => s.gradeLevel))];
  
  // Fetch districts
  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_districts')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
  
  // Fetch standards for all relevant grade levels
  const { data: standards = [] } = useQuery({
    queryKey: ['standards', gradeLevels],
    queryFn: () => getStandardsByGrade(gradeLevels)
  });
  
  const { analysis, isLoading, error, regenerateAnalytics } = useAnalytics(
    students,
    exitTickets,
    teacherUsername,
    selectedWeek,
    selectedDistrict,
    shouldUpdate || forceUpdate
  );

  // Add debug logging
  useEffect(() => {
    console.log('ClassroomAnalytics state:', {
      teacherUsername,
      studentsCount: students.length,
      exitTicketsCount: exitTickets.length,
      isLoading,
      error,
      analysis: !!analysis
    });
  }, [teacherUsername, students, exitTickets, isLoading, error, analysis]);

  useEffect(() => {
    if (analysis && (shouldUpdate || forceUpdate)) {
      onUpdateComplete();
      
      // Invalidate related queries to ensure data is fresh
      queryClient.invalidateQueries(['classroomAnalytics']);
      queryClient.invalidateQueries(['weeklyGroups']);
      
      setForceUpdate(false);
    }
  }, [analysis, shouldUpdate, forceUpdate]);

  const handleRegenerate = async () => {
    setForceUpdate(true);
    await regenerateAnalytics();
    
    // Invalidate related queries
    await Promise.all([
      queryClient.invalidateQueries(['classroomAnalytics']),
      queryClient.invalidateQueries(['weeklyGroups']),
      queryClient.invalidateQueries(['teacherStudents']),
      queryClient.invalidateQueries(['teacherExitTickets']),
      queryClient.invalidateQueries(['teacherLessonPlans'])
    ]);
    
    console.log('Analytics regenerated and queries invalidated');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-svef-purple animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-svef-gray">No analytics available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="font-oswald text-2xl font-medium text-svef-gray">
              Classroom Overview
            </h2>
            <RegenerateButton
              onClick={handleRegenerate}
              isLoading={isLoading || forceUpdate}
            />
          </div>
          <WeekSelector
            districts={districts}
            selectedDistrict={selectedDistrict}
            selectedWeek={selectedWeek}
            weeks={weeks}
            onWeekChange={setSelectedWeek}
            onDistrictChange={setSelectedDistrict}
          />
        </div>
        <p className="text-svef-gray">
          {selectedWeek === 'all'
            ? 'Overall classroom analytics and insights'
            : `Analytics for week of ${new Date(selectedWeek).toLocaleDateString()}`
          }
          {selectedDistrict !== 'all' &&
            ` • District: ${districts.find(d => d.id === selectedDistrict)?.name || ''}`
          }
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors',
              activeTab === 'overview'
                ? 'border-svef-purple text-svef-purple'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <BarChart2 className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={cn(
              'flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors',
              activeTab === 'assessment'
                ? 'border-svef-purple text-svef-purple'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Assessment Analysis
          </button>
          <button
            onClick={() => setActiveTab('gradebook')}
            className={cn(
              'flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors',
              activeTab === 'gradebook'
                ? 'border-svef-purple text-svef-purple'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Table2 className="w-4 h-4" />
            Gradebook
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <>
          <AnalyticsOverview
            analysis={analysis}
            selectedWeek={selectedWeek}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StruggleAreas
              struggleAreas={analysis.struggleAreas}
              totalStudents={analysis.totalStudents}
            />
            <StandardsAlignment
              struggleAreas={analysis.struggleAreas}
            />
            <Insights
              insights={analysis.insights}
              recommendations={analysis.recommendations}
            />
          </div>
        </>
      )}

      {activeTab === 'assessment' && (
        <AssessmentAnalysis teacherUsername={teacherUsername} />
      )}

      {activeTab === 'gradebook' && (
        <GradebookView teacherUsername={teacherUsername} />
      )}
    </div>
  );
}
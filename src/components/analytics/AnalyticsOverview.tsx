import React from 'react';
import { Users, BarChart2, TrendingUp } from 'lucide-react';
import { ClassroomAnalysis } from '../../services/aiAnalyticsService';

interface Props {
  analysis: ClassroomAnalysis;
  selectedWeek: string;
}

export function AnalyticsOverview({ analysis, selectedWeek }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-6 h-6 text-svef-purple" />
          <h3 className="font-medium text-svef-gray">Student Participation</h3>
        </div>
        <p className="text-3xl font-oswald text-svef-purple mb-2">
          {analysis.totalStudents}
        </p>
        <p className="text-sm text-svef-gray">
          {selectedWeek === 'all' 
            ? 'Total students in class'
            : 'Students with assessments this week'
          }
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart2 className="w-6 h-6 text-svef-purple" />
          <h3 className="font-medium text-svef-gray">Class Average</h3>
        </div>
        <p className="text-3xl font-oswald text-svef-purple mb-2">
          {analysis.averageScore.toFixed(1)}%
        </p>
        <p className="text-sm text-svef-gray">Average assessment score</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-6 h-6 text-svef-purple" />
          <h3 className="font-medium text-svef-gray">Assessments</h3>
        </div>
        <p className="text-3xl font-oswald text-svef-purple mb-2">
          {analysis.totalAssessments}
        </p>
        <p className="text-sm text-svef-gray">
          {selectedWeek === 'all' 
            ? 'Total assessments completed'
            : 'Assessments completed this week'
          }
        </p>
      </div>
    </div>
  );
}
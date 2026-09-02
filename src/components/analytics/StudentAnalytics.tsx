import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';
import { StudentAnalytics as StudentAnalyticsType } from '../../types';
import { cn } from '../../utils/cn';

interface Props {
  analytics: StudentAnalyticsType;
}

export function StudentAnalytics({ analytics }: Props) {
  const getTrendIcon = () => {
    switch (analytics.progressTrend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-6">
        <BarChart2 className="w-6 h-6 text-svef-purple" />
        <h3 className="font-oswald text-xl font-medium text-svef-gray">Student Performance Analytics</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-md p-4">
          <p className="font-open-sans text-sm text-svef-gray mb-1">Average Score</p>
          <p className="font-oswald text-2xl text-svef-purple">
            {analytics.averageScore.toFixed(1)}%
          </p>
        </div>

        <div className="bg-gray-50 rounded-md p-4">
          <p className="font-open-sans text-sm text-svef-gray mb-1">Total Assessments</p>
          <p className="font-oswald text-2xl text-svef-purple">
            {analytics.totalAssessments}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-open-sans text-sm font-medium text-svef-gray">Progress Trend</p>
            {getTrendIcon()}
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="font-roboto text-sm capitalize">{analytics.progressTrend}</p>
          </div>
        </div>

        <div>
          <p className="font-open-sans text-sm font-medium text-svef-gray mb-2">Common Struggles</p>
          <ul className="bg-gray-50 rounded-md p-3 space-y-2">
            {analytics.commonStruggles.map((struggle, index) => (
              <li key={index} className="font-roboto text-sm flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-svef-purple"></span>
                <span>{struggle}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
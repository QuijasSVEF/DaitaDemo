import React from 'react';
import { Lightbulb, BookOpen } from 'lucide-react';
import { ClassroomAnalysis } from '../../services/aiAnalyticsService';

interface Props {
  insights: ClassroomAnalysis['insights'];
  recommendations: ClassroomAnalysis['recommendations'];
}

export function Insights({ insights, recommendations }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Lightbulb className="w-6 h-6 text-svef-purple" />
          <h3 className="font-oswald text-xl font-medium text-svef-gray">
            Key Insights
          </h3>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <p key={index} className="text-sm text-svef-gray flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-svef-purple mt-2 flex-shrink-0" />
              <span>{insight}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="w-6 h-6 text-svef-purple" />
          <h3 className="font-oswald text-xl font-medium text-svef-gray">
            Teaching Recommendations
          </h3>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <p key={index} className="text-sm text-svef-gray flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-svef-purple mt-2 flex-shrink-0" />
              <span>{rec}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
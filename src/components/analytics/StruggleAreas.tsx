import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ClassroomAnalysis } from '../../services/aiAnalyticsService';

interface Props {
  struggleAreas: ClassroomAnalysis['struggleAreas'];
  totalStudents: number;
}

export function StruggleAreas({ struggleAreas, totalStudents }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-6">
        <AlertTriangle className="w-6 h-6 text-svef-purple" />
        <h3 className="font-oswald text-xl font-medium text-svef-gray">
          Common Struggle Areas
        </h3>
      </div>

      <div className="space-y-6">
        {struggleAreas.map((area, index) => (
          <div key={index} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-svef-gray">{area.area}</h4>
              <span className="text-sm text-svef-purple">
                {area.students.length} students
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
              <div
                className="bg-svef-purple rounded-full h-2"
                style={{
                  width: `${(area.students.length / totalStudents) * 100}%`
                }}
              />
            </div>
            <div className="space-y-2">
              {area.recommendations.map((rec, i) => (
                <p key={i} className="text-sm text-svef-gray flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-svef-purple mt-2 flex-shrink-0" />
                  <span>{rec}</span>
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import React from 'react';
import { BookOpen, ChevronDown, AlertCircle } from 'lucide-react';
import { ClassroomAnalysis } from '../../services/aiAnalyticsService';
import { cn } from '../../utils/cn';

interface Props {
  struggleAreas: ClassroomAnalysis['struggleAreas'];
}

export function StandardsAlignment({ struggleAreas = [] }: Props) {
  const hasStandards = struggleAreas.some(area => 
    area.alignedStandards && area.alignedStandards.length > 0
  );

  if (!struggleAreas.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="w-6 h-6 text-svef-purple" />
          <h3 className="font-oswald text-xl font-medium text-svef-gray">
            Standards Alignment
          </h3>
        </div>
        <div className="text-center text-svef-gray">
          <p>No struggle areas identified yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-6">
        <BookOpen className="w-6 h-6 text-svef-purple" />
        <h3 className="font-oswald text-xl font-medium text-svef-gray">
          Standards Alignment
        </h3>
      </div>

      {!hasStandards && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center text-yellow-700">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>No standards have been aligned to these struggle areas yet.</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {struggleAreas.map((area, index) => (
          <div key={`area-${index}`} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-svef-gray">{area.area}</h4>
                {area.alignedStandards?.length > 0 && (
                  <p className="text-sm text-svef-gray mt-1">
                    {area.alignedStandards.length} aligned standards
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className={cn(
                "rounded-lg p-4",
                area.alignedStandards?.length ? "bg-svef-beige/20" : "bg-gray-50"
              )}>
                <h5 className="text-sm font-medium text-svef-gray mb-3">
                  Aligned California Math Standards
                </h5>
                {area.alignedStandards && area.alignedStandards.length > 0 ? (
                  <div className="space-y-3">
                    {area.alignedStandards
                      .sort((a, b) => (b.matchConfidence || 0) - (a.matchConfidence || 0))
                      .map((standard, idx) => (
                        <div key={`standard-${index}-${idx}`} className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-svef-purple">
                                {standard.standardCode}
                              </span>
                              <span className="px-2 py-0.5 bg-svef-purple/10 text-xs rounded-md">
                                {Math.round((standard.matchConfidence || 0) * 100)}% match
                              </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-svef-gray" />
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-svef-gray">
                              {standard.description}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-svef-gray">
                    Standards alignment in progress for {area.area}.
                  </p>
                )}
              </div>

              {area.recommendations && area.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-svef-gray">
                    Standards-Based Teaching Recommendations
                  </h5>
                  {area.recommendations.map((rec, i) => (
                    <p key={`rec-${index}-${i}`} className="text-sm text-svef-gray flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-svef-purple mt-2 flex-shrink-0" />
                      <span>{rec}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
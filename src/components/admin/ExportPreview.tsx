import React from 'react';
import { Database, AlertTriangle, FileSpreadsheet, Eye } from 'lucide-react';
import type { ExportCounts } from '../../services/supabase/dataExport';
import { cn } from '../../utils/cn';

interface Props {
  counts: ExportCounts | null;
  isLoadingCounts: boolean;
  selectedSheets: string[];
  previewData: Record<string, Record<string, any>[]> | null;
  previewSheet: string | null;
  onPreviewSheet: (sheet: string) => void;
  onClosePreview: () => void;
}

const SHEET_COUNT_MAP: { sheet: string; countKey: keyof ExportCounts; label: string }[] = [
  { sheet: 'Quiz Attempts (Raw)', countKey: 'quizAttempts', label: 'quiz attempts' },
  { sheet: 'Student Confidence Logs', countKey: 'confidenceLogs', label: 'confidence logs' },
  { sheet: 'Lesson Plans', countKey: 'lessonPlans', label: 'lesson plans' },
  { sheet: 'Weekly Groups', countKey: 'weeklyGroups', label: 'weekly groups' },
  { sheet: 'Classroom Analytics', countKey: 'classroomAnalytics', label: 'analytics snapshots' },
  { sheet: 'Mentor Sessions', countKey: 'mentorSessions', label: 'mentor sessions' },
  { sheet: 'Teacher Activity', countKey: 'teachers', label: 'teachers' },
];

export function ExportPreviewPanel({
  counts,
  isLoadingCounts,
  selectedSheets,
  previewData,
  previewSheet,
  onPreviewSheet,
  onClosePreview,
}: Props) {
  if (isLoadingCounts) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-svef-purple" />
        <span className="ml-3 text-sm text-gray-500">Counting records...</span>
      </div>
    );
  }

  if (!counts) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Database className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Select filters and sheets to see a summary</p>
      </div>
    );
  }

  const activeSheets = SHEET_COUNT_MAP.filter(s => selectedSheets.includes(s.sheet));
  const totalRows = activeSheets.reduce((sum, s) => {
    let count = counts[s.countKey];
    if (s.sheet === 'Quiz Attempts (Raw)') count = counts.rawAnswers || counts.quizAttempts;
    return sum + count;
  }, 0);

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSpreadsheet className="w-4 h-4 text-svef-purple" />
          <h3 className="text-sm font-semibold text-gray-700">Export Summary</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-xl font-semibold text-svef-purple">{counts.teachers}</p>
            <p className="text-xs text-gray-500">teachers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-svef-purple">{counts.students}</p>
            <p className="text-xs text-gray-500">students</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-svef-purple">{totalRows.toLocaleString()}</p>
            <p className="text-xs text-gray-500">total rows</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {activeSheets.map(s => {
          let count = counts[s.countKey];
          if (s.sheet === 'Quiz Attempts (Raw)') count = counts.rawAnswers || counts.quizAttempts;
          const isEmpty = count === 0;
          return (
            <div
              key={s.sheet}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-sm border',
                isEmpty ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isEmpty && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                <span className={cn('truncate', isEmpty ? 'text-amber-700' : 'text-gray-700')}>
                  {s.sheet}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('text-xs font-medium', isEmpty ? 'text-amber-600' : 'text-gray-500')}>
                  {count.toLocaleString()} {s.label}
                </span>
                {count > 0 && (
                  <button
                    onClick={() => onPreviewSheet(s.sheet)}
                    className="text-svef-purple hover:text-svef-purple/80 transition-colors"
                    title="Preview first 5 rows"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSheets.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <p className="text-sm">Select at least one data sheet to export</p>
        </div>
      )}

      {previewSheet && previewData && previewData[previewSheet] && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">
              Preview: {previewSheet} (first 5 rows)
            </h4>
            <button
              onClick={onClosePreview}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="text-xs w-full">
              <thead>
                <tr className="bg-gray-50">
                  {Object.keys(previewData[previewSheet][0] || {}).map(col => (
                    <th key={col} className="px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap border-b border-gray-200">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData[previewSheet].slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-2 py-1.5 text-gray-600 whitespace-nowrap max-w-[200px] truncate">
                        {String(val ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

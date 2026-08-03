import React, { useState, useCallback, useEffect } from 'react';
import { Download, ShieldCheck, Loader2, RefreshCw, ShieldOff, Database, Users } from 'lucide-react';
import { ExportFilterPanel, ALL_SHEETS } from './ExportFilters';
import { ExportPreviewPanel } from './ExportPreview';
import { ContactSheetExport } from './ContactSheetExport';
import {
  type ExportFilters,
  type ExportCounts,
  fetchExportCounts,
  fetchQuizAttemptsRaw,
  fetchLessonPlans,
  fetchWeeklyGroups,
  fetchClassroomAnalytics,
  fetchMentorSessions,
  fetchTeacherActivity,
  fetchTeacherUsage,
  fetchMentorUsage,
  fetchMentorSessionsDetailed,
  fetchSessionAttendance,
  fetchStudentRoster,
  fetchStudentSessionInstances,
  fetchStudentTutorSessions,
  fetchStudentTutorSessionsIndividual,
  fetchStudentAssessmentInstances,
  fetchStudentGrowth,
  fetchStudentConfidenceLogs,
} from '../../services/supabase/dataExport';
import { buildDataDictionary, exportToXlsx, exportToCsvZip, type SheetData } from '../../utils/exportUtils';
import { cn } from '../../utils/cn';
import { getExcludeTestData, setExcludeTestData } from '../../constants/testUsers';

type FetchFn = (filters: ExportFilters) => Promise<Record<string, any>[]>;

const SHEET_FETCHERS: Record<string, FetchFn> = {
  'Student Roster': fetchStudentRoster,
  'Student Sessions (Instances)': fetchStudentSessionInstances,
  'Student Tutor Sessions': fetchStudentTutorSessions,
  'Student Tutor Sessions (Individual)': fetchStudentTutorSessionsIndividual,
  'Student Assessments (Instances)': fetchStudentAssessmentInstances,
  'Student Confidence Logs': fetchStudentConfidenceLogs,
  'Student Growth': fetchStudentGrowth,
  'Teacher Usage': fetchTeacherUsage,
  'Mentor Usage': fetchMentorUsage,
  'Mentor Sessions (Detailed)': fetchMentorSessionsDetailed,
  'Session Attendance': fetchSessionAttendance,
  'Quiz Attempts (Raw)': fetchQuizAttemptsRaw,
  'Lesson Plans': fetchLessonPlans,
  'Weekly Groups': fetchWeeklyGroups,
  'Classroom Analytics': fetchClassroomAnalytics,
  'Mentor Sessions': fetchMentorSessions,
  'Teacher Activity': fetchTeacherActivity,
};

export function DataExport() {
  const [activeTab, setActiveTab] = useState<'research' | 'contacts'>('research');
  const [excludeTest, setExcludeTest] = useState<boolean>(getExcludeTestData());
  const [filters, setFilters] = useState<ExportFilters>({
    districtIds: [],
    teacherUsernames: [],
    dateFrom: null,
    dateTo: null,
    gradeLevel: null,
    subject: null,
    excludeTestData: getExcludeTestData(),
  });
  const [selectedSheets, setSelectedSheets] = useState<string[]>([...ALL_SHEETS]);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [counts, setCounts] = useState<ExportCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, Record<string, any>[]> | null>(null);
  const [previewSheet, setPreviewSheet] = useState<string | null>(null);

  const toggleExcludeTest = () => {
    const next = !excludeTest;
    setExcludeTest(next);
    setExcludeTestData(next);
    setFilters(prev => ({ ...prev, excludeTestData: next }));
  };

  const loadCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      const result = await fetchExportCounts(filters);
      setCounts(result);
    } catch (err) {
      console.error('Failed to load counts:', err);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const handlePreview = async (sheet: string) => {
    const fetcher = SHEET_FETCHERS[sheet];
    if (!fetcher) return;
    try {
      const data = await fetcher(filters);
      setPreviewData(prev => ({ ...prev, [sheet]: data.slice(0, 5) }));
      setPreviewSheet(sheet);
    } catch (err) {
      console.error('Preview failed:', err);
    }
  };

  const handleExport = async () => {
    if (selectedSheets.length === 0) return;
    setIsExporting(true);

    try {
      const sheets: SheetData[] = [];

      const dictData = buildDataDictionary(selectedSheets, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        districts: filters.districtIds,
      });
      sheets.push({ name: 'Data Dictionary', data: dictData });

      for (const sheetName of selectedSheets) {
        setExportProgress(`Fetching ${sheetName}...`);
        const fetcher = SHEET_FETCHERS[sheetName];
        if (!fetcher) continue;
        const data = await fetcher(filters);
        sheets.push({ name: sheetName, data });
      }

      setExportProgress('Generating file...');
      const dateStr = new Date().toISOString().split('T')[0];
      const districtLabel = filters.districtIds.length > 0 ? 'filtered' : 'all';

      if (exportFormat === 'xlsx') {
        exportToXlsx(sheets, `daita-research-export-${districtLabel}-${dateStr}.xlsx`);
      } else {
        await exportToCsvZip(sheets, `daita-research-export-${districtLabel}-${dateStr}.zip`);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const hasData = counts && selectedSheets.length > 0;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-oswald font-medium text-svef-gray">Data Export</h2>
          <p className="text-sm text-gray-500 mt-1">
            Export research-ready data packages with raw student answers
          </p>
        </div>
        {activeTab === 'research' && (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleExcludeTest}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                excludeTest
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              )}
            >
              <ShieldOff className="w-3.5 h-3.5" />
              {excludeTest ? 'Test Data Excluded' : 'Exclude Test Data'}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !hasData}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all',
                hasData && !isExporting
                  ? 'bg-svef-purple text-white hover:bg-svef-purple/90 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {exportProgress || 'Exporting...'}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {exportFormat === 'xlsx' ? 'Excel' : 'CSV'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('research')}
            className={cn(
              "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors",
              activeTab === 'research'
                ? "border-svef-purple text-svef-purple"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Database className="w-4 h-4" />
            Research Data
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={cn(
              "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors",
              activeTab === 'contacts'
                ? "border-svef-purple text-svef-purple"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Users className="w-4 h-4" />
            Contact Sheet
          </button>
        </nav>
      </div>

      {activeTab === 'contacts' ? (
        <ContactSheetExport />
      ) : (
        <>
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-teal-800">
              <span className="font-medium">Privacy Notice:</span> Exports include student first name, last initial, and
              chosen login emoji so program staff can match records to Salesforce and other rosters. Student last names,
              email addresses, IP addresses, and all authentication data are excluded. Handle exports as confidential.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-800">Filters</h3>
                  <button
                    onClick={loadCounts}
                    disabled={isLoadingCounts}
                    className="text-xs text-svef-purple hover:text-svef-purple/80 flex items-center gap-1"
                  >
                    <RefreshCw className={cn('w-3 h-3', isLoadingCounts && 'animate-spin')} />
                    Refresh
                  </button>
                </div>
                <ExportFilterPanel
                  filters={filters}
                  selectedSheets={selectedSheets}
                  exportFormat={exportFormat}
                  onFiltersChange={setFilters}
                  onSheetsChange={setSelectedSheets}
                  onFormatChange={setExportFormat}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <ExportPreviewPanel
                  counts={counts}
                  isLoadingCounts={isLoadingCounts}
                  selectedSheets={selectedSheets}
                  previewData={previewData}
                  previewSheet={previewSheet}
                  onPreviewSheet={handlePreview}
                  onClosePreview={() => setPreviewSheet(null)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

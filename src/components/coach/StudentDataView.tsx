import React, { useState, useEffect } from 'react';
import {
  BookOpen, TrendingUp, TrendingDown, Minus, ChevronDown,
  ChevronRight, AlertTriangle, Download
} from 'lucide-react';
import { CoachTeacher, TeacherStudentData, getTeacherStudentData } from '../../services/supabase/coachData';
import * as XLSX from 'xlsx';

interface Props {
  teachers: CoachTeacher[];
  onSelectTeacher: (username: string) => void;
}

export function StudentDataView({ teachers, onSelectTeacher }: Props) {
  const [selectedTeacher, setSelectedTeacher] = useState<string>(teachers[0]?.username || '');
  const [students, setStudents] = useState<TeacherStudentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'heatmap'>('table');

  useEffect(() => {
    if (selectedTeacher) loadStudents(selectedTeacher);
  }, [selectedTeacher]);

  const loadStudents = async (username: string) => {
    setIsLoading(true);
    try {
      const data = await getTeacherStudentData(username);
      setStudents(data);
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const allStruggles = students.flatMap(s => s.struggledAreas);
  const struggleCounts = allStruggles.reduce((acc, area) => {
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topStruggles = Object.entries(struggleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const avgClassScore = students.length > 0
    ? Math.round(students.reduce((s, st) => s + st.avgScore, 0) / students.length)
    : 0;

  const trendingUp = students.filter(s => s.trend === 'up').length;
  const trendingDown = students.filter(s => s.trend === 'down').length;
  const notAssessed = students.filter(s => s.totalExitTickets === 0).length;

  const handleExportStudentData = () => {
    if (students.length === 0) return;
    const currentTeacher = teachers.find(t => t.username === selectedTeacher);
    const workbook = XLSX.utils.book_new();

    const studentRows = students.map(s => ({
      student_name: s.studentName,
      student_id: s.studentId,
      grade_level: s.gradeLevel,
      subject: s.subject,
      teacher_username: selectedTeacher,
      teacher_name: currentTeacher?.name || '',
      avg_score: s.avgScore,
      recent_score: s.recentScore ?? '',
      trend: s.trend,
      total_exit_tickets: s.totalExitTickets,
      struggled_areas: s.struggledAreas.join('; '),
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(studentRows), 'Student Scores');

    const summaryRows = teachers.map(t => {
      const tStudents = t.username === selectedTeacher ? students : [];
      return {
        teacher_username: t.username,
        teacher_name: t.name,
        student_count: t.studentCount,
        class_avg: t.username === selectedTeacher ? avgClassScore : '',
        growing: t.username === selectedTeacher ? trendingUp : '',
        declining: t.username === selectedTeacher ? trendingDown : '',
        top_struggles: t.username === selectedTeacher ? topStruggles.map(([a]) => a).join('; ') : '',
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Class Summary');

    XLSX.writeFile(workbook, `student-data-${selectedTeacher}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-oswald font-medium text-gray-800">Student Learning Data</h1>
          <p className="text-sm text-gray-500 mt-1">Standards, mastery, and growth across your assigned classrooms</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTeacher}
            onChange={e => setSelectedTeacher(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            {teachers.map(t => (
              <option key={t.username} value={t.username}>{t.name}</option>
            ))}
          </select>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${viewMode === 'heatmap' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
            >
              Heatmap
            </button>
          </div>
          <button
            onClick={handleExportStudentData}
            disabled={students.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Class Average</p>
          <p className={`text-2xl font-semibold ${avgClassScore >= 70 ? 'text-emerald-600' : avgClassScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {avgClassScore}%
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Growing</p>
          <p className="text-2xl font-semibold text-emerald-600">{trendingUp}</p>
          <p className="text-xs text-gray-400">students trending up</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Declining</p>
          <p className="text-2xl font-semibold text-red-600">{trendingDown}</p>
          <p className="text-xs text-gray-400">students trending down</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Not Assessed</p>
          <p className="text-2xl font-semibold text-gray-400">{notAssessed}</p>
          <p className="text-xs text-gray-400">of {students.length} students</p>
        </div>
      </div>

      {topStruggles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-800 mb-3">Top Struggle Areas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {topStruggles.map(([area, count]) => (
              <div key={area} className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-red-700 truncate" title={area}>{area}</p>
                <p className="text-lg font-semibold text-red-600 mt-1">{count}</p>
                <p className="text-xs text-red-400">students</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {students.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No students found for this teacher</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Grade</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Avg Score</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Recent</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Trend</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Assessments</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Needs Work</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students
                    .sort((a, b) => a.avgScore - b.avgScore)
                    .map(s => (
                      <tr key={s.studentId} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            {s.studentName}
                            {s.trend === 'down' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{s.gradeLevel}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            s.avgScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            s.avgScore >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>{s.avgScore}%</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {s.recentScore !== null ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              s.recentScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              s.recentScore >= 60 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>{s.recentScore}%</span>
                          ) : <span className="text-gray-300">--</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {s.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto" />}
                          {s.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />}
                          {s.trend === 'flat' && <Minus className="w-4 h-4 text-gray-400 mx-auto" />}
                        </td>
                        <td className="px-5 py-3 text-center text-gray-600">{s.totalExitTickets}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {s.struggledAreas.slice(0, 3).map(area => (
                              <span key={area} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                                {area}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-800 mb-4">Score Heatmap by Student</h3>
          {students.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data</p>
          ) : (
            <div className="space-y-2">
              {students.sort((a, b) => a.avgScore - b.avgScore).map(s => (
                <div key={s.studentId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 flex-shrink-0 truncate font-medium" title={s.studentName}>{s.studentName}</span>
                  <div className="flex-1 h-8 rounded overflow-hidden bg-gray-100 relative">
                    <div
                      className={`h-full transition-all ${
                        s.avgScore >= 80 ? 'bg-emerald-400' :
                        s.avgScore >= 60 ? 'bg-amber-400' :
                        s.avgScore >= 40 ? 'bg-orange-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${s.avgScore}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                      {s.avgScore}%
                    </span>
                  </div>
                  <div className="w-6 flex-shrink-0">
                    {s.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                    {s.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                    {s.trend === 'flat' && <Minus className="w-3.5 h-3.5 text-gray-300" />}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">Legend:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-gray-500">80%+</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400" /><span className="text-xs text-gray-500">60-79%</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-400" /><span className="text-xs text-gray-500">40-59%</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-gray-500">&lt;40%</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

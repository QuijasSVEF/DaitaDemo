import React, { useState, useEffect } from 'react';
import { Building2, Users, Calendar, BookOpen, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ExportFilters as ExportFiltersType } from '../../services/supabase/dataExport';
import { fetchFilterOptions, fetchTeachersForFilter } from '../../services/supabase/dataExport';

export const ALL_SHEETS = [
  'Student Roster',
  'Student Sessions (Instances)',
  'Student Tutor Sessions',
  'Student Tutor Sessions (Individual)',
  'Student Assessments (Instances)',
  'Student Confidence Logs',
  'Student Growth',
  'Teacher Usage',
  'Mentor Usage',
  'Mentor Sessions (Detailed)',
  'Session Attendance',
  'Quiz Attempts (Raw)',
  'Lesson Plans',
  'Weekly Groups',
  'Classroom Analytics',
  'Mentor Sessions',
  'Teacher Activity',
] as const;

interface Props {
  filters: ExportFiltersType;
  selectedSheets: string[];
  exportFormat: 'xlsx' | 'csv';
  onFiltersChange: (filters: ExportFiltersType) => void;
  onSheetsChange: (sheets: string[]) => void;
  onFormatChange: (format: 'xlsx' | 'csv') => void;
}

export function ExportFilterPanel({
  filters,
  selectedSheets,
  exportFormat,
  onFiltersChange,
  onSheetsChange,
  onFormatChange,
}: Props) {
  const [districts, setDistricts] = useState<{ id: string; name: string; code: string }[]>([]);
  const [teachers, setTeachers] = useState<{ username: string; name: string }[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [showTeachers, setShowTeachers] = useState(false);

  useEffect(() => {
    fetchFilterOptions().then(opts => {
      setDistricts(opts.districts);
      setGrades(opts.grades);
      setSubjects(opts.subjects);
    });
  }, []);

  useEffect(() => {
    fetchTeachersForFilter(filters.districtIds).then(setTeachers);
  }, [filters.districtIds]);

  const toggleSheet = (sheet: string) => {
    if (selectedSheets.includes(sheet)) {
      onSheetsChange(selectedSheets.filter(s => s !== sheet));
    } else {
      onSheetsChange([...selectedSheets, sheet]);
    }
  };

  const toggleAllSheets = () => {
    if (selectedSheets.length === ALL_SHEETS.length) {
      onSheetsChange([]);
    } else {
      onSheetsChange([...ALL_SHEETS]);
    }
  };

  const toggleDistrict = (id: string) => {
    const next = filters.districtIds.includes(id)
      ? filters.districtIds.filter(d => d !== id)
      : [...filters.districtIds, id];
    onFiltersChange({ ...filters, districtIds: next, teacherUsernames: [] });
  };

  const toggleTeacher = (username: string) => {
    const next = filters.teacherUsernames.includes(username)
      ? filters.teacherUsernames.filter(u => u !== username)
      : [...filters.teacherUsernames, username];
    onFiltersChange({ ...filters, teacherUsernames: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-svef-gray" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">District</h3>
        </div>
        <div className="space-y-1.5">
          {districts.length === 0 && (
            <p className="text-xs text-gray-400">No districts found</p>
          )}
          {districts.map(d => (
            <label key={d.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.districtIds.includes(d.id)}
                onChange={() => toggleDistrict(d.id)}
                className="rounded border-gray-300 text-svef-purple focus:ring-svef-purple/30"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{d.name}</span>
              <span className="text-xs text-gray-400">({d.code})</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowTeachers(!showTeachers)}
          className="flex items-center gap-2 mb-3 w-full"
        >
          <Users className="w-4 h-4 text-svef-gray" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Teachers</h3>
          <span className="text-xs text-gray-400 ml-auto mr-1">
            {filters.teacherUsernames.length > 0 ? `${filters.teacherUsernames.length} selected` : 'All'}
          </span>
          {showTeachers ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </button>
        {showTeachers && (
          <div className="max-h-48 overflow-y-auto space-y-1.5 pl-1 border-l-2 border-gray-100 ml-2">
            {teachers.map(t => (
              <label key={t.username} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.teacherUsernames.includes(t.username)}
                  onChange={() => toggleTeacher(t.username)}
                  className="rounded border-gray-300 text-svef-purple focus:ring-svef-purple/30"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 truncate">{t.name}</span>
              </label>
            ))}
            {teachers.length === 0 && <p className="text-xs text-gray-400 pl-2">No teachers found</p>}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-svef-gray" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Date Range</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value || null })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-svef-purple/20 focus:border-svef-purple"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value || null })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-svef-purple/20 focus:border-svef-purple"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-svef-gray" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Data Sheets</h3>
        </div>
        <label className="flex items-center gap-2 cursor-pointer mb-2 pb-2 border-b border-gray-100">
          <input
            type="checkbox"
            checked={selectedSheets.length === ALL_SHEETS.length}
            onChange={toggleAllSheets}
            className="rounded border-gray-300 text-svef-purple focus:ring-svef-purple/30"
          />
          <span className="text-sm font-medium text-gray-700">Select All</span>
        </label>
        <div className="space-y-1.5">
          {ALL_SHEETS.map(sheet => (
            <label key={sheet} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedSheets.includes(sheet)}
                onChange={() => toggleSheet(sheet)}
                className="rounded border-gray-300 text-svef-purple focus:ring-svef-purple/30"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{sheet}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-4 h-4 text-svef-gray" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Format</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onFormatChange('xlsx')}
            className={cn(
              'flex-1 text-sm font-medium rounded-lg py-2 px-3 border transition-colors',
              exportFormat === 'xlsx'
                ? 'border-svef-purple bg-svef-purple/5 text-svef-purple'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            )}
          >
            Excel (.xlsx)
          </button>
          <button
            onClick={() => onFormatChange('csv')}
            className={cn(
              'flex-1 text-sm font-medium rounded-lg py-2 px-3 border transition-colors',
              exportFormat === 'csv'
                ? 'border-svef-purple bg-svef-purple/5 text-svef-purple'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            )}
          >
            CSV (.zip)
          </button>
        </div>
      </div>
    </div>
  );
}

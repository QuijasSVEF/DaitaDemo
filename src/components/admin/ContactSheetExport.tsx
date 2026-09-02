import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Users, Filter, FileSpreadsheet, FileText, FileJson, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { cn } from '../../utils/cn';
import * as XLSX from 'xlsx';

type RoleFilter = 'all' | 'teachers' | 'coaches' | 'mentors';

interface ContactRow {
  name: string;
  email: string;
  role: string;
}

async function fetchContacts(roleFilter: RoleFilter): Promise<ContactRow[]> {
  const rows: ContactRow[] = [];

  if (roleFilter === 'all' || roleFilter === 'teachers') {
    const { data } = await supabase
      .from('teachers')
      .select('name, email')
      .order('name');
    for (const t of data || []) {
      if (t.email) rows.push({ name: t.name || '', email: t.email, role: 'Teacher' });
    }
  }

  if (roleFilter === 'all' || roleFilter === 'coaches') {
    const { data } = await supabase
      .from('coaches')
      .select('full_name, email')
      .order('full_name');
    for (const c of data || []) {
      if (c.email) rows.push({ name: c.full_name || '', email: c.email, role: 'Coach' });
    }
  }

  if (roleFilter === 'all' || roleFilter === 'mentors') {
    const { data } = await supabase
      .from('college_mentors')
      .select('full_name, email')
      .order('full_name');
    for (const m of data || []) {
      if (m.email) rows.push({ name: m.full_name || '', email: m.email, role: 'College Mentor' });
    }
  }

  return rows;
}

function buildFilename(roleFilter: RoleFilter, ext: string): string {
  const date = new Date().toISOString().split('T')[0];
  const roleLabel = roleFilter === 'all' ? 'all-roles' : roleFilter;
  return `contacts-${roleLabel}-${date}.${ext}`;
}

export function ContactSheetExport() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contactSheet', roleFilter],
    queryFn: () => fetchContacts(roleFilter),
  });

  const exportXlsx = () => {
    if (contacts.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(contacts.map(c => ({
      Name: c.name,
      Email: c.email,
      Role: c.role,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, buildFilename(roleFilter, 'xlsx'));
  };

  const exportCsv = () => {
    if (contacts.length === 0) return;
    const header = 'Name,Email,Role\n';
    const rows = contacts.map(c =>
      `"${c.name.replace(/"/g, '""')}","${c.email.replace(/"/g, '""')}","${c.role}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(roleFilter, 'csv');
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (contacts.length === 0) return;
    const json = JSON.stringify(contacts.map(c => ({
      name: c.name,
      email: c.email,
      role: c.role,
    })), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(roleFilter, 'json');
    a.click();
    URL.revokeObjectURL(url);
  };

  const roleCounts = {
    teachers: contacts.filter(c => c.role === 'Teacher').length,
    coaches: contacts.filter(c => c.role === 'Coach').length,
    mentors: contacts.filter(c => c.role === 'College Mentor').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Contact Sheet</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Export names and emails for outreach and communication
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-svef-purple/30 focus:border-svef-purple"
          >
            <option value="all">All Roles</option>
            <option value="teachers">Teachers Only</option>
            <option value="coaches">Coaches Only</option>
            <option value="mentors">College Mentors Only</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn(
          "rounded-lg border px-4 py-3 text-center transition-colors",
          roleFilter === 'teachers' || roleFilter === 'all'
            ? "bg-blue-50 border-blue-200"
            : "bg-gray-50 border-gray-200 opacity-50"
        )}>
          <p className="text-2xl font-oswald font-medium text-blue-700">{roleCounts.teachers}</p>
          <p className="text-xs text-blue-600">Teachers</p>
        </div>
        <div className={cn(
          "rounded-lg border px-4 py-3 text-center transition-colors",
          roleFilter === 'coaches' || roleFilter === 'all'
            ? "bg-emerald-50 border-emerald-200"
            : "bg-gray-50 border-gray-200 opacity-50"
        )}>
          <p className="text-2xl font-oswald font-medium text-emerald-700">{roleCounts.coaches}</p>
          <p className="text-xs text-emerald-600">Coaches</p>
        </div>
        <div className={cn(
          "rounded-lg border px-4 py-3 text-center transition-colors",
          roleFilter === 'mentors' || roleFilter === 'all'
            ? "bg-amber-50 border-amber-200"
            : "bg-gray-50 border-gray-200 opacity-50"
        )}>
          <p className="text-2xl font-oswald font-medium text-amber-700">{roleCounts.mentors}</p>
          <p className="text-xs text-amber-600">Mentors</p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 mr-1">Export as:</span>
        <button
          onClick={exportXlsx}
          disabled={contacts.length === 0 || isLoading}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors",
            contacts.length > 0 && !isLoading
              ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel (.xlsx)
        </button>
        <button
          onClick={exportCsv}
          disabled={contacts.length === 0 || isLoading}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors",
            contacts.length > 0 && !isLoading
              ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
              : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <FileText className="w-4 h-4" />
          CSV
        </button>
        <button
          onClick={exportJson}
          disabled={contacts.length === 0 || isLoading}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors",
            contacts.length > 0 && !isLoading
              ? "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
              : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <FileJson className="w-4 h-4" />
          JSON
        </button>
      </div>

      {/* Preview table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Preview ({contacts.length} contacts)
          </span>
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-svef-purple" />
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-svef-purple" />
            <span className="ml-2 text-sm text-gray-500">Loading contacts...</span>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Users className="w-10 h-10 mb-2" />
            <p className="text-sm">No contacts found for the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {contacts.map((c, idx) => (
                  <tr key={`${c.email}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-900 whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">{c.email}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 text-xs font-medium rounded-full",
                        c.role === 'Teacher' && "bg-blue-100 text-blue-700",
                        c.role === 'Coach' && "bg-emerald-100 text-emerald-700",
                        c.role === 'College Mentor' && "bg-amber-100 text-amber-700",
                      )}>
                        {c.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Shield, Download, Users, RefreshCw } from 'lucide-react';
import { getTosAcceptanceStats, getTosAcceptanceRecords } from '../../services/supabase/tos';
import { supabase } from '../../services/supabase/config';

interface AcceptanceRecord {
  id: string;
  user_role: string;
  user_identifier: string;
  accepted_at: string;
}

interface TosStats {
  total_acceptances: number;
  by_role: Record<string, number>;
  version: string;
  effective_date: string;
}

export function TosComplianceView() {
  const [stats, setStats] = useState<TosStats | null>(null);
  const [records, setRecords] = useState<AcceptanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalUsers, setTotalUsers] = useState<Record<string, number>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, recordsData] = await Promise.all([
        getTosAcceptanceStats(),
        getTosAcceptanceRecords(),
      ]);
      setStats(statsData);
      setRecords(recordsData);

      // Get total counts for each role
      const [teacherCount, coachCount, mentorCount, studentCount] = await Promise.all([
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('account_status', 'active'),
        supabase.from('coaches').select('id', { count: 'exact', head: true }),
        supabase.from('college_mentors').select('id', { count: 'exact', head: true }).eq('account_status', 'active'),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      setTotalUsers({
        teacher: teacherCount.count || 0,
        coach: coachCount.count || 0,
        mentor: mentorCount.count || 0,
        student: studentCount.count || 0,
      });
    } catch (err) {
      console.error('Error loading ToS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = records.filter((r) => {
    const matchesFilter = filter === 'all' || r.user_role === filter;
    const matchesSearch =
      !searchQuery || r.user_identifier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const exportCsv = () => {
    const headers = ['User Role', 'User Identifier', 'Accepted At'];
    const rows = filteredRecords.map((r) => [
      r.user_role,
      r.user_identifier,
      new Date(r.accepted_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tos_acceptances_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const roleColors: Record<string, string> = {
    teacher: 'bg-svef-green/10 text-svef-green',
    coach: 'bg-svef-brown/10 text-svef-brown',
    mentor: 'bg-blue-50 text-blue-700',
    student: 'bg-svef-purple/10 text-svef-purple',
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-svef-purple" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-svef-gray" />
          <div>
            <h2 className="font-oswald text-xl font-semibold text-svef-gray">
              Terms of Service Compliance
            </h2>
            <p className="text-sm text-gray-500">
              {stats?.version ? `Current version: v${stats.version}` : 'No active version'}
              {stats?.effective_date &&
                ` \u00B7 Effective ${new Date(stats.effective_date).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['teacher', 'coach', 'mentor', 'student'] as const).map((role) => {
          const accepted = stats?.by_role?.[role] || 0;
          const total = totalUsers[role] || 0;
          const percentage = total > 0 ? Math.round((accepted / total) * 100) : 0;

          return (
            <div key={role} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[role]}`}>
                  {role === 'mentor' ? 'Mentors' : `${role}s`}
                </span>
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-svef-gray">
                {accepted} <span className="text-sm font-normal text-gray-400">/ {total}</span>
              </p>
              <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-svef-green rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{percentage}% accepted</p>
            </div>
          );
        })}
      </div>

      {/* Filters and Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-svef-green focus:border-svef-green"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-svef-green focus:border-svef-green"
          >
            <option value="all">All Roles</option>
            <option value="teacher">Teachers</option>
            <option value="coach">Coaches</option>
            <option value="mentor">Mentors</option>
            <option value="student">Students</option>
          </select>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Accepted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No acceptance records found
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[record.user_role] || 'bg-gray-100 text-gray-600'}`}>
                        {record.user_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {record.user_identifier}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(record.accepted_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredRecords.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
            Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

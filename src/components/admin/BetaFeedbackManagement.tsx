import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Download,
  MessageSquare,
  Bug,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../services/supabase/config';

interface BetaFeedbackItem {
  id: string;
  user_role: string;
  user_identifier: string;
  feedback_type: string;
  description: string;
  severity: string;
  page_url: string | null;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  { value: 'reviewed', label: 'Reviewed', icon: Eye, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  { value: 'dismissed', label: 'Dismissed', icon: XCircle, color: 'bg-gray-100 text-gray-600' },
];

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug Report', icon: Bug, color: 'bg-red-100 text-red-700' },
  feature: { label: 'Feature Request', icon: Lightbulb, color: 'bg-teal-100 text-teal-700' },
  usability: { label: 'Usability Issue', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
  suggestion: { label: 'Suggestion', icon: Lightbulb, color: 'bg-sky-100 text-sky-700' },
  general: { label: 'General', icon: MessageSquare, color: 'bg-gray-100 text-gray-600' },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-blue-100 text-blue-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_OPTIONS.find((s) => s.value === status);
  if (!config) return <span className="text-xs text-gray-500">{status}</span>;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.general;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function FeedbackRow({
  item,
  isExpanded,
  onToggle,
  onStatusChange,
}: {
  item: BetaFeedbackItem;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          <span className="block text-xs text-gray-400">
            {new Date(item.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </td>
        <td className="px-5 py-4 whitespace-nowrap">
          <TypeBadge type={item.feedback_type} />
        </td>
        <td className="px-5 py-4">
          <p className="text-sm text-gray-900 line-clamp-2 max-w-md">
            {item.description}
          </p>
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
          <span className="capitalize">{item.user_role}</span>
          {item.user_identifier && item.user_identifier !== 'anonymous' && (
            <span className="block text-xs text-gray-400 truncate max-w-[140px]">
              {item.user_identifier}
            </span>
          )}
        </td>
        <td className="px-5 py-4 whitespace-nowrap">
          {item.feedback_type === 'bug' && <SeverityBadge severity={item.severity} />}
        </td>
        <td className="px-5 py-4 whitespace-nowrap">
          <StatusBadge status={item.status} />
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-gray-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50/70">
          <td colSpan={7} className="px-5 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Full Description
                  </h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white rounded-lg p-4 border border-gray-200">
                    {item.description}
                  </p>
                </div>
                {item.page_url && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Page URL
                    </h4>
                    <p className="text-sm text-gray-600 font-mono break-all">{item.page_url}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Update Status
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = item.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(item.id, opt.value);
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isActive
                              ? `${opt.color} border-current ring-1 ring-current/20`
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-xs text-gray-400 pt-2">
                  ID: {item.id.slice(0, 8)}...
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function BetaFeedbackManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: feedback = [], isLoading, refetch } = useQuery<BetaFeedbackItem[]>({
    queryKey: ['betaFeedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beta_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('beta_feedback')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['betaFeedback'] });
    },
  });

  const filtered = feedback.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user_role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.feedback_type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: feedback.length,
    new: feedback.filter((f) => f.status === 'new').length,
    bugs: feedback.filter((f) => f.feedback_type === 'bug').length,
    features: feedback.filter((f) => f.feedback_type === 'feature').length,
  };

  const downloadCSV = () => {
    const csv = [
      ['Date', 'Type', 'Severity', 'Status', 'User Role', 'User', 'Description', 'Page URL'],
      ...filtered.map((item) => [
        new Date(item.created_at).toISOString(),
        item.feedback_type,
        item.severity,
        item.status,
        item.user_role,
        item.user_identifier,
        `"${item.description.replace(/"/g, '""')}"`,
        item.page_url || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beta-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-oswald font-medium text-svef-gray">
          Beta Feedback
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-svef-purple text-white rounded-lg hover:bg-svef-purple/90 text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">New</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.new}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Bug Reports</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.bugs}</p>
        </div>
        <div className="bg-white rounded-xl border border-teal-200 p-4">
          <p className="text-xs font-medium text-teal-600 uppercase tracking-wider">Feature Requests</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">{stats.features}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-svef-purple focus:border-svef-purple text-sm"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg py-2.5 pl-3 pr-10 text-sm focus:ring-svef-purple focus:border-svef-purple"
        >
          <option value="all">All Types</option>
          <option value="bug">Bug Reports</option>
          <option value="feature">Feature Requests</option>
          <option value="usability">Usability Issues</option>
          <option value="general">General</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg py-2.5 pl-3 pr-10 text-sm focus:ring-svef-purple focus:border-svef-purple"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-svef-purple" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No feedback found</p>
            <p className="text-gray-400 text-sm mt-1">
              {feedback.length > 0 ? 'Try adjusting your filters' : 'No feedback has been submitted yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((item) => (
                  <FeedbackRow
                    key={item.id}
                    item={item}
                    isExpanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Showing {filtered.length} of {feedback.length} entries
          </div>
        )}
      </div>
    </div>
  );
}

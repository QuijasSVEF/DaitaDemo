import React, { useState } from 'react';
import {
  Bell, AlertTriangle, AlertCircle, Info, Filter, ChevronRight
} from 'lucide-react';
import { CoachAlert } from '../../services/supabase/coachData';

interface Props {
  alerts: CoachAlert[];
  onSelectTeacher: (username: string) => void;
  onSelectMentor: (mentorId: string) => void;
}

type FilterType = 'all' | 'danger' | 'warning' | 'info';
type FilterCategory = 'all' | 'teacher' | 'mentor';

export function AlertsView({ alerts, onSelectTeacher, onSelectMentor }: Props) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

  const filtered = alerts.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    return true;
  });

  const dangerCount = alerts.filter(a => a.type === 'danger').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const infoCount = alerts.filter(a => a.type === 'info').length;

  const handleClick = (alert: CoachAlert) => {
    if (alert.category === 'teacher') onSelectTeacher(alert.targetId);
    else onSelectMentor(alert.targetId);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-oswald font-medium text-gray-800">Alerts & Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Automatic flags for teachers and mentors needing attention</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilterType(filterType === 'danger' ? 'all' : 'danger')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterType === 'danger' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:bg-red-50/50'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-red-700">Critical</span>
          </div>
          <p className="text-2xl font-semibold text-red-600">{dangerCount}</p>
        </button>
        <button
          onClick={() => setFilterType(filterType === 'warning' ? 'all' : 'warning')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterType === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200 hover:bg-amber-50/50'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-700">Warnings</span>
          </div>
          <p className="text-2xl font-semibold text-amber-600">{warningCount}</p>
        </button>
        <button
          onClick={() => setFilterType(filterType === 'info' ? 'all' : 'info')}
          className={`rounded-lg border p-4 text-left transition-colors ${filterType === 'info' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-blue-50/50'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-700">Info</span>
          </div>
          <p className="text-2xl font-semibold text-blue-600">{infoCount}</p>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['all', 'teacher', 'mentor'] as FilterCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${filterCategory === cat ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
            >
              {cat === 'all' ? 'All' : `${cat}s`}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{filtered.length} alerts</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No alerts</p>
            <p className="text-sm text-gray-400 mt-1">
              {alerts.length === 0 ? 'All your teachers and mentors are on track' : 'No alerts match your current filters'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filtered.map(alert => (
              <button
                key={alert.id}
                onClick={() => handleClick(alert)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left group"
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  alert.type === 'danger' ? 'bg-red-100' : alert.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  {alert.type === 'danger' ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                   alert.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                   <Info className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-gray-800">{alert.targetName}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      alert.category === 'teacher' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {alert.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{alert.detail}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

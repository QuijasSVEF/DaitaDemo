import React, { useState, useMemo } from 'react';
import {
  Search, Users, GraduationCap, Clock, Tag, FileText,
  ChevronRight, Filter
} from 'lucide-react';
import { Coach } from '../../types';
import { CoachTeacher, CoachMentor } from '../../services/supabase/coachData';

interface Props {
  coach: Coach;
  teachers: CoachTeacher[];
  mentors: CoachMentor[];
  onSelectTeacher: (username: string) => void;
  onSelectMentor: (mentorId: string) => void;
  onRefresh: () => void;
}

type Tab = 'teachers' | 'mentors';
type SortKey = 'name' | 'lastLogin' | 'activity' | 'students';

export function CoachRoster({ coach, teachers, mentors, onSelectTeacher, onSelectMentor }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('teachers');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [filterDistrict, setFilterDistrict] = useState<string>('all');

  const districtOptions = useMemo(() => {
    const names = new Set<string>();
    for (const t of teachers) {
      if (t.districtName) names.add(t.districtName);
    }
    return [...names].sort();
  }, [teachers]);

  const filteredTeachers = teachers
    .filter(t => {
      if (filterDistrict !== 'all' && t.districtName !== filterDistrict) return false;
      return t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.username.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'lastLogin': return (b.lastLogin || '').localeCompare(a.lastLogin || '');
        case 'activity': return b.exitTicketsThisWeek - a.exitTicketsThisWeek;
        case 'students': return b.studentCount - a.studentCount;
        default: return 0;
      }
    });

  const filteredMentors = mentors
    .filter(m => {
      if (filterDistrict !== 'all' && !m.assignedDistricts.includes(filterDistrict)) return false;
      return m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.university || '').toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.fullName.localeCompare(b.fullName);
        case 'lastLogin': return (b.lastLogin || '').localeCompare(a.lastLogin || '');
        case 'activity': return b.sessionsThisWeek - a.sessionsThisWeek;
        default: return 0;
      }
    });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-oswald font-medium text-gray-800">Roster & Access</h1>
        <p className="text-sm text-gray-500 mt-1">Your assigned classroom teachers and college mentors</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => { setActiveTab('teachers'); setSearchTerm(''); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'teachers' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Teachers
            <span className="bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded-full">{teachers.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('mentors'); setSearchTerm(''); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'mentors' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Mentors
            <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{mentors.length}</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterDistrict}
            onChange={e => setFilterDistrict(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="all">All Districts</option>
            {districtOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="name">Sort by Name</option>
            <option value="lastLogin">Sort by Last Active</option>
            <option value="activity">Sort by Activity</option>
            {activeTab === 'teachers' && <option value="students">Sort by Students</option>}
          </select>
        </div>
      </div>

      {activeTab === 'teachers' ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {filteredTeachers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{searchTerm ? 'No teachers match your search' : 'No teachers assigned yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTeachers.map(t => (
                <button
                  key={t.username}
                  onClick={() => onSelectTeacher(t.username)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-700 font-medium text-sm">
                      {t.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-teal-700 transition-colors">
                        {t.name}
                      </p>
                      {t.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">@{t.username}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{t.studentCount}</p>
                      <p className="text-xs text-gray-400">students</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{t.exitTicketsThisWeek}</p>
                      <p className="text-xs text-gray-400">this week</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {t.lastLogin
                        ? new Date(t.lastLogin).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {filteredMentors.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{searchTerm ? 'No mentors match your search' : 'No mentors linked to your teachers'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMentors.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelectMentor(m.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-medium text-sm">
                      {m.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                        {m.fullName}
                      </p>
                      {m.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{m.university || m.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{m.totalMinutes}min</p>
                      <p className="text-xs text-gray-400">total dosage</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{m.sessionsThisWeek}</p>
                      <p className="text-xs text-gray-400">this week</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{m.usedLessonPlanRate}%</p>
                      <p className="text-xs text-gray-400">plan usage</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

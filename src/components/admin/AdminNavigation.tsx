import React from 'react';
import { Users, BarChart2, ClipboardList, Settings, Building2, Shield, GraduationCap, Download, MessageSquarePlus, FileCheck } from 'lucide-react';
import { NavItem } from './NavItem';

interface Props {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function AdminNavigation({ currentView, onViewChange }: Props) {
  const navItems = [
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'coaches', label: 'Coaches', icon: Shield },
    { id: 'mentors', label: 'College Mentors', icon: GraduationCap },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'export', label: 'Data Export', icon: Download },
    { id: 'districts', label: 'Districts', icon: Building2 },
    { id: 'tos', label: 'ToS Compliance', icon: FileCheck },
    { id: 'audit', label: 'Audit Logs', icon: ClipboardList },
    { id: 'feedback', label: 'Beta Feedback', icon: MessageSquarePlus },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="flex space-x-1 md:space-x-2 overflow-x-auto">
            {navItems.map(item => (
              <NavItem
                key={item.id}
                isActive={currentView === item.id}
                onClick={() => onViewChange(item.id)}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
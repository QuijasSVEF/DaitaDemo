import React from 'react';
import { LayoutDashboard, Users, UserCircle, GroupIcon, GraduationCap } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Navigation({ currentView, onViewChange }: Props) {
  const views = [
    
    { id: 'classroom', label: 'Classroom Analytics', icon: Users },
    { id: 'students', label: 'Student View', icon: UserCircle },
    { id: 'groups', label: 'Weekly Groups', icon: GroupIcon },
    { id: 'assessments', label: 'Assessments', icon: GraduationCap },
    { id: 'quiz', label: 'Create Assessment', icon: GraduationCap }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-4 py-3">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <Button
                key={view.id}
                variant={currentView === view.id ? 'primary' : 'secondary'}
                onClick={() => onViewChange(view.id)}
                className="flex items-center space-x-2"
              >
                <Icon className="w-4 h-4" />
                <span>{view.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
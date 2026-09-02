import React from 'react';
import { GraduationCap, LogOut } from 'lucide-react';
import { Student, Teacher } from '../types';
import { Button } from './ui/Button';
import { Logo } from './Logo';

interface HeaderProps {
  step: number;
  studentData: Student | null;
  teacher: Teacher;
  onSignOut?: () => void;
}

export function Header({ step, studentData, teacher, onSignOut }: HeaderProps) {
  return (
    <header className="bg-svef-beige">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Logo />
            <div className="border-l border-svef-gray/20 pl-6">
              <h1 className="font-oswald text-3xl font-semibold text-svef-gray">D[ai]TA</h1>
              <p className="font-open-sans text-sm text-svef-brown mt-1">
                Welcome, {teacher?.name || teacher?.username || 'Teacher'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {step > 1 && studentData && (
              <div className="bg-white px-4 py-2 rounded-md shadow-sm">
                <p className="font-open-sans text-sm text-svef-gray">
                  Student Number: <span className="font-medium">{studentData.id}</span> | 
                  Grade: <span className="font-medium">{studentData.gradeLevel}</span>
                </p>
              </div>
            )}
            {onSignOut && (
              <Button
                variant="secondary"
                className="flex items-center space-x-2"
                onClick={onSignOut}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
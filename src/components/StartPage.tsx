import React from 'react';
import { GraduationCap, UserCog, Shield, Users } from 'lucide-react';
import { Logo } from './Logo';

interface Props {
  onSelectUserType: (type: 'teacher' | 'student' | 'admin' | 'coach' | 'mentor') => void;
}

export function StartPage({ onSelectUserType }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="flex flex-col items-center">
          <div className="mb-6">
            <Logo />
          </div>
          <h1 className="font-oswald text-2xl font-medium text-svef-gray flex items-center space-x-2">
            Welcome to D[ai]TA
          </h1>
          <p className="font-open-sans text-sm text-svef-brown mt-1">
            Select how you would like to continue
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelectUserType('student')}
            className="w-full flex items-center justify-center space-x-3 px-4 py-6 border border-transparent rounded-lg shadow-sm text-white bg-svef-purple hover:bg-svef-purple/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-purple transition-colors duration-200"
          >
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-open-sans font-medium">
              I'm a Student
            </span>
          </button>

          <button
            onClick={() => onSelectUserType('teacher')}
            className="w-full flex items-center justify-center space-x-3 px-4 py-6 border border-transparent rounded-lg shadow-sm text-white bg-svef-green hover:bg-svef-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-green transition-colors duration-200"
          >
            <UserCog className="w-6 h-6" />
            <span className="text-lg font-open-sans font-medium">
              I'm a Teacher
            </span>
          </button>

          <button
            onClick={() => onSelectUserType('coach')}
            className="w-full flex items-center justify-center space-x-3 px-4 py-6 border border-transparent rounded-lg shadow-sm text-white bg-svef-brown hover:bg-svef-brown/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-brown transition-colors duration-200"
          >
            <Shield className="w-6 h-6" />
            <span className="text-lg font-open-sans font-medium">
              I'm a Coach
            </span>
          </button>

          <button
            onClick={() => onSelectUserType('mentor')}
            className="w-full flex items-center justify-center space-x-3 px-4 py-6 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <Users className="w-6 h-6" />
            <span className="text-lg font-open-sans font-medium">
              I'm a College Mentor
            </span>
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => onSelectUserType('admin')}
            className="text-sm text-svef-purple hover:text-svef-purple/80"
          >
            Admin Portal
          </button>
        </div>
      </div>
    </div>
  );
}
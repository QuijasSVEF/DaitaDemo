import React from 'react';
import { Shield, Users, BarChart2, ClipboardList, Settings, LogOut } from 'lucide-react';
import { AdminNavigation } from './AdminNavigation';
import { AdminErrorBoundary } from './ErrorBoundary';

interface Props {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onSignOut: () => void;
}

export function AdminLayout({ children, currentView, onViewChange, onSignOut }: Props) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-svef-purple" />
              <h1 className="ml-3 text-xl font-oswald font-medium text-svef-gray">
                Admin Portal
              </h1>
            </div>
            <button
              onClick={onSignOut}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <AdminNavigation
        currentView={currentView}
        onViewChange={onViewChange}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 lg:px-6 overflow-hidden">
        <AdminErrorBoundary>
          {children}
        </AdminErrorBoundary>
      </main>
    </div>
  );
}
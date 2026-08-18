import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { TeacherManagement } from './TeacherManagement';
import { CoachManagement } from './CoachManagement';
import { MentorManagement } from './MentorManagement';
import { SystemAnalytics } from './SystemAnalytics';
import { AuditLogs } from './AuditLogs';
import { DistrictManagement } from './DistrictManagement';
import { AdminSettings } from './AdminSettings';
import { DataExport } from './DataExport';
import { BetaFeedbackManagement } from './BetaFeedbackManagement';
import { TosComplianceView } from './TosComplianceView';
import { AdminLayout } from './AdminLayout';

interface Props {
  onSignOut: () => void;
}

export function AdminDashboard({ onSignOut }: Props) {
  const [currentView, setCurrentView] = useState('teachers');
  const [error, setError] = useState<string | null>(null);

  const renderView = () => {
    try {
    switch (currentView) {
      case 'teachers':
        return <TeacherManagement />;
      case 'coaches':
        return <CoachManagement />;
      case 'mentors':
        return <MentorManagement />;
      case 'analytics':
        return <SystemAnalytics />;
      case 'export':
        return <DataExport />;
      case 'districts':
        return <DistrictManagement />;
      case 'audit':
        return <AuditLogs />;
      case 'tos':
        return <TosComplianceView />;
      case 'feedback':
        return <BetaFeedbackManagement />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <TeacherManagement />;
    }
    } catch (error) {
      console.error('Error rendering admin view:', error);
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <div>
                <p className="font-medium">Error Loading Content</p>
                <p className="text-sm mt-1">
                  {error instanceof Error ? error.message : 'An unexpected error occurred'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <AdminLayout
      currentView={currentView}
      onViewChange={setCurrentView}
      onSignOut={onSignOut}
    >
      {error && (
        <div className="p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center text-yellow-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <div>
                <p className="font-medium">Data Loading Issue</p>
                <p className="text-sm mt-1">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="text-sm underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {renderView()}
    </AdminLayout>
  );
}
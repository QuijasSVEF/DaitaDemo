import React, { useState } from 'react';
import { Plus, AlertCircle, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';
import { TeacherList } from './TeacherList';
import { Button } from '../ui/Button';
import { CreateTeacherModal } from './CreateTeacherModal';
import { BulkTeacherImport } from './BulkTeacherImport';
import { cn } from '../../utils/cn';

interface TeacherAccount {
  id: string;
  username: string;
  email: string;
  full_name: string;
  account_locked: boolean;
  temp_password: boolean;
  last_login: string | null;
}

export function TeacherManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refetch } = useQuery({
    queryKey: ['teacherManagement'],
    queryFn: () => Promise.resolve([])
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-oswald font-medium text-svef-gray">
          Teacher Management
        </h2>
        <div className="flex space-x-3">
          <Button 
            variant="secondary" 
            aria-label="Bulk Import Teachers"
            onClick={() => setIsBulkImportOpen(true)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            aria-label="Create New Teacher Account"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Teacher Account
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <TeacherList />

      <CreateTeacherModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />
        
      <BulkTeacherImport
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          setIsBulkImportOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
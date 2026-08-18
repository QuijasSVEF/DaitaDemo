import { supabase } from '../../services/supabase/config';
import { BulkImportModal, BulkColumnDef, BulkImportResult } from './BulkImportModal';

const columns: BulkColumnDef[] = [
  { key: 'fullName', header: 'Full Name', required: true },
  { key: 'email', header: 'Email', required: true },
  { key: 'password', header: 'Password', required: true },
  { key: 'phone', header: 'Phone' },
  { key: 'university', header: 'University' },
  { key: 'major', header: 'Major' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkMentorImport({ isOpen, onClose, onSuccess }: Props) {
  const importRows = async (rows: Record<string, string>[]): Promise<BulkImportResult[]> => {
    const results: BulkImportResult[] = [];
    for (const row of rows) {
      const label = row.email || row.fullName || '(unknown)';
      try {
        if (!row.fullName || !row.email || !row.password) {
          results.push({ success: false, label, message: 'Missing required fields' });
          continue;
        }
        if (row.password.length < 8) {
          results.push({ success: false, label, message: 'Password must be at least 8 characters' });
          continue;
        }
        const { data, error } = await supabase.rpc('create_college_mentor', {
          p_email: row.email.toLowerCase().trim(),
          p_full_name: row.fullName.trim(),
          p_password: row.password,
          p_phone: row.phone?.trim() || null,
          p_university: row.university?.trim() || null,
          p_major: row.major?.trim() || null,
        });
        if (error) throw error;
        const result = data as any;
        if (result && result.success === false) {
          throw new Error(result.message || 'Failed to create mentor');
        }
        results.push({ success: true, label, message: 'Mentor created' });
      } catch (err: any) {
        results.push({ success: false, label, message: err?.message || 'Failed to create mentor' });
      }
    }
    return results;
  };

  return (
    <BulkImportModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Bulk Import College Mentors"
      entityLabel="mentor"
      entityLabelPlural="mentors"
      columns={columns}
      templateFilename="mentor_import_template.csv"
      formatNotes={['Password must be at least 8 characters']}
      importRows={importRows}
    />
  );
}

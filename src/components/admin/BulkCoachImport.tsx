import { supabase } from '../../services/supabase/config';
import { BulkImportModal, BulkColumnDef, BulkImportResult } from './BulkImportModal';

const columns: BulkColumnDef[] = [
  { key: 'fullName', header: 'Full Name', required: true },
  { key: 'email', header: 'Email', required: true },
  { key: 'password', header: 'Password', required: true },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkCoachImport({ isOpen, onClose, onSuccess }: Props) {
  const importRows = async (rows: Record<string, string>[]): Promise<BulkImportResult[]> => {
    const results: BulkImportResult[] = [];
    for (const row of rows) {
      const label = row.email || row.fullName || '(unknown)';
      try {
        if (!row.fullName || !row.email || !row.password) {
          results.push({ success: false, label, message: 'Missing required fields' });
          continue;
        }
        const { error } = await supabase.rpc('create_coach', {
          p_email: row.email.toLowerCase().trim(),
          p_full_name: row.fullName.trim(),
          p_password: row.password,
        });
        if (error) throw error;
        results.push({ success: true, label, message: 'Coach created' });
      } catch (err: any) {
        results.push({ success: false, label, message: err?.message || 'Failed to create coach' });
      }
    }
    return results;
  };

  return (
    <BulkImportModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Bulk Import Coaches"
      entityLabel="coach"
      entityLabelPlural="coaches"
      columns={columns}
      templateFilename="coach_import_template.csv"
      formatNotes={[
        'Passwords must be at least 8 characters with one uppercase letter, one number, and one special character',
      ]}
      importRows={importRows}
    />
  );
}

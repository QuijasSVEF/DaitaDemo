import { supabase } from '../../services/supabase/config';
import { BulkImportModal, BulkColumnDef, BulkImportResult } from './BulkImportModal';

const columns: BulkColumnDef[] = [
  { key: 'name', header: 'District Name', required: true },
  { key: 'code', header: 'District Code', required: true },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkDistrictImport({ isOpen, onClose, onSuccess }: Props) {
  const importRows = async (rows: Record<string, string>[]): Promise<BulkImportResult[]> => {
    const results: BulkImportResult[] = [];
    for (const row of rows) {
      const label = row.name || row.code || '(unknown)';
      try {
        if (!row.name || !row.code) {
          results.push({ success: false, label, message: 'Missing required fields' });
          continue;
        }
        const { error } = await supabase.rpc('create_school_district', {
          p_name: row.name.trim(),
          p_code: row.code.trim(),
        });
        if (error) throw error;
        results.push({ success: true, label, message: 'District created' });
      } catch (err: any) {
        results.push({ success: false, label, message: err?.message || 'Failed to create district' });
      }
    }
    return results;
  };

  return (
    <BulkImportModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Bulk Import School Districts"
      entityLabel="district"
      entityLabelPlural="districts"
      columns={columns}
      templateFilename="district_import_template.csv"
      importRows={importRows}
    />
  );
}

import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface BulkColumnDef {
  key: string;
  header: string;
  required?: boolean;
  preview?: boolean;
}

export interface BulkImportResult {
  success: boolean;
  label: string;
  message: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  entityLabel: string;
  entityLabelPlural: string;
  columns: BulkColumnDef[];
  templateFilename: string;
  formatNotes?: string[];
  importRows: (rows: Record<string, string>[]) => Promise<BulkImportResult[]>;
}

export function BulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  entityLabel,
  entityLabelPlural,
  columns,
  templateFilename,
  formatNotes,
  importRows,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkImportResult[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const previewColumns = columns.filter(c => c.preview !== false);

  const reset = () => {
    setParsedData([]);
    setResults([]);
    setStep('upload');
    setSelectedFileName(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseCsvRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map(s => s.trim());
  };

  const processFile = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please upload a valid CSV file');
        return;
      }

      const text = (await file.text()).replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        setError('CSV must include a header row and at least one data row');
        return;
      }

      const headerCells = parseCsvRow(lines[0]).map(h => h.toLowerCase());
      const missing = columns
        .filter(c => c.required)
        .filter(c => !headerCells.includes(c.header.toLowerCase()));
      if (missing.length > 0) {
        setError(`CSV is missing required columns: ${missing.map(m => m.header).join(', ')}`);
        return;
      }

      const colIndex: Record<string, number> = {};
      for (const col of columns) {
        colIndex[col.key] = headerCells.indexOf(col.header.toLowerCase());
      }

      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvRow(lines[i]);
        const row: Record<string, string> = {};
        let hasAny = false;
        for (const col of columns) {
          const idx = colIndex[col.key];
          const val = idx >= 0 ? (cells[idx] || '') : '';
          row[col.key] = val;
          if (val) hasAny = true;
        }
        if (hasAny) rows.push(row);
      }

      if (rows.length === 0) {
        setError(`No valid ${entityLabel} rows found in the CSV`);
        return;
      }

      setParsedData(rows);
      setStep('preview');
    } catch (err: any) {
      setError(`Failed to parse CSV: ${err?.message || 'Please check the format and try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      processFile(file);
    }
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const importResults = await importRows(parsedData);
      setResults(importResults);
      setStep('results');
      if (importResults.every(r => r.success)) {
        setTimeout(() => onSuccess(), 2500);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to import ${entityLabelPlural}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = columns.map(c => c.header).join(',') + '\n';
    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.success).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-oswald font-medium text-svef-gray">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">CSV File</label>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="text-sm text-svef-purple flex items-center hover:underline"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Template
                </button>
              </div>

              <div
                className={cn(
                  'mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer',
                  dragActive ? 'border-svef-purple bg-svef-purple/5' : 'border-gray-300'
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center w-full">
                  {selectedFileName ? (
                    <div className="space-y-2">
                      <div className="bg-green-50 text-green-700 px-3 py-2 rounded-md flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span>{selectedFileName}</span>
                      </div>
                      <p className="text-sm text-gray-500">Click or drag to select a different file</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex justify-center text-sm text-gray-600">
                        <span className="font-medium text-svef-purple">Upload a CSV file</span>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Required columns: {columns.filter(c => c.required).map(c => c.header).join(', ')}
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv,text/csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">CSV Format:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                <li>First row must contain column headers (case-insensitive)</li>
                <li>
                  Required columns:{' '}
                  <span className="font-medium">
                    {columns.filter(c => c.required).map(c => c.header).join(', ')}
                  </span>
                </li>
                {columns.some(c => !c.required) && (
                  <li>
                    Optional columns:{' '}
                    {columns.filter(c => !c.required).map(c => c.header).join(', ')}
                  </li>
                )}
                {formatNotes?.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Preview Import ({parsedData.length} {parsedData.length === 1 ? entityLabel : entityLabelPlural})
              </h3>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewColumns.map(col => (
                        <th
                          key={col.key}
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        {previewColumns.map(col => (
                          <td key={col.key} className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                            {row[col.key] || <span className="text-gray-400">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsedData.length > 10 && (
                      <tr>
                        <td
                          colSpan={previewColumns.length}
                          className="px-3 py-2 text-center text-sm text-gray-500"
                        >
                          … and {parsedData.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setStep('upload')} disabled={isLoading}>
                Back
              </Button>
              <Button onClick={handleImport} isLoading={isLoading}>
                Import {parsedData.length} {parsedData.length === 1 ? entityLabel : entityLabelPlural}
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Results</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Success Rate</span>
                  <span className="text-sm font-medium">
                    {successCount} / {results.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{
                      width: `${results.length > 0 ? (successCount / results.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {entityLabel}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Message
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          {r.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{r.label}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={reset}>
                Import Another File
              </Button>
              <Button onClick={() => { reset(); onSuccess(); }}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

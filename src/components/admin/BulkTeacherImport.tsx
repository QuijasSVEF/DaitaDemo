import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { bulkImportTeachers } from '../../services/supabase/teachers';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';

interface BulkImportForm {
  csvFile: FileList;
}

interface TeacherImportData {
  districtCode: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
}

interface ImportResult {
  success: boolean;
  username: string;
  message: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkTeacherImport({ isOpen, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [parsedData, setParsedData] = useState<TeacherImportData[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<BulkImportForm>();

  const selectedFile = watch('csvFile');

  // Fetch districts for validation
  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_districts')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setValue('csvFile', e.dataTransfer.files);
      setSelectedFileName(e.dataTransfer.files[0].name);
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFileName(e.target.files[0].name);
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!file) {
        setError('Please select a CSV file');
        return;
      }
      
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please upload a valid CSV file');
        return;
      }
      
      const fileContent = await file.text();
      const rows = fileContent.split('\n');
      
      // Check header row
      const header = rows[0].split(',');
      // Normalize header names by trimming and converting to lowercase
      const normalizedHeader = header.map(col => col.trim().toLowerCase());
      
      // Define required columns with their normalized versions
      const requiredColumns = [
        { display: 'School District', normalized: 'school district' },
        { display: 'Full Name', normalized: 'full name' },
        { display: 'Email', normalized: 'email' },
        { display: 'Username', normalized: 'username' },
        { display: 'Password', normalized: 'password' }
      ];
      
      // Check for missing columns
      const missingColumns = requiredColumns.filter(col => 
        !normalizedHeader.includes(col.normalized)
      );
      
      if (missingColumns.length > 0) {
        setError(`CSV is missing required columns: ${missingColumns.map(col => col.display).join(', ')}`);
        return;
      }
      
      // Create a mapping from normalized column names to their indices
      const columnIndices: Record<string, number> = {};
      normalizedHeader.forEach((col, index) => {
        columnIndices[col] = index;
      });
      
      // Parse data rows
      const teachers: TeacherImportData[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue; // Skip empty rows
        
        const columns = rows[i].split(',').map(col => col.trim());
        if (columns.length < Object.keys(columnIndices).length) continue; // Skip incomplete rows
        
        teachers.push({
          districtCode: columns[columnIndices['school district']] || '',
          fullName: columns[columnIndices['full name']] || '',
          email: columns[columnIndices['email']] || '',
          username: columns[columnIndices['username']] || '',
          password: columns[columnIndices['password']] || ''
        });
      }
      
      if (teachers.length === 0) {
        setError('No valid teacher records found in the CSV');
        return;
      }
      
      setParsedData(teachers);
      setStep('preview');
      
    } catch (error: any) {
      console.error('Error parsing CSV:', error);
      setError(`Failed to parse CSV file: ${error.message || 'Please check the format and try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (data: BulkImportForm) => {
    const file = data.csvFile?.[0];
    if (file) {
      setError(null);
      setSelectedFileName(file.name);
      processFile(file);
    } else {
      setError('Please select a CSV file');
    }
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setResults([]);

      // Use the bulk import function
      try {
        const result = await bulkImportTeachers(parsedData);
        if (result.results && Array.isArray(result.results)) {
          setResults(result.results);
          setStep('results');
          
          // If all successful, call onSuccess
          if (result.errorCount === 0) {
            setTimeout(() => {
              onSuccess();
            }, 3000);
          }
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        console.error('Error during bulk import:', error);
        setError(error instanceof Error ? error.message : 'Failed to import teachers');
      }
    } catch (error) {
      console.error('Error during bulk import:', error);
      setError(error instanceof Error ? error.message : 'Failed to import teachers');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'School District,Full Name,Email,Username,Password\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-oswald font-medium text-svef-gray">
            Bulk Import Teachers
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <form onSubmit={handleSubmit(handleFileUpload)} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  CSV File
                </label>
                <a
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    downloadTemplate();
                  }}
                  className="text-sm text-svef-purple flex items-center"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Template
                </a>
              </div>
              
              <div 
                className={cn(
                  "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer",
                  dragActive ? "border-svef-purple bg-svef-purple/5" : "",
                  errors.csvFile ? "border-red-300" : "border-gray-300"
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
                      <div className="bg-green-50 text-green-700 px-3 py-2 rounded-md flex items-center justify-center\" aria-live="polite">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span>{selectedFileName}</span>
                      </div>
                      <p className="text-sm text-gray-500">Click or drag to select a different file</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex justify-center text-sm text-gray-600">
                        <label
                          htmlFor="csv-file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-svef-purple hover:text-svef-purple/80"
                        >
                          <span>Upload a CSV file</span>
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        CSV with columns: School District, Full Name, Email, Username, Password
                      </p>
                    </>
                  )}
                  <input
                    id="csv-file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    {...register('csvFile', { required: 'Please select a CSV file' })}
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  </div>
              </div>
              {errors.csvFile && (
                <p className="mt-1 text-sm text-red-600">{errors.csvFile.message}</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">CSV Format Requirements:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                <li>File must be in CSV format</li>
                <li>First row must contain column headers</li>
                <li>Required columns: School District, Full Name, Email, Username, Password</li>
                <li>School District should match an existing district code or a new one will be created</li>
                <li>Passwords must be at least 8 characters with one uppercase letter, one number, and one special character</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  onClose();
                  setSelectedFileName(null);
                }}
                disabled={isLoading}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading || !selectedFileName}
              >
                Preview Import
              </Button>
            </div>
          </form>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Preview Import ({parsedData.length} teachers)
              </h3>
              <div className="border border-gray-200 rounded-md overflow-hidden" role="table" aria-label="Teachers to import">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        District
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.slice(0, 10).map((teacher, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {teacher.districtCode || 'None'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {teacher.fullName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {teacher.email}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {teacher.username}
                        </td>
                      </tr>
                    ))}
                    {parsedData.length > 10 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-center text-sm text-gray-500">
                          ... and {parsedData.length - 10} more teachers
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setStep('upload')}
                disabled={isLoading}
                type="button"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                isLoading={isLoading}
              >
                Import Teachers
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Import Results
              </h3>
              <div className="mb-4" aria-live="polite">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Success Rate:
                  </span>
                  <span className="text-sm font-medium">
                    {results.filter(r => r.success).length} / {results.length} teachers
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full" 
                    style={{ width: `${(results.filter(r => r.success).length / results.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-md overflow-hidden max-h-64 overflow-y-auto" role="table" aria-label="Import results">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Message
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {result.username}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {result.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setStep('upload')}
                type="button"
              >
                Import Another File
              </Button>
              <Button
                onClick={onSuccess}
                type="button"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
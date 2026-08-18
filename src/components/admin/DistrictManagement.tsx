import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, Search, AlertCircle, Pencil, Trash2, FileText } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';
import { FormField } from '../forms/FormField';
import { BulkDistrictImport } from './BulkDistrictImport';
import { cn } from '../../utils/cn';

interface District {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

interface DistrictFormData {
  name: string;
  code: string;
}

export function DistrictManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [formData, setFormData] = useState<DistrictFormData>({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: districts = [], isLoading, refetch } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_districts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const filteredDistricts = districts.filter(district => 
    district.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    district.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingDistrict) {
        const { error } = await supabase
          .from('school_districts')
          .update({
            name: formData.name,
            code: formData.code
          })
          .eq('id', editingDistrict.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('create_school_district', {
          p_name: formData.name,
          p_code: formData.code
        });

        if (error) throw error;
      }

      setFormData({ name: '', code: '' });
      setIsCreating(false);
      setEditingDistrict(null);
      refetch();
    } catch (error) {
      console.error('Error saving district:', error);
      setError(error instanceof Error ? error.message : 'Failed to save district');
    }
  };

  const handleDelete = async (district: District) => {
    if (!confirm(`Are you sure you want to delete ${district.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('school_districts')
        .delete()
        .eq('id', district.id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error deleting district:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete district');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="w-6 h-6 text-svef-purple" />
          <h2 className="font-oswald text-2xl font-medium text-svef-gray">
            School Districts
          </h2>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => setIsBulkImportOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add District
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {(isCreating || editingDistrict) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-medium text-lg text-svef-gray mb-4">
            {editingDistrict ? 'Edit District' : 'Add New District'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="District Name">
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                required
              />
            </FormField>

            <FormField label="District Code">
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                required
              />
            </FormField>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreating(false);
                  setEditingDistrict(null);
                  setFormData({ name: '', code: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingDistrict ? 'Save Changes' : 'Create District'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search districts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-svef-purple focus:border-svef-purple"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDistricts.map((district) => (
                <tr key={district.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {district.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {district.code}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(district.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingDistrict(district);
                          setFormData({
                            name: district.name,
                            code: district.code
                          });
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleDelete(district)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDistricts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No districts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BulkDistrictImport
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
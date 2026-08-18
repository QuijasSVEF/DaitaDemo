import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Save, ListOrdered } from 'lucide-react';
import { listFlows, createFlow, updateFlow, deleteFlow, SopFlow } from '../../services/supabase/sop';

interface Props {
  onChanged: () => void;
  onOpenFlow: (flow: SopFlow) => void;
}

export function SopAuthor({ onChanged, onOpenFlow }: Props) {
  const { data: flows = [], refetch } = useQuery({
    queryKey: ['sop-flows-author'],
    queryFn: listFlows,
  });
  const [editing, setEditing] = useState<SopFlow | null>(null);
  const [form, setForm] = useState<Partial<SopFlow>>({
    slug: '', title: '', description: '', role: 'all', order_index: 0, published: true,
  });
  const [saving, setSaving] = useState(false);

  const startNew = () => {
    setEditing(null);
    setForm({ slug: '', title: '', description: '', role: 'all', order_index: flows.length + 1, published: true });
  };

  const startEdit = (flow: SopFlow) => {
    setEditing(flow);
    setForm(flow);
  };

  const save = async () => {
    if (!form.slug || !form.title) {
      alert('Slug and title are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateFlow(editing.id, form);
      } else {
        await createFlow({
          slug: form.slug!,
          title: form.title!,
          description: form.description || '',
          role: form.role || 'all',
          order_index: form.order_index ?? 0,
          published: form.published ?? true,
        });
      }
      await refetch();
      onChanged();
      setEditing(null);
      setForm({ slug: '', title: '', description: '', role: 'all', order_index: 0, published: true });
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (flow: SopFlow) => {
    if (!confirm(`Delete flow "${flow.title}" and all its steps?`)) return;
    await deleteFlow(flow.id);
    await refetch();
    onChanged();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Flows</h3>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> New flow
          </button>
        </div>
        <div className="space-y-2">
          {flows.map(flow => (
            <div
              key={flow.id}
              className="border border-gray-200 rounded-md p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{flow.title}</div>
                <div className="text-[11px] text-gray-500 truncate">
                  {flow.role} · {flow.slug} · {flow.published ? 'Published' : 'Draft'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenFlow(flow)}
                  className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                  title="Edit steps & screenshots"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startEdit(flow)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(flow)}
                  className="p-1.5 rounded hover:bg-red-50 text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {editing ? 'Edit flow' : 'New flow'}
        </h3>
        <div className="space-y-3">
          <input
            value={form.slug || ''}
            onChange={e => setForm({ ...form, slug: e.target.value })}
            placeholder="slug (e.g., teacher-create-assessment)"
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
          />
          <input
            value={form.title || ''}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
          />
          <textarea
            value={form.description || ''}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Description"
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 min-h-[80px]"
          />
          <div className="flex gap-3">
            <select
              value={form.role || 'all'}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="text-sm border border-gray-200 rounded-md px-3 py-2"
            >
              <option value="all">all</option>
              <option value="teacher">teacher</option>
              <option value="student">student</option>
              <option value="mentor">mentor</option>
              <option value="coach">coach</option>
              <option value="admin">admin</option>
            </select>
            <input
              type="number"
              value={form.order_index ?? 0}
              onChange={e => setForm({ ...form, order_index: Number(e.target.value) })}
              className="w-24 text-sm border border-gray-200 rounded-md px-3 py-2"
              placeholder="Order"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.published ?? true}
                onChange={e => setForm({ ...form, published: e.target.checked })}
              />
              Published
            </label>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {editing ? 'Save flow' : 'Create flow'}
          </button>
        </div>
      </div>
    </div>
  );
}

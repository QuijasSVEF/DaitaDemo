import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, ChevronRight, Search, Settings, Play,
} from 'lucide-react';
import { listFlows, getProgress, SopFlow } from '../../services/supabase/sop';
import { SopFlowViewer } from './SopFlowViewer';
import { SopAuthor } from './SopAuthor';

interface Props {
  onClose: () => void;
  userKey: string;
  userRole: 'teacher' | 'student' | 'admin' | 'coach' | 'mentor' | 'anon';
  isAdmin: boolean;
}

export function SopDrawer({ onClose, userKey, userRole, isAdmin }: Props) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'role' | 'all'>('role');
  const [activeFlow, setActiveFlow] = useState<SopFlow | null>(null);
  const [authorMode, setAuthorMode] = useState(false);

  const { data: flows = [], isLoading, refetch } = useQuery({
    queryKey: ['sop-flows'],
    queryFn: listFlows,
  });

  const { data: progress = {} } = useQuery({
    queryKey: ['sop-progress', userKey],
    queryFn: () => getProgress(userKey),
    enabled: !!userKey,
  });

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const filtered = useMemo(() => {
    let list = flows.filter(f => f.published || isAdmin);
    if (scope === 'role' && userRole !== 'anon') {
      list = list.filter(f => f.role === userRole || f.role === 'all');
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q)
      );
    }
    return list;
  }, [flows, scope, search, userRole, isAdmin]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="w-full sm:w-[480px] bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-oswald font-semibold text-gray-900">Interactive SOP</h2>
            <p className="text-xs text-gray-500">Step-by-step product walkthroughs</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && !activeFlow && (
              <button
                onClick={() => setAuthorMode(v => !v)}
                className={`p-2 rounded-md transition-colors ${authorMode ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-500'}`}
                title={authorMode ? 'Exit author mode' : 'Author flows'}
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label="Close SOP drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeFlow ? (
          <SopFlowViewer
            flow={activeFlow}
            onBack={() => setActiveFlow(null)}
            userKey={userKey}
            userRole={userRole}
            isAdmin={isAdmin}
          />
        ) : authorMode && isAdmin ? (
          <SopAuthor
            onChanged={() => refetch()}
            onOpenFlow={(flow) => setActiveFlow(flow)}
          />
        ) : (
          <>
            <div className="px-6 pt-4 pb-3 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search flows"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {userRole !== 'anon' && (
                <div className="mt-3 flex text-xs">
                  <button
                    onClick={() => setScope('role')}
                    className={`flex-1 py-1.5 rounded-l-md border ${scope === 'role' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    For {userRole}
                  </button>
                  <button
                    onClick={() => setScope('all')}
                    className={`flex-1 py-1.5 rounded-r-md border-t border-b border-r ${scope === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    All
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {isLoading && (
                <div className="text-center py-10 text-sm text-gray-500">Loading flows...</div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="text-center py-10 text-sm text-gray-500">No SOP flows yet.</div>
              )}
              {filtered.map(flow => {
                const done = progress[flow.id]?.size || 0;
                return (
                  <button
                    key={flow.id}
                    onClick={() => setActiveFlow(flow)}
                    className="w-full text-left bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all rounded-lg p-4 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-gray-100 text-gray-600">
                            {flow.role}
                          </span>
                          {!flow.published && (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-amber-100 text-amber-700">
                              Draft
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                          {flow.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{flow.description}</p>
                        {done > 0 && (
                          <p className="text-[11px] text-green-700 mt-2">{done} steps completed</p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center text-blue-600">
                        <Play className="w-4 h-4" />
                        <ChevronRight className="w-4 h-4 -ml-1" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

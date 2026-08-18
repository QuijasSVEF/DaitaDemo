import { useState } from 'react';
import { X, Shield } from 'lucide-react';
import {
  PRIVACY_POLICY_HTML,
  TERMS_OF_SERVICE_HTML,
  STUDENT_DATA_PROTECTION_HTML,
  TOS_VERSION,
} from '../../constants/tosContent';

type Tab = 'privacy' | 'terms' | 'data-protection';

interface PolicyViewerModalProps {
  onClose: () => void;
}

const TAB_LABELS: Record<Tab, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  'data-protection': 'Data Protection',
};

const TAB_CONTENT: Record<Tab, string> = {
  privacy: PRIVACY_POLICY_HTML,
  terms: TERMS_OF_SERVICE_HTML,
  'data-protection': STUDENT_DATA_PROTECTION_HTML,
};

export function PolicyViewerModal({ onClose }: PolicyViewerModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('privacy');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-svef-beige flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-svef-gray" />
            </div>
            <div>
              <h2 className="font-oswald text-lg font-semibold text-svef-gray">
                Legal Policies
              </h2>
              <p className="text-xs text-gray-500 font-open-sans">
                D[ai]TA v{TOS_VERSION} &middot; Silicon Valley Education Foundation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-6">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-svef-gray text-svef-gray'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div
            className="prose prose-sm max-w-none prose-headings:font-oswald prose-headings:text-svef-gray prose-h2:text-lg prose-h3:text-base prose-h4:text-sm prose-p:text-gray-600 prose-li:text-gray-600 prose-table:text-sm prose-td:px-3 prose-td:py-2 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-50 prose-th:text-left prose-table:border prose-td:border prose-th:border"
            dangerouslySetInnerHTML={{ __html: TAB_CONTENT[activeTab] }}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 flex justify-between items-center">
          <p className="text-xs text-gray-400">
            1400 Parkmoor Ave Suite 200, San Jose, CA &middot; info@svefoundation.org
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import {
  PRIVACY_POLICY_HTML,
  TERMS_OF_SERVICE_HTML,
  STUDENT_DATA_PROTECTION_HTML,
  TOS_VERSION,
} from '../../constants/tosContent';

type Tab = 'privacy' | 'terms' | 'data-protection';

interface TermsOfServiceModalProps {
  userRole: 'teacher' | 'coach' | 'mentor';
  onAccept: () => void;
  onDecline: () => void;
  isSubmitting?: boolean;
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

const ROLE_COLORS: Record<string, { button: string; ring: string; tab: string }> = {
  teacher: {
    button: 'bg-svef-green hover:bg-svef-green/90',
    ring: 'focus:ring-svef-green',
    tab: 'border-svef-green text-svef-green',
  },
  coach: {
    button: 'bg-svef-brown hover:bg-svef-brown/90',
    ring: 'focus:ring-svef-brown',
    tab: 'border-svef-brown text-svef-brown',
  },
  mentor: {
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'focus:ring-blue-600',
    tab: 'border-blue-600 text-blue-600',
  },
};

export function TermsOfServiceModal({
  userRole,
  onAccept,
  onDecline,
  isSubmitting = false,
}: TermsOfServiceModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('terms');
  const [agreed, setAgreed] = useState(false);

  const colors = ROLE_COLORS[userRole] || ROLE_COLORS.teacher;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-svef-beige flex items-center justify-center">
              <Shield className="w-5 h-5 text-svef-gray" />
            </div>
            <div>
              <h2 className="font-oswald text-xl font-semibold text-svef-gray">
                Terms of Service Agreement
              </h2>
              <p className="text-sm text-gray-500 font-open-sans">
                Please review and accept to continue
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-6">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? `${colors.tab} border-current`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div
            className="prose prose-sm max-w-none prose-headings:font-oswald prose-headings:text-svef-gray prose-h2:text-lg prose-h3:text-base prose-h4:text-sm prose-p:text-gray-600 prose-li:text-gray-600 prose-table:text-sm prose-td:px-3 prose-td:py-2 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-50 prose-th:text-left prose-table:border prose-td:border prose-th:border"
            dangerouslySetInnerHTML={{ __html: TAB_CONTENT[activeTab] }}
          />
        </div>

        {/* Footer: Checkbox + Buttons */}
        <div className="border-t border-gray-200 px-6 py-4 space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-svef-green ${colors.ring} focus:ring-2 transition-colors`}
            />
            <span className="text-sm text-gray-700 font-open-sans leading-relaxed group-hover:text-gray-900">
              I have read and agree to the Terms of Service, Privacy Policy, and Student Data Protection Addendum.
            </span>
          </label>

          <div className="flex items-center justify-between">
            <button
              onClick={onDecline}
              disabled={isSubmitting}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-50"
            >
              Decline and Sign Out
            </button>

            <button
              onClick={onAccept}
              disabled={!agreed || isSubmitting}
              className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${colors.button} ${
                agreed && !isSubmitting ? 'shadow-md hover:shadow-lg transform hover:-translate-y-0.5' : ''
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Accepting...</span>
                </span>
              ) : (
                'I Accept'
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            v{TOS_VERSION} &middot; Effective June 2026
          </p>
        </div>
      </div>
    </div>
  );
}

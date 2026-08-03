import { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import {
  STUDENT_SIMPLIFIED_NOTICE,
  PRIVACY_POLICY_HTML,
  TERMS_OF_SERVICE_HTML,
  STUDENT_DATA_PROTECTION_HTML,
} from '../../constants/tosContent';

interface StudentAcknowledgmentModalProps {
  onAcknowledge: () => void;
  isSubmitting?: boolean;
}

export function StudentAcknowledgmentModal({
  onAcknowledge,
  isSubmitting = false,
}: StudentAcknowledgmentModalProps) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in duration-300">
        {/* Header */}
        <div className="text-center px-6 pt-6 pb-3 shrink-0">
          <div className="mx-auto w-14 h-14 rounded-full bg-svef-purple/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-svef-purple" />
          </div>
          <h2 className="font-oswald text-xl font-semibold text-svef-gray">
            Before You Start
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <div
            className="prose prose-sm max-w-none prose-headings:font-oswald prose-headings:text-svef-gray prose-li:text-gray-600 prose-p:text-gray-600 prose-strong:text-gray-800"
            dangerouslySetInnerHTML={{ __html: STUDENT_SIMPLIFIED_NOTICE }}
          />

          {/* Expandable Full Legal Docs */}
          <button
            onClick={() => setShowFull(!showFull)}
            className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-600 mt-3 mb-2 transition-colors"
          >
            {showFull ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            <span>{showFull ? 'Hide full legal documents' : 'View full legal documents'}</span>
          </button>

          {showFull && (
            <div className="border-t border-gray-100 pt-4 mb-4">
              <div
                className="prose prose-xs max-w-none prose-headings:font-oswald prose-headings:text-svef-gray prose-h2:text-sm prose-h3:text-xs prose-p:text-gray-500 prose-li:text-gray-500 text-[11px]"
                dangerouslySetInnerHTML={{
                  __html: PRIVACY_POLICY_HTML + TERMS_OF_SERVICE_HTML + STUDENT_DATA_PROTECTION_HTML,
                }}
              />
            </div>
          )}
        </div>

        {/* Action */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onAcknowledge}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-svef-purple text-white font-semibold text-sm hover:bg-svef-purple/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              'Got it!'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

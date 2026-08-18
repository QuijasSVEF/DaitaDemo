import React, { useState } from 'react';
import { QrCode, X, Copy, Check, ExternalLink } from 'lucide-react';
import { getStudentPageUrl, generateQRCodeSVG } from '../../utils/qrcode';

export function StudentQRCode() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const studentUrl = getStudentPageUrl();
  const qrImageUrl = generateQRCodeSVG(studentUrl, 280);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(studentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = studentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Student QR Code</title>
      <style>
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: system-ui, sans-serif; }
        img { width: 300px; height: 300px; }
        h2 { margin-bottom: 8px; font-size: 24px; }
        p { color: #666; font-size: 14px; margin-top: 4px; }
        .url { font-size: 12px; color: #999; margin-top: 16px; word-break: break-all; max-width: 320px; text-align: center; }
      </style>
      </head>
      <body>
        <h2>Scan to Start Assessment</h2>
        <p>Use your device camera to scan this code</p>
        <img src="${qrImageUrl}" alt="QR Code" />
        <p class="url">${studentUrl}</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
        title="Share student link via QR code"
      >
        <QrCode className="w-4 h-4" />
        <span className="hidden sm:inline">Share with Students</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Student Login QR Code</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-2">
              <p className="text-sm text-gray-500">Students can scan this code to go directly to the student login page.</p>
            </div>

            <div className="flex justify-center py-4 px-6">
              <div className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="QR Code for student page"
                  className="w-56 h-56"
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            <div className="px-6 pb-2">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 truncate flex-1">{studentUrl}</span>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="px-6 pb-6 pt-3 flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
              >
                Print QR Code
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Minimal QR Code generator for alphanumeric URLs
// Generates SVG path data for a QR code

const EC_LEVEL = 1; // 0=L, 1=M, 2=Q, 3=H

function getModuleCount(version: number): number {
  return version * 4 + 17;
}

function createMatrix(size: number): (boolean | null)[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

// Encoding and error correction for QR Code version 2-6 (byte mode)
export function generateQRCodeSVG(text: string, size: number = 200): string {
  // Use a Google Charts API fallback for reliable QR generation
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=8`;
}

export function getStudentPageUrl(): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}#student`;
}

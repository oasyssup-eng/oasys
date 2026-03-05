import { useState, useEffect } from 'react';
import { formatCountdown } from '../lib/format';

interface QRCodeDisplayProps {
  qrCodeBase64: string;
  qrCodePayload: string;
  expiresAt: string;
}

export function QRCodeDisplay({ qrCodeBase64, qrCodePayload, expiresAt }: QRCodeDisplayProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodePayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  const isExpired = secondsLeft <= 0;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* QR Code Image */}
      <div className={`p-4 bg-white rounded-xl shadow-sm ${isExpired ? 'opacity-30' : ''}`}>
        <img
          src={`data:image/png;base64,${qrCodeBase64}`}
          alt="QR Code PIX"
          className="w-48 h-48"
        />
      </div>

      {/* Timer */}
      <div
        className={`text-lg font-mono font-bold ${
          isExpired
            ? 'text-red-500'
            : secondsLeft < 120
            ? 'text-orange-500'
            : 'text-gray-700'
        }`}
      >
        {isExpired ? 'Expirado' : formatCountdown(secondsLeft)}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        disabled={isExpired}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {copied ? (
          <>
            <span className="text-green-500">✓</span>
            Copiado!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar codigo PIX
          </>
        )}
      </button>
    </div>
  );
}

import React from 'react';

interface QrCodeModalProps {
  qrCode: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ qrCode, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-sm flex flex-col items-center">
        <div className="flex justify-between items-center w-full border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold">Scan to Connect Baileys</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none" aria-label="Close modal">&times;</button>
        </div>
        <p className="text-muted-foreground text-center mb-4">Scan this QR code with your WhatsApp application on your phone.</p>
        <img src={qrCode} alt="Baileys QR Code" className="w-64 h-64 border rounded-md" />
         <div className="mt-4 pt-4 border-t w-full flex justify-end">
            <button onClick={onClose} className="bg-secondary px-4 py-2 rounded-md font-semibold hover:bg-accent">Close</button>
        </div>
      </div>
    </div>
  );
};
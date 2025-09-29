import React, { useState, useEffect } from 'react';
import type { Contact, ManagedFile } from '../types';

interface MatchedResult {
  contact: Contact;
  file: ManagedFile;
}

interface FileMatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalMatched: MatchedResult[]) => void;
  results: {
    matched: MatchedResult[];
    unmatched: Contact[];
  } | null;
  isSending: boolean;
  managedFiles: ManagedFile[];
}

const FileMatchResultModal: React.FC<FileMatchResultModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  results,
  isSending,
  managedFiles,
}) => {
  const [currentMatched, setCurrentMatched] = useState<MatchedResult[]>([]);
  const [currentUnmatched, setCurrentUnmatched] = useState<Contact[]>([]);

  useEffect(() => {
    if (results) {
      setCurrentMatched(results.matched);
      setCurrentUnmatched(results.unmatched);
    }
  }, [results]);

  if (!isOpen || !results) return null;

  const handleManualMatch = (contactToMatch: Contact, fileId: string) => {
    if (!fileId) return; // Placeholder selected

    const file = managedFiles.find(f => f.id === fileId);
    if (!file) return;

    // Move contact from unmatched to matched
    setCurrentUnmatched(prev => prev.filter(c => c.id !== contactToMatch.id));
    setCurrentMatched(prev => [...prev, { contact: contactToMatch, file }].sort((a, b) => a.contact.name.localeCompare(b.contact.name)));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold">Konfirmasi Pengiriman File</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none" aria-label="Close modal">&times;</button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Tinjau hasil pencocokan file. Anda dapat mencocokkan file secara manual untuk kontak yang tidak ditemukan. Kampanye hanya akan dikirim ke kontak yang memiliki file.
        </p>

        <div className="overflow-y-auto flex-grow space-y-4">
          {/* Matched Contacts */}
          <div>
            <h3 className="font-semibold text-green-600 mb-2">
              <i className="fas fa-check-circle mr-2"></i>
              {currentMatched.length} Kontak Cocok (Akan Dikirim)
            </h3>
            {currentMatched.length > 0 ? (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                <ul className="divide-y divide-border text-sm">
                  {currentMatched.map(({ contact, file }) => (
                    <li key={contact.id} className="p-2 flex justify-between items-center">
                      <span>{contact.name} ({contact.number})</span>
                      <span className="text-muted-foreground text-xs font-mono bg-gray-200 px-1 rounded">{file.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 border rounded-md">Tidak ada kontak yang cocok.</p>
            )}
          </div>
          
          {/* Unmatched Contacts */}
          {currentUnmatched.length > 0 && (
             <div>
                <h3 className="font-semibold text-yellow-700 mb-2">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {currentUnmatched.length} Kontak Tidak Cocok (Butuh Pencocokan Manual)
                </h3>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  <ul className="divide-y divide-border text-sm">
                    {currentUnmatched.map(contact => (
                      <li key={contact.id} className="p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <span>{contact.name} ({contact.number})</span>
                        <select 
                          onChange={(e) => handleManualMatch(contact, e.target.value)}
                          defaultValue=""
                          className="bg-input border border-border rounded-md px-2 py-1 text-xs w-full sm:w-auto"
                        >
                            <option value="" disabled>Pilih file untuk dicocokkan...</option>
                            {managedFiles.map(file => (
                                <option key={file.id} value={file.id}>{file.name}</option>
                            ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <p className="text-sm font-semibold">Total akan dikirim: {currentMatched.length} pesan.</p>
            <div className="flex space-x-3">
                <button onClick={onClose} disabled={isSending} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent disabled:opacity-50">Batal</button>
                <button onClick={() => onConfirm(currentMatched)} disabled={isSending || currentMatched.length === 0} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center">
                  {isSending ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-paper-plane mr-2"></i>}
                  {isSending ? 'Mengirim...' : 'Konfirmasi & Kirim'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FileMatchResultModal;
import React, { useState, useMemo, useEffect } from 'react';
import type { Contact } from '../types';

interface ContactSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: string[]) => void;
  contacts: Contact[];
  initialSelectedIds: string[];
}

const ContactSelectionModal: React.FC<ContactSelectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  contacts,
  initialSelectedIds,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    // Sync state with props when modal opens
    if (isOpen) {
        setSelectedIds(initialSelectedIds);
    }
  }, [initialSelectedIds, isOpen]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.number.includes(searchTerm)
    );
  }, [contacts, searchTerm]);

  const handleToggleSelectAll = () => {
    const filteredIds = filteredContacts.map(c => c.id);
    const allFilteredSelected = filteredContacts.length > 0 && filteredIds.every(id => selectedIds.includes(id));

    if (allFilteredSelected) {
      // Deselect all filtered contacts
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered contacts, keeping existing selections
      setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleContactChange = (contactId: string) => {
    setSelectedIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };
  
  const handleSave = () => {
    onSave(selectedIds);
  };

  if (!isOpen) return null;

  const isAllFilteredSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedIds.includes(c.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold">Pilih Kontak</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none" aria-label="Close modal">&times;</button>
        </div>
        
        <input
            type="text"
            placeholder="Cari nama atau nomor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-input border border-border rounded-md px-3 py-2 mb-4 text-sm"
            aria-label="Search contacts"
        />

        <div className="overflow-y-auto flex-grow border rounded-md">
          <div className="sticky top-0 bg-card flex items-center border-b p-3 z-10">
              <input type="checkbox" id="selectAllModal" checked={isAllFilteredSelected} onChange={handleToggleSelectAll} className="mr-3 h-4 w-4" />
              <label htmlFor="selectAllModal" className="font-medium text-sm cursor-pointer">
                Pilih Semua ({filteredContacts.length} kontak)
              </label>
          </div>
          {filteredContacts.length > 0 ? (
            <ul className="divide-y divide-border">
                {filteredContacts.map(contact => (
                <li key={contact.id} className="flex items-center p-3 hover:bg-accent">
                    <input
                    type="checkbox"
                    id={`modal-contact-${contact.id}`}
                    checked={selectedIds.includes(contact.id)}
                    onChange={() => handleContactChange(contact.id)}
                    className="mr-3 h-4 w-4"
                    />
                    <label htmlFor={`modal-contact-${contact.id}`} className="flex-grow cursor-pointer text-sm">
                    {contact.name} ({contact.number}) - <span className="text-muted-foreground text-xs">{contact.group}</span>
                    </label>
                </li>
                ))}
            </ul>
          ) : (
            <p className="p-4 text-center text-muted-foreground">Kontak tidak ditemukan.</p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{selectedIds.length} dari {contacts.length} kontak terpilih.</p>
            <div className="flex space-x-3">
                <button onClick={onClose} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Batal</button>
                <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90">Simpan Pilihan</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSelectionModal;

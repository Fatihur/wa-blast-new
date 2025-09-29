import React, { useState, useRef, useMemo } from 'react';
import type { Contact, Group } from '../types';
import { useNotification } from '../contexts/NotificationContext';

declare const XLSX: any;

interface ContactsProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  groups: Group[];
}

const ContactForm: React.FC<{ onSave: (contact: Contact) => void; onCancel: () => void; contact?: Contact | null, groups: Group[] }> = ({ onSave, onCancel, contact, groups }) => {
  const [name, setName] = useState(contact?.name || '');
  const [number, setNumber] = useState(contact?.number || '');
  const [group, setGroup] = useState(contact?.group || 'General');
  const [customFields, setCustomFields] = useState<{ [key: string]: string }>(contact?.customFields || {});
  const [errors, setErrors] = useState<{name?: string; number?: string}>({});

  const handleCustomFieldChange = (key: string, value: string) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  const handleCustomFieldKeyChange = (oldKey: string, newKey: string) => {
    if (newKey && !customFields.hasOwnProperty(newKey)) {
        const updatedFields = { ...customFields };
        updatedFields[newKey] = updatedFields[oldKey];
        delete updatedFields[oldKey];
        setCustomFields(updatedFields);
    }
  };

  const addCustomField = () => {
    const newKey = `field_${Object.keys(customFields).length + 1}`;
    if (!customFields.hasOwnProperty(newKey)) {
        setCustomFields(prev => ({...prev, [newKey]: ''}));
    }
  };

  const removeCustomField = (key: string) => {
    const updatedFields = { ...customFields };
    delete updatedFields[key];
    setCustomFields(updatedFields);
  }
  
  const validate = () => {
      const newErrors: {name?: string; number?: string} = {};
      if (!name.trim()) newErrors.name = "Name is required.";
      if (!number.trim()) newErrors.number = "WhatsApp number is required.";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ id: contact?.id || `contact_${Date.now()}`, name, number, group, customFields });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6 mb-6">
      <h3 className="text-lg font-semibold">{contact ? 'Edit Contact' : 'Add New Contact'}</h3>
      <div>
        <label htmlFor="name" className="block text-sm font-semibold mb-2">Name</label>
        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full bg-background border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring ${errors.name ? 'border-destructive' : 'border-border'}`} />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="number" className="block text-sm font-semibold mb-2">WhatsApp Number</label>
        <input id="number" type="text" value={number} onChange={e => setNumber(e.target.value)} className={`w-full bg-background border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring ${errors.number ? 'border-destructive' : 'border-border'}`} placeholder="e.g., 628123456789" />
        {errors.number && <p className="text-sm text-destructive mt-1">{errors.number}</p>}
      </div>
      <div>
        <label htmlFor="group" className="block text-sm font-semibold mb-2">Group</label>
        <select id="group" value={group} onChange={e => setGroup(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring">
          {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        <h4 className="text-md font-semibold">Custom Fields</h4>
        {Object.entries(customFields).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
                <input type="text" value={key} onChange={e => handleCustomFieldKeyChange(key, e.target.value)} className="w-1/3 bg-input border border-border rounded-md px-2 py-1 text-sm" placeholder="Field Name"/>
                <input type="text" value={value} onChange={e => handleCustomFieldChange(key, e.target.value)} className="w-2/3 bg-input border border-border rounded-md px-2 py-1 text-sm" placeholder="Field Value"/>
                <button type="button" onClick={() => removeCustomField(key)} className="text-muted-foreground hover:text-destructive"><i className="fas fa-times"></i></button>
            </div>
        ))}
         <button type="button" onClick={addCustomField} className="text-sm text-primary font-semibold hover:underline">+ Add Field</button>
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button type="button" onClick={onCancel} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Cancel</button>
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90">{contact ? 'Save Changes' : 'Add Contact'}</button>
      </div>
    </form>
  );
};

const Contacts: React.FC<ContactsProps> = ({ contacts, setContacts, groups }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState('');
  const { addNotification } = useNotification();

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
        const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) || contact.number.includes(searchTerm);
        const matchesGroup = filterGroup === 'all' || contact.group === filterGroup;
        return matchesSearch && matchesGroup;
    });
  }, [contacts, searchTerm, filterGroup]);

  const handleSaveContact = (contact: Contact) => {
    const isEditing = !!editingContact;
    if (isEditing) {
      setContacts(contacts.map(c => (c.id === contact.id ? contact : c)));
    } else {
      setContacts([...contacts, contact]);
    }
    addNotification({ type: 'success', title: 'Kontak Disimpan', message: `Kontak "${contact.name}" telah disimpan.` });
    setShowForm(false);
    setEditingContact(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Anda yakin ingin menghapus kontak "${name}"?`)) {
      setContacts(contacts.filter(c => c.id !== id));
      addNotification({ type: 'success', title: 'Kontak Dihapus', message: `Kontak "${name}" telah dihapus.` });
    }
  };

  const handleBulkDelete = () => {
    if (selectedContacts.length === 0) return;
    if (window.confirm(`Anda yakin ingin menghapus ${selectedContacts.length} kontak yang dipilih?`)) {
      setContacts(contacts.filter(c => !selectedContacts.includes(c.id)));
      addNotification({ type: 'success', title: 'Kontak Dihapus', message: `${selectedContacts.length} kontak telah dihapus.` });
      setSelectedContacts([]);
    }
  };

  const handleMoveToGroup = () => {
    if (selectedContacts.length === 0 || !targetGroupId) return;
    const targetGroup = groups.find(g => g.id === targetGroupId);
    if (!targetGroup) return;

    setContacts(contacts.map(c => 
        selectedContacts.includes(c.id) ? { ...c, group: targetGroup.name } : c
    ));
    addNotification({ type: 'success', title: 'Kontak Dipindahkan', message: `${selectedContacts.length} kontak dipindahkan ke grup "${targetGroup.name}".` });
    setSelectedContacts([]);
    setShowMoveModal(false);
  };
  
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
          addNotification({type: 'error', title: 'Impor Gagal', message: 'File CSV kosong atau hanya berisi header.'});
          return;
      }
      const header = lines[0].split(',').map(h => h.trim());
      const newContacts: Contact[] = lines.slice(1).map((line): Contact | null => {
        const values = line.split(',');
        const contactData: any = {};
        header.forEach((h, i) => contactData[h] = values[i]?.trim());
        
        if (contactData.name && contactData.number) {
            const { name, number, group, ...customFields } = contactData;
            return { id: `contact_${Date.now()}_${Math.random()}`, name, number, group: group || 'Imported', customFields };
        }
        return null;
      }).filter((c): c is Contact => c !== null);
      
      setContacts(prev => [...prev, ...newContacts]);
      addNotification({ type: 'success', title: 'Impor Berhasil', message: `${newContacts.length} kontak berhasil diimpor!` });
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const customFieldKeys = [...new Set(contacts.flatMap(c => Object.keys(c.customFields || {})))];
    const headers = ['name', 'number', 'group', ...customFieldKeys];
    
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts Template");
    XLSX.writeFile(wb, "contacts_template.xlsx");
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
        setSelectedContacts([]);
    } else {
        setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daftar Kontak</h1>
          <p className="text-muted-foreground">Kelola daftar kontak dan segmen Anda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            <button onClick={handleDownloadTemplate} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Download Template</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Import CSV</button>
            <button onClick={() => { setShowForm(true); setEditingContact(null); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-primary/90">
            <i className="fas fa-plus mr-2"></i>
            Tambah Kontak
            </button>
        </div>
      </header>

      {showForm && <ContactForm onSave={handleSaveContact} onCancel={() => setShowForm(false)} contact={editingContact} groups={groups} />}

      <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold">Daftar Kontak</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <input type="text" placeholder="Search name or number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-input border border-border rounded-md px-3 py-1.5 text-sm w-full sm:w-auto" />
                <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="bg-input border border-border rounded-md px-3 py-1.5 text-sm w-full sm:w-auto">
                    <option value="all">All Groups</option>
                    {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
            </div>
        </div>
        
        {selectedContacts.length > 0 && (
            <div className="bg-accent p-2 rounded-md mb-4 flex items-center justify-between">
                <span className="text-sm font-medium">{selectedContacts.length} contacts selected.</span>
                <div className="space-x-2">
                    <button onClick={() => setShowMoveModal(true)} className="text-sm text-primary font-semibold hover:underline">Move to Group</button>
                    <button onClick={handleBulkDelete} className="text-sm text-destructive font-semibold hover:underline">Delete</button>
                </div>
            </div>
        )}

        {contacts.length === 0 ? (
            <p className="text-muted-foreground">Tidak ada kontak. Tambahkan satu untuk memulai.</p>
        ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left responsive-table styled-table">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 w-1"><input type="checkbox" checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0} onChange={toggleSelectAll} /></th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Number</th>
                    <th className="p-4">Group</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map(contact => (
                    <tr key={contact.id} className="border-b">
                      <td className="p-4"><input type="checkbox" checked={selectedContacts.includes(contact.id)} onChange={() => setSelectedContacts(prev => prev.includes(contact.id) ? prev.filter(id => id !== contact.id) : [...prev, contact.id])} /></td>
                      <td data-label="Name" className="p-4 font-medium text-foreground">{contact.name}</td>
                      <td data-label="Number" className="p-4 text-foreground">{contact.number}</td>
                      <td data-label="Group" className="p-4">
                        <span className="bg-muted px-2 py-1 text-xs font-medium rounded-full">{contact.group}</span>
                      </td>
                      <td data-label="Actions" className="p-4 flex space-x-3 justify-end md:justify-start">
                        <button onClick={() => { setEditingContact(contact); setShowForm(true); }} className="text-muted-foreground hover:text-primary">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button onClick={() => handleDelete(contact.id, contact.name)} className="text-muted-foreground hover:text-destructive">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card p-6 rounded-lg shadow-lg w-full max-w-sm">
                <h3 className="text-lg font-semibold mb-4">Move Contacts</h3>
                <select onChange={e => setTargetGroupId(e.target.value)} defaultValue="" className="w-full bg-input border border-border rounded-md px-3 py-2 mb-4">
                    <option value="" disabled>Select a group...</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <div className="flex justify-end space-x-3">
                    <button onClick={() => setShowMoveModal(false)} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Cancel</button>
                    <button onClick={handleMoveToGroup} disabled={!targetGroupId} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-50">Move</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Contacts;
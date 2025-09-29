import React, { useState } from 'react';
import type { Group } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface GroupsProps {
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
}

const Groups: React.FC<GroupsProps> = ({ groups, setGroups }) => {
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const { addNotification } = useNotification();

  const handleSave = () => {
    if (!groupName.trim()) {
        setError("Group name cannot be empty.");
        return;
    }
    setError('');
    const isEditing = !!editingGroup;
    if (isEditing) {
      setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, name: groupName } : g));
    } else {
      const newGroup: Group = { id: `group_${Date.now()}`, name: groupName };
      setGroups([...groups, newGroup]);
    }
    addNotification({ type: 'success', title: 'Grup Disimpan', message: `Grup "${groupName}" telah disimpan.` });
    setEditingGroup(null);
    setGroupName('');
    setIsAdding(false);
  };
  
  const handleDelete = (id: string, name: string) => {
    if (id === 'general') {
        addNotification({type: 'warning', title: 'Aksi Ditolak', message: "Tidak dapat menghapus grup default 'General'."});
        return;
    }
    if (window.confirm(`Anda yakin ingin menghapus grup "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
        setGroups(groups.filter(g => g.id !== id));
        addNotification({ type: 'success', title: 'Grup Dihapus', message: `Grup "${name}" telah dihapus.` });
    }
  };
  
  const startEdit = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setIsAdding(false);
    setError('');
  };
  
  const startAdd = () => {
    setIsAdding(true);
    setEditingGroup(null);
    setGroupName('');
    setError('');
  };
  
  const cancelEdit = () => {
    setEditingGroup(null);
    setGroupName('');
    setIsAdding(false);
    setError('');
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Grup Kontak</h1>
          <p className="text-muted-foreground">Kelola grup untuk segmentasi kontak Anda.</p>
        </div>
        <button onClick={startAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-primary/90">
            <i className="fas fa-plus mr-2"></i>
            Tambah Grup
        </button>
      </header>

    {(isAdding || editingGroup) && (
        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{editingGroup ? 'Edit Group' : 'Add New Group'}</h3>
            <div className="space-y-2">
                <div className="flex items-start space-x-2">
                    <input 
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Nama Grup"
                        className={`w-full bg-background border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring ${error ? 'border-destructive' : 'border-border'}`}
                        autoFocus
                    />
                    <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90">Save</button>
                    <button onClick={cancelEdit} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Cancel</button>
                </div>
                 {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        </div>
    )}

      <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Daftar Grup</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left styled-table">
            <thead>
              <tr className="border-b">
                <th className="p-4">Nama Grup</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => (
                <tr key={group.id} className="border-b">
                  <td className="p-4 font-medium text-foreground">{group.name}</td>
                  <td className="p-4 flex space-x-3">
                    <button onClick={() => startEdit(group)} className="text-muted-foreground hover:text-primary">
                      <i className="fas fa-edit"></i>
                    </button>
                    {group.id !== 'general' && (
                        <button onClick={() => handleDelete(group.id, group.name)} className="text-muted-foreground hover:text-destructive">
                            <i className="fas fa-trash"></i>
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Groups;
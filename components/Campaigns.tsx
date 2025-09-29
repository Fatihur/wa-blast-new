import React, { useState } from 'react';
import type { Campaign, Contact, ApiSettings, ManagedFile, DraftCampaign } from '../types';
import { MessageStatus } from '../types';
import CampaignCreator from './CampaignCreator';
import { CampaignLogModal } from './CampaignLogModal';

interface CampaignsProps {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  contacts: Contact[];
  apiSettings: ApiSettings;
  managedFiles: ManagedFile[];
  view: string;
  setView: (view: string) => void;
  draftCampaign: Partial<DraftCampaign>;
  setDraftCampaign: React.Dispatch<React.SetStateAction<Partial<DraftCampaign>>>;
}

// Helper to simulate fetching status from Fonnte/Baileys
const fetchStatus = async (messageId: string, apiSettings: ApiSettings): Promise<{ status: MessageStatus }> => {
  console.log(`Checking status for message ${messageId}`);
  // In a real app, this would be provider-specific
  // e.g., if (apiSettings.provider === 'fonnte') { ... }

  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
  const statuses = [MessageStatus.Sent, MessageStatus.Delivered, MessageStatus.Read, MessageStatus.Failed];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  return { status: randomStatus };
};

const Campaigns: React.FC<CampaignsProps> = ({ campaigns, setCampaigns, contacts, apiSettings, managedFiles, view, setView, draftCampaign, setDraftCampaign }) => {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const handleAddCampaign = (newCampaign: Campaign) => {
    setCampaigns(prev => {
        const existing = prev.find(c => c.id === newCampaign.id);
        if (existing) {
            return prev.map(c => c.id === newCampaign.id ? newCampaign : c);
        }
        return [...prev, newCampaign];
    });
    // Clear draft and switch view
    if(newCampaign.status !== 'Sending') {
        setDraftCampaign({});
        setView('blast/history');
    }
  };
  
  const onCreatorCancel = () => {
    setDraftCampaign({});
    setView('blast/history');
  }

  const handleSyncStatus = async (campaignId: string) => {
    setIsSyncing(campaignId);
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        setIsSyncing(null);
        return;
    }

    const updatedLogs = await Promise.all(campaign.logs.map(async log => {
        if (log.apiMessageId && log.status !== MessageStatus.Failed) {
            try {
                const { status } = await fetchStatus(log.apiMessageId, apiSettings);
                return { ...log, status };
            } catch (error) {
                console.error("Failed to sync status for", log.apiMessageId, error);
                return log; // Keep original log on error
            }
        }
        return log;
    }));

    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, logs: updatedLogs } : c));
    setIsSyncing(null);
    alert('Status sync complete!');
  };

  const renderContent = () => {
    if (view === 'history') {
      return (
        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Riwayat Pesan Blast</h2>
          {campaigns.length === 0 ? (
            <p className="text-muted-foreground">Anda belum membuat pesan blast apapun.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left responsive-table styled-table">
                <thead>
                  <tr className="border-b">
                    <th className="p-4">Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Scheduled For</th>
                    <th className="p-4">Recipients</th>
                    <th className="p-4">Sent/Failed</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice().reverse().map(campaign => (
                    <tr key={campaign.id} className="border-b">
                      <td data-label="Name" className="p-4 font-medium">{campaign.name}</td>
                      <td data-label="Status" className="p-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              campaign.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              campaign.status === 'Sending' ? 'bg-blue-100 text-blue-800' :
                              campaign.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                              {campaign.status}
                          </span>
                      </td>
                      <td data-label="Scheduled For" className="p-4 text-sm text-foreground">
                        {campaign.schedule ? new Date(campaign.schedule).toLocaleString() : 'Now'}
                      </td>
                      <td data-label="Recipients" className="p-4">{campaign.contacts.length}</td>
                      <td data-label="Sent/Failed" className="p-4">
                        <span className="text-green-600 font-semibold">{campaign.logs.filter(l => l.status === 'Sent' || l.status === 'Delivered' || l.status === 'Read').length}</span> / <span className="text-red-600 font-semibold">{campaign.logs.filter(l => l.status === 'Failed').length}</span>
                      </td>
                      <td data-label="Actions" className="p-4 flex items-center space-x-2 justify-end md:justify-start">
                        <button onClick={() => setSelectedCampaign(campaign)} className="text-sm text-primary hover:underline font-semibold">
                          View Logs
                        </button>
                        <button 
                            onClick={() => handleSyncStatus(campaign.id)}
                            disabled={isSyncing === campaign.id || campaign.status === 'Draft' || campaign.status === 'Scheduled'}
                            className="text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed w-4 h-4 flex items-center justify-center"
                            title="Sync Status"
                        >
                            {isSyncing === campaign.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }
    
    // For 'single', 'bulk', 'file' views
    return (
      <CampaignCreator 
        mode={view as 'single' | 'bulk' | 'file'}
        onAddCampaign={handleAddCampaign} 
        onCancel={onCreatorCancel} 
        contacts={contacts} 
        apiSettings={apiSettings}
        managedFiles={managedFiles}
        draft={draftCampaign}
        setDraft={setDraftCampaign}
      />
    );
  };
  
  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pesan Blast</h1>
          <p className="text-muted-foreground">Kelola dan kirim pesan blast WhatsApp Anda.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={(apiSettings.provider === 'fonnte' && !apiSettings.fonnteApiKey) || (apiSettings.provider === 'baileys' && apiSettings.baileysSessionStatus !== 'connected')}
          >
            <i className="fas fa-plus mr-2"></i>
            Buat Baru
            <i className="fas fa-chevron-down ml-2 text-xs"></i>
          </button>
          {showNewMenu && (
             <div className="absolute right-0 mt-2 w-56 bg-card rounded-md shadow-lg z-10 border" onMouseLeave={() => setShowNewMenu(false)}>
                <button onClick={() => { setView('blast/single'); setShowNewMenu(false); }} className="w-full text-left block px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50" disabled={contacts.length === 0}>Kirim Satuan</button>
                <button onClick={() => { setView('blast/bulk'); setShowNewMenu(false); }} className="w-full text-left block px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50" disabled={contacts.length === 0}>Kirim Massal</button>
                <button onClick={() => { setView('blast/file'); setShowNewMenu(false); }} className="w-full text-left block px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50" disabled={contacts.length === 0 || managedFiles.length === 0}>Kirim File per Kontak</button>
            </div>
          )}
        </div>
      </header>
      
      {((apiSettings.provider === 'fonnte' && !apiSettings.fonnteApiKey) || (apiSettings.provider === 'baileys' && apiSettings.baileysSessionStatus !== 'connected')) && <p className="text-yellow-600">Mohon atur API key di Settings untuk membuat pesan blast.</p>}
      {contacts.length === 0 && view !== 'history' && <p className="text-yellow-600">Mohon tambahkan kontak terlebih dahulu sebelum membuat pesan blast.</p>}
      
      {renderContent()}
      
      {selectedCampaign && <CampaignLogModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />}
    </div>
  );
};

export default Campaigns;

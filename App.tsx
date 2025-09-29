import React, { useState, useMemo, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Campaigns from './components/Campaigns';
import Contacts from './components/Contacts';
import Groups from './components/Groups';
import SmartReply from './components/SmartReply';
import Settings from './components/Settings';
import FileManager from './components/FileManager';
import type { Contact, Campaign, ApiSettings, Group, ManagedFile, DraftCampaign } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { sendCampaign } from './services/campaignService';
import { NotificationProvider } from './contexts/NotificationContext';

const App: React.FC = () => {
  const [view, setView] = useState<string>('dashboard');
  const [openMenu, setOpenMenu] = useState<string | null>('blast');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [apiSettings, setApiSettings] = useLocalStorage<ApiSettings>('apiSettings', { provider: 'fonnte', fonnteApiKey: '', geminiApiKey: '', baileysSessionStatus: 'disconnected', fonnteDeviceStatus: 'disconnected', antiBan: { delay: 4, quota: 100 } });
  const [contacts, setContacts] = useLocalStorage<Contact[]>('contacts', []);
  const [campaigns, setCampaigns] = useLocalStorage<Campaign[]>('campaigns', []);
  const [groups, setGroups] = useLocalStorage<Group[]>('groups', [{id: 'general', name: 'General'}]);
  const [managedFiles, setManagedFiles] = useLocalStorage<ManagedFile[]>('managedFiles', []);
  const [draftCampaign, setDraftCampaign] = useLocalStorage<Partial<DraftCampaign>>('draftCampaign', {});


  // Effect to handle scheduled campaigns
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      campaigns.forEach(campaign => {
        if (campaign.status === 'Scheduled' && campaign.schedule && new Date(campaign.schedule) <= now) {
          console.log(`Sending scheduled campaign: ${campaign.name}`);
          const updateCampaignCallback = (updatedCampaign: Campaign) => {
            setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
          };
          sendCampaign(campaign, contacts, apiSettings, updateCampaignCallback, {}); // No files for scheduled campaigns for now
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [campaigns, contacts, apiSettings, setCampaigns]);

  const handleSetView = (targetView: string) => {
    setView(targetView);
    if (window.innerWidth < 768) { // md breakpoint
        setIsSidebarOpen(false);
    }
  };

  const NavItem: React.FC<{ icon: string; label: string; targetView: string; isSubItem?: boolean; }> = ({ icon, label, targetView, isSubItem = false }) => (
    <button
      onClick={() => handleSetView(targetView)}
      className={`flex items-center w-full py-2 text-sm font-medium rounded-lg transition-colors ${isSubItem ? 'px-4' : 'px-3'} ${
        view === targetView
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <i className={`fa-fw ${icon}`}></i>
      <span className="ml-3">{label}</span>
    </button>
  );

  const CollapsibleNavItem: React.FC<{icon: string; label: string; menuKey: string; children: React.ReactNode}> = ({ icon, label, menuKey, children }) => {
    const isOpen = openMenu === menuKey;
    return (
      <div>
        <button
          onClick={() => setOpenMenu(isOpen ? null : menuKey)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center">
            <i className={`fa-fw ${icon}`}></i>
            <span className="ml-3">{label}</span>
          </div>
          <i className={`fas fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        </button>
        {isOpen && <div className="mt-1 ml-4 space-y-1">{children}</div>}
      </div>
    )
  }

  const renderView = () => {
    const [mainView, subView] = view.split('/');
    switch (mainView) {
      case 'dashboard':
        return <Dashboard campaigns={campaigns} contacts={contacts} apiSettings={apiSettings} />;
      case 'blast':
        return <Campaigns campaigns={campaigns} setCampaigns={setCampaigns} contacts={contacts} apiSettings={apiSettings} managedFiles={managedFiles} view={subView || 'history'} setView={handleSetView} draftCampaign={draftCampaign} setDraftCampaign={setDraftCampaign} />;
      case 'contacts':
        return <Contacts contacts={contacts} setContacts={setContacts} groups={groups} />;
      case 'groups':
        return <Groups groups={groups} setGroups={setGroups} />;
      case 'file-manager':
        return <FileManager files={managedFiles} setFiles={setManagedFiles} />;
      case 'smart-reply':
        return <SmartReply apiSettings={apiSettings} />;
      case 'settings':
        return <Settings settings={apiSettings} setSettings={setApiSettings} />;
      default:
        return <Dashboard campaigns={campaigns} contacts={contacts} apiSettings={apiSettings} />;
    }
  };

  const isApiConfigured = useMemo(() => {
      const isGeminiSet = !!apiSettings.geminiApiKey;
      const isWaProviderSet = (apiSettings.provider === 'fonnte' && apiSettings.fonnteDeviceStatus === 'connected') ||
                              (apiSettings.provider === 'baileys' && apiSettings.baileysSessionStatus === 'connected');
      return isGeminiSet && isWaProviderSet;
  }, [apiSettings]);

  return (
    <NotificationProvider>
      <div className="relative flex h-screen bg-secondary text-foreground overflow-hidden">
        {/* Sidebar */}
        <aside className={`absolute md:relative w-64 flex-shrink-0 bg-card border-r border-border p-4 flex flex-col transform transition-transform duration-300 ease-in-out z-30 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg flex items-center justify-center w-10 h-10">
                <i className="fas fa-paper-plane fa-lg"></i>
              </div>
              <h1 className="ml-3 text-xl font-bold">WA Blast AI</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-muted-foreground text-xl">
                <i className="fas fa-times"></i>
            </button>
          </div>
          <nav className="flex flex-col space-y-2">
            <NavItem icon="fas fa-chart-pie" label="Dashboard" targetView="dashboard" />
            
            <CollapsibleNavItem icon="fas fa-comment-dots" label="Pesan Blast" menuKey="blast">
              <NavItem icon="fas fa-paper-plane" label="Kirim Satuan" targetView="blast/single" isSubItem />
              <NavItem icon="fas fa-users-rays" label="Kirim Massal" targetView="blast/bulk" isSubItem />
              <NavItem icon="fas fa-file-import" label="Kirim File per Kontak" targetView="blast/file" isSubItem />
              <NavItem icon="fas fa-history" label="Riwayat" targetView="blast/history" isSubItem />
            </CollapsibleNavItem>

            <CollapsibleNavItem icon="fas fa-users" label="Kontak" menuKey="contacts">
              <NavItem icon="fas fa-address-book" label="Daftar Kontak" targetView="contacts" isSubItem />
              <NavItem icon="fas fa-layer-group" label="Grup Kontak" targetView="groups" isSubItem />
            </CollapsibleNavItem>
            
            <NavItem icon="fas fa-folder" label="File Manager" targetView="file-manager" />
            <NavItem icon="fas fa-reply-all" label="Smart Reply" targetView="smart-reply" />
          </nav>
          <div className="mt-auto">
            <NavItem icon="fas fa-cog" label="Settings" targetView="settings" />
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20" onClick={() => setIsSidebarOpen(false)}></div>
        )}


        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between mb-4 pb-4 border-b">
               <div className="flex items-center">
                  <div className="bg-primary text-primary-foreground p-2 rounded-lg flex items-center justify-center w-8 h-8">
                      <i className="fas fa-paper-plane"></i>
                   </div>
                   <h1 className="ml-2 text-lg font-bold">WA Blast AI</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(true)} className="text-xl p-2 text-foreground">
                  <i className="fas fa-bars"></i>
              </button>
          </header>

          {!isApiConfigured && view !== 'settings' && (
             <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mb-6" role="alert">
               <p className="font-bold">Configuration Needed</p>
               <p>Please set your WhatsApp Provider and Gemini API keys in the <button onClick={() => handleSetView('settings')} className="underline font-semibold">Settings</button> page to enable all features.</p>
             </div>
          )}
          {renderView()}
        </main>
      </div>
    </NotificationProvider>
  );
};

export default App;
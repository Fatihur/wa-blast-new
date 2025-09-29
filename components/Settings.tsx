import React, { useState } from 'react';
import type { ApiSettings } from '../types';
import * as baileysService from '../services/baileysService';
import { QrCodeModal } from './QrCodeModal';

interface SettingsProps {
  settings: ApiSettings;
  setSettings: React.Dispatch<React.SetStateAction<ApiSettings>>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const validateSettings = () => {
      if (localSettings.provider === 'fonnte' && !localSettings.fonnteApiKey) {
          return "Fonnte API Key is required.";
      }
      if (localSettings.provider === 'baileys' && (!localSettings.baileysServerUrl || !localSettings.baileysApiKey)) {
          return "Baileys Server URL and API Key are required.";
      }
      if (!localSettings.geminiApiKey) {
          return "Gemini API Key is required.";
      }
      return null;
  }

  const handleSave = () => {
    const validationError = validateSettings();
    if (validationError) {
        setSaveError(validationError);
        return;
    }
    setSaveError(null);
    setConnectionError(null); // Clear connection errors on save
    setSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name.startsWith('antiBan.')) {
        const key = name.split('.')[1];
        setLocalSettings(prev => ({
            ...prev,
            antiBan: { ...prev.antiBan, [key]: type === 'number' ? parseInt(value) : value }
        }));
    } else {
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBaileysConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
        const result = await baileysService.login(localSettings);
        if (result.status === 'connected') {
            const newSettings = {...localSettings, baileysSessionStatus: 'connected' as const, baileysQrCode: undefined};
            setLocalSettings(newSettings);
            // Also update the main settings state
            setSettings(newSettings);
        } else if (result.status === 'qr' && result.qr) {
            setQrCode(result.qr);
            setLocalSettings(prev => ({...prev, baileysSessionStatus: 'connecting', baileysQrCode: result.qr}));
        } else if (result.status === 'error') {
            setConnectionError(result.message || 'Connection failed.');
            setLocalSettings(prev => ({...prev, baileysSessionStatus: 'error'}));
        }
    } catch (e) {
        setConnectionError(e instanceof Error ? e.message : "An unknown error occurred");
        setLocalSettings(prev => ({...prev, baileysSessionStatus: 'error'}));
    } finally {
        setIsConnecting(false);
    }
  };

  const handleBaileysLogout = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
        await baileysService.logout(localSettings);
        const newSettings = { ...localSettings, baileysSessionStatus: 'disconnected' as const, baileysQrCode: undefined };
        setLocalSettings(newSettings);
        setSettings(newSettings); // update global state
    } catch (e) {
        setConnectionError(e instanceof Error ? e.message : "An unknown error occurred during logout");
    } finally {
        setIsConnecting(false);
    }
  };

  const baileysStatusInfo = {
    connected: { text: 'Connected', color: 'text-green-600', icon: 'fa-check-circle' },
    disconnected: { text: 'Disconnected', color: 'text-red-600', icon: 'fa-times-circle' },
    connecting: { text: 'Connecting... Scan QR', color: 'text-yellow-600', icon: 'fa-qrcode' },
    error: { text: 'Connection Error', color: 'text-red-600', icon: 'fa-exclamation-triangle' }
  };
  const currentBaileysStatus = baileysStatusInfo[localSettings.baileysSessionStatus || 'disconnected'];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your API keys and application settings.</p>
      </header>

      <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">API Provider</h2>
        <div className="space-y-4">
            <div>
                <label htmlFor="provider" className="block text-sm font-medium mb-1">WhatsApp API Provider</label>
                <select
                    id="provider"
                    name="provider"
                    value={localSettings.provider}
                    onChange={handleChange}
                    className="w-full bg-input border border-border rounded-md px-3 py-2"
                >
                    <option value="fonnte">Fonnte</option>
                    <option value="baileys">Baileys</option>
                </select>
            </div>

            {localSettings.provider === 'fonnte' && (
                <div>
                    <label htmlFor="fonnteApiKey" className="block text-sm font-medium mb-1">Fonnte API Key</label>
                    <input
                        id="fonnteApiKey"
                        name="fonnteApiKey"
                        type="password"
                        value={localSettings.fonnteApiKey}
                        onChange={handleChange}
                        className="w-full bg-input border border-border rounded-md px-3 py-2"
                        placeholder="Enter Fonnte API Key"
                    />
                     <p className="text-xs text-muted-foreground mt-1">
                        Note: Sending messages directly from the browser might be blocked by its security policy (CORS). 
                        If messages fail with a network error, check the browser's developer console (F12) for details.
                    </p>
                </div>
            )}
            
            {localSettings.provider === 'baileys' && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h3 className="text-lg font-semibold">Baileys Connection</h3>
                        <div className={`flex items-center text-sm font-semibold ${currentBaileysStatus.color}`}>
                           <i className={`fas ${currentBaileysStatus.icon} mr-2`}></i>
                           <span>{currentBaileysStatus.text}</span>
                        </div>
                    </div>
                     {connectionError && (
                         <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{connectionError}</p>
                     )}
                     <div>
                        <label htmlFor="baileysServerUrl" className="block text-sm font-medium mb-1">Baileys Server URL</label>
                        <input
                            id="baileysServerUrl"
                            name="baileysServerUrl"
                            type="text"
                            value={localSettings.baileysServerUrl || ''}
                            onChange={handleChange}
                            className="w-full bg-input border border-border rounded-md px-3 py-2"
                            placeholder="e.g., https://my-baileys-server.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="baileysApiKey" className="block text-sm font-medium mb-1">API Key</label>
                        <input
                            id="baileysApiKey"
                            name="baileysApiKey"
                            type="password"
                            value={localSettings.baileysApiKey || ''}
                            onChange={handleChange}
                            className="w-full bg-input border border-border rounded-md px-3 py-2"
                            placeholder="Enter Baileys API Key"
                        />
                    </div>
                    <div className="flex justify-end">
                       {localSettings.baileysSessionStatus === 'connected' ? (
                           <button onClick={handleBaileysLogout} disabled={isConnecting} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-destructive/90 disabled:opacity-50">
                                {isConnecting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-power-off mr-2"></i>}
                                Logout
                           </button>
                       ) : (
                           <button onClick={handleBaileysConnect} disabled={isConnecting} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-primary/90 disabled:opacity-50">
                                {isConnecting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-plug mr-2"></i>}
                                Connect
                           </button>
                       )}
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
         <h2 className="text-xl font-semibold border-b pb-2">AI Settings</h2>
         <div>
            <label htmlFor="geminiApiKey" className="block text-sm font-medium mb-1">Gemini API Key</label>
            <input
                id="geminiApiKey"
                name="geminiApiKey"
                type="password"
                value={localSettings.geminiApiKey}
                onChange={handleChange}
                className="w-full bg-input border border-border rounded-md px-3 py-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Get your key from Google AI Studio.</p>
        </div>
      </div>
      
      <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">Anti-Ban Settings</h2>
        <div className="space-y-4">
            <div>
                <label htmlFor="delay" className="block text-sm font-medium mb-1">Random Delay Between Messages (seconds)</label>
                <input
                    id="delay"
                    name="antiBan.delay"
                    type="number"
                    value={localSettings.antiBan.delay}
                    onChange={handleChange}
                    className="w-full bg-input border border-border rounded-md px-3 py-2"
                />
                <p className="text-xs text-muted-foreground mt-1">A random value will be added to this delay to appear more human.</p>
            </div>
             <div>
                <label htmlFor="quota" className="block text-sm font-medium mb-1">Max Messages per Day per Account</label>
                <input
                    id="quota"
                    name="antiBan.quota"
                    type="number"
                    value={localSettings.antiBan.quota}
                    onChange={handleChange}
                    className="w-full bg-input border border-border rounded-md px-3 py-2"
                />
            </div>
        </div>
      </div>

      <div className="flex justify-end items-center">
        {saveError && <span className="text-sm text-destructive mr-4">{saveError}</span>}
        {saved && <span className="text-sm text-green-600 mr-4">Settings saved successfully!</span>}
        <button 
          onClick={handleSave}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-semibold hover:bg-primary/90"
        >
          Save Settings
        </button>
      </div>
      {qrCode && <QrCodeModal qrCode={qrCode} onClose={() => setQrCode(null)} />}
    </div>
  );
};

export default Settings;

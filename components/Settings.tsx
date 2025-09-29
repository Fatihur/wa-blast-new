import React, { useState, useEffect } from 'react';
import type { ApiSettings } from '../types';
import * as baileysService from '../services/baileysService';
import * as fonnteService from '../services/fonnteService';
import { QrCodeModal } from './QrCodeModal';
import { useNotification } from '../contexts/NotificationContext';

interface SettingsProps {
  settings: ApiSettings;
  setSettings: React.Dispatch<React.SetStateAction<ApiSettings>>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingFonnte, setIsCheckingFonnte] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { addNotification } = useNotification();
  
  // Auto-check Fonnte status on load if key exists
  useEffect(() => {
    const checkInitialFonnteStatus = async () => {
        if (localSettings.provider === 'fonnte' && localSettings.fonnteApiKey && localSettings.fonnteDeviceStatus !== 'connected') {
            await handleFonnteCheckStatus(true); // silent = true
        }
    };
    checkInitialFonnteStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
        addNotification({ type: 'error', title: 'Kesalahan Validasi', message: validationError });
        return;
    }
    setConnectionError(null); // Clear connection errors on save
    setSettings(localSettings);
    addNotification({ type: 'success', title: 'Pengaturan Disimpan', message: 'Pengaturan Anda telah berhasil diperbarui.' });
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
  
  const handleFonnteCheckStatus = async (silent = false) => {
    if (!localSettings.fonnteApiKey) {
        if (!silent) {
            addNotification({ type: 'error', title: 'API Key Missing', message: 'Please enter your Fonnte API Key first.' });
        }
        return;
    }
    setIsCheckingFonnte(true);
    const result = await fonnteService.getDeviceStatus(localSettings.fonnteApiKey);
    if (result.status === 'connected') {
        const newSettings = {
            ...localSettings,
            fonnteDeviceStatus: 'connected' as const,
            fonnteConnectedNumber: result.device,
        };
        setLocalSettings(newSettings);
        setSettings(newSettings);
        if (!silent) {
            addNotification({ type: 'success', title: 'Device Connected', message: `Successfully connected to device: ${result.device}` });
        }
    } else {
        const newSettings = {
            ...localSettings,
            fonnteDeviceStatus: 'disconnected' as const,
            fonnteConnectedNumber: undefined,
        };
        setLocalSettings(newSettings);
        setSettings(newSettings);
        if (!silent) {
            addNotification({ type: 'error', title: 'Device Disconnected', message: result.message || 'Could not connect to Fonnte device.' });
        }
    }
    setIsCheckingFonnte(false);
  };

  const handleBaileysConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
        const result = await baileysService.login(localSettings);
        if (result.status === 'connected') {
            const newSettings = {
                ...localSettings, 
                baileysSessionStatus: 'connected' as const, 
                baileysQrCode: undefined,
                baileysConnectedNumber: result.connectedNumber
            };
            setLocalSettings(newSettings);
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
        const newSettings = { 
            ...localSettings, 
            baileysSessionStatus: 'disconnected' as const, 
            baileysQrCode: undefined,
            baileysConnectedNumber: undefined,
        };
        setLocalSettings(newSettings);
        setSettings(newSettings);
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
                    <div className="flex items-center space-x-2">
                        <input
                            id="fonnteApiKey"
                            name="fonnteApiKey"
                            type="password"
                            value={localSettings.fonnteApiKey}
                            onChange={handleChange}
                            className="w-full bg-input border border-border rounded-md px-3 py-2"
                            placeholder="Enter Fonnte API Key"
                        />
                         <button onClick={() => handleFonnteCheckStatus(false)} disabled={isCheckingFonnte || !localSettings.fonnteApiKey} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-accent disabled:opacity-50 whitespace-nowrap">
                            {isCheckingFonnte ? <i className="fas fa-spinner fa-spin"></i> : 'Check'}
                        </button>
                    </div>
                     <div className="text-xs text-muted-foreground mt-2">
                        {localSettings.fonnteDeviceStatus === 'connected' && localSettings.fonnteConnectedNumber ? (
                            <span className="text-green-600 font-medium">
                                <i className="fas fa-check-circle mr-1"></i>
                                Connected to: {localSettings.fonnteConnectedNumber}
                            </span>
                        ) : localSettings.fonnteDeviceStatus === 'disconnected' ? (
                            <span className="text-red-600 font-medium">
                                <i className="fas fa-times-circle mr-1"></i>
                                Device not connected. Check key and Fonnte dashboard.
                            </span>
                        ) : (
                            <span>Click "Check" to verify your device status.</span>
                        )}
                    </div>
                     <p className="text-xs text-muted-foreground mt-2">
                        Note: Sending messages directly from the browser might be blocked by its security policy (CORS). 
                        If messages fail, check the browser's developer console (F12) for network errors.
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
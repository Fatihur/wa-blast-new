// FIX: import 'useEffect' hook from react to resolve 'Cannot find name' error
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { Contact, Campaign, ApiSettings, ManagedFile, DraftCampaign } from '../types';
import { MessageStatus } from '../types';
import { generateCampaignMessage, translateText } from '../services/geminiService';
import { sendCampaign } from '../services/campaignService';
import { useNotification } from '../contexts/NotificationContext';
import ContactSelectionModal from './ContactSelectionModal';

interface CampaignCreatorProps {
  mode: 'single' | 'bulk' | 'file';
  onAddCampaign: (campaign: Campaign) => void;
  onCancel: () => void;
  contacts: Contact[];
  apiSettings: ApiSettings;
  managedFiles: ManagedFile[];
  draft: Partial<DraftCampaign>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<DraftCampaign>>>;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const CampaignCreator: React.FC<CampaignCreatorProps> = ({ mode, onAddCampaign, onCancel, contacts, apiSettings, managedFiles, draft, setDraft }) => {
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [matchedFiles, setMatchedFiles] = useState<{ contactId: string, file: ManagedFile }[]>([]);
  const { addNotification } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [loadingAction, setLoadingAction] = useState<'generate' | 'translate' | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showAiModal, setShowAiModal] = useState<'generate' | 'translate' | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Initialize draft with default values
  useEffect(() => {
    const initialDraft = {
        name: draft.name || '',
        message: draft.message || 'Hi {{nama}}, ...',
        singleNumber: draft.singleNumber || '',
        selectedContacts: draft.selectedContacts || [],
        attachment: draft.attachment || null,
        isScheduling: draft.isScheduling || false,
        scheduleDate: draft.scheduleDate || getTodayDateString(),
        scheduleTime: draft.scheduleTime || '09:00',
    };
    setDraft(prev => ({...initialDraft, ...prev, mode}));
  }, [mode]); // Only run when mode changes


  const modeTitles = {
    single: 'Kirim Pesan Satuan',
    bulk: 'Kirim Pesan Massal',
    file: 'Kirim File per Kontak'
  };
  
  const updateDraft = (key: keyof DraftCampaign, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    if(errors[key]) {
        setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[key];
            return newErrors;
        });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64Data = await fileToBase64(file);
      updateDraft('attachment', { name: file.name, data: base64Data.split(',')[1], type: file.type });
    }
  };
  
  // Auto-match files when selected contacts change in 'file' mode
  useEffect(() => {
    if (mode === 'file') {
      const chosenContacts = contacts.filter(c => draft.selectedContacts?.includes(c.id));
      const newMatchedFiles: { contactId: string, file: ManagedFile }[] = [];

      chosenContacts.forEach(contact => {
        const bestMatch = managedFiles.find(file => 
          file.name.toLowerCase().includes(contact.name.toLowerCase())
        );
        if (bestMatch) {
          newMatchedFiles.push({ contactId: contact.id, file: bestMatch });
        }
      });
      setMatchedFiles(newMatchedFiles);
    }
  }, [draft.selectedContacts, contacts, managedFiles, mode]);

  const handleFormat = (formatType: 'bold' | 'italic' | 'strike' | 'mono') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = draft.message!.substring(start, end);

    if (start === end) {
        textarea.focus();
        return;
    }
    
    const formatChars: { [key: string]: string } = {
        bold: '*',
        italic: '_',
        strike: '~',
        mono: '```'
    };
    const char = formatChars[formatType];

    const newMessage = `${draft.message!.substring(0, start)}${char}${selectedText}${char}${draft.message!.substring(end)}`;
    
    updateDraft('message', newMessage);
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + char.length, end + char.length);
    }, 0);
  };

  const handleInsertVariable = (variable: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = `${draft.message!.substring(0, start)}${variable}${draft.message!.substring(end)}`;
      updateDraft('message', newMessage);
      setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + variable.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
  };
  
  const handleGenerateMessage = async (prompt: string) => {
    if (!prompt) return;
    setLoadingAction('generate');
    setAiError(null);
    setAiSuggestions([]);
    try {
      const suggestions = await generateCampaignMessage(apiSettings.geminiApiKey, prompt);
      setAiSuggestions(suggestions);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setLoadingAction(null);
    }
  };
  
  const handleTranslate = async (lang: string) => {
      if (!lang) return;
      setLoadingAction('translate');
      setAiError(null);
      try {
          const translated = await translateText(apiSettings.geminiApiKey, draft.message!, lang);
          updateDraft('message', translated);
      } catch (error) {
          setAiError(error instanceof Error ? error.message : "An unknown error occurred.");
      } finally {
          setLoadingAction(null);
      }
  };

  const handleAiSubmit = () => {
    if (!aiPrompt) return;
    if (showAiModal === 'generate') {
      handleGenerateMessage(aiPrompt);
    } else if (showAiModal === 'translate') {
      handleTranslate(aiPrompt);
    }
    setShowAiModal(null);
    setAiPrompt('');
  };

  const validateForm = () => {
      const newErrors: {[key: string]: string} = {};
      if (!draft.name?.trim()) newErrors.name = "Campaign name is required.";
      if (!draft.message?.trim()) newErrors.message = "Message cannot be empty.";
      
      if (mode === 'single' && !draft.singleNumber?.trim()) {
          newErrors.singleNumber = "Recipient number is required.";
      }
      
      if ((mode === 'bulk' || mode === 'file') && draft.selectedContacts?.length === 0) {
          newErrors.selectedContacts = "Please select at least one contact.";
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleCreateCampaign = useCallback(async () => {
      if (!validateForm()) return;

      setIsSending(true);

      const finalContacts = mode === 'single' 
        ? [{id: 'single', name: 'Recipient', number: draft.singleNumber!, group: 'Single'}] 
        : contacts.filter(c => draft.selectedContacts!.includes(c.id));
      
      let schedule: Date | null = null;
      if (draft.isScheduling && draft.scheduleDate && draft.scheduleTime) {
          schedule = new Date(`${draft.scheduleDate}T${draft.scheduleTime}`);
          if (isNaN(schedule.getTime())) {
              setErrors({ schedule: 'Invalid schedule date or time.' });
              setIsSending(false);
              return;
          }
      }

      let campaignLogs;
      let finalContactIds;

      if (mode === 'file') {
          const matchedContactIds = new Set(matchedFiles.map(mf => mf.contactId));
          finalContactIds = finalContacts.map(c => c.id);
          campaignLogs = finalContacts.map(c => ({
              contact: c,
              status: matchedContactIds.has(c.id) ? MessageStatus.Pending : MessageStatus.Failed,
              timestamp: new Date().toISOString(),
              error: matchedContactIds.has(c.id) ? undefined : 'No matching file found in File Manager'
          }));
      } else {
          finalContactIds = finalContacts.map(c => c.id);
          campaignLogs = finalContacts.map(c => ({ contact: c, status: MessageStatus.Pending, timestamp: new Date().toISOString() }));
      }
      
      const campaign: Campaign = {
          id: `camp_${Date.now()}`, name: draft.name!, message: draft.message!,
          contacts: finalContactIds,
          schedule, createdAt: new Date(),
          status: schedule ? 'Scheduled' : 'Draft',
          logs: campaignLogs,
          ...(mode !== 'file' && draft.attachment && { attachment: draft.attachment }),
      };
      
      onAddCampaign(campaign);

      if (schedule) {
          addNotification({
              type: 'info',
              title: 'Kampanye Dijadwalkan',
              message: `"${campaign.name}" dijadwalkan untuk ${schedule.toLocaleString()}.`
          });
          setIsSending(false);
      } else {
          const contactFilesMap = matchedFiles.reduce((acc, curr) => {
              acc[curr.contactId] = curr.file;
              return acc;
          }, {} as { [contactId: string]: ManagedFile });
          
          const { sentCount, failedCount } = await sendCampaign(campaign, contacts, apiSettings, onAddCampaign, contactFilesMap);
          addNotification({
              type: failedCount > 0 ? 'warning' : 'success',
              title: `Kampanye "${campaign.name}" Selesai`,
              message: `Hasil: ${sentCount} terkirim, ${failedCount} gagal.`
          });
          setIsSending(false);
      }

  }, [draft, contacts, apiSettings, onAddCampaign, mode, matchedFiles, addNotification]);

  const allCustomFields = useMemo(() => {
    const keys = new Set<string>();
    contacts.forEach(c => {
        if(c.customFields) {
            Object.keys(c.customFields).forEach(key => keys.add(key));
        }
    });
    return Array.from(keys);
  }, [contacts]);


  return (
    <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
      <h2 className="text-xl font-semibold">{modeTitles[mode]}</h2>
      
      <div>
        <label htmlFor="campaignName" className="block text-sm font-semibold mb-2">Nama Campaign</label>
        <input id="campaignName" type="text" value={draft.name || ''} onChange={e => updateDraft('name', e.target.value)} className={`w-full bg-background border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring ${errors.name ? 'border-destructive' : 'border-border'}`} placeholder="e.g., Promo Q4" />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
      </div>

      {mode === 'single' && (
        <div>
          <label htmlFor="singleNumber" className="block text-sm font-semibold mb-2">Nomor WhatsApp Tujuan</label>
          <input id="singleNumber" type="text" value={draft.singleNumber || ''} onChange={e => updateDraft('singleNumber', e.target.value)} className={`w-full bg-background border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring ${errors.singleNumber ? 'border-destructive' : 'border-border'}`} placeholder="e.g., 6281234567890" />
          {errors.singleNumber && <p className="text-sm text-destructive mt-1">{errors.singleNumber}</p>}
        </div>
      )}

      <div>
          <label htmlFor="message" className="block text-sm font-semibold mb-2">Pesan</label>
          <div className="flex items-center space-x-1 bg-muted border border-border border-b-0 rounded-t-md p-2 flex-wrap">
              <button type="button" onClick={() => handleFormat('bold')} title="Bold" className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent disabled:opacity-50 text-sm"><i className="fas fa-bold"></i></button>
              <button type="button" onClick={() => handleFormat('italic')} title="Italic" className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent disabled:opacity-50 text-sm"><i className="fas fa-italic"></i></button>
              <button type="button" onClick={() => handleFormat('strike')} title="Strikethrough" className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent disabled:opacity-50 text-sm"><i className="fas fa-strikethrough"></i></button>
              <button type="button" onClick={() => handleFormat('mono')} title="Monospace" className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent disabled:opacity-50 text-sm"><i className="fas fa-code"></i></button>
              <div className="border-l h-5 mx-2"></div>
              <button type="button" onClick={() => handleInsertVariable('{{nama}}')} className="text-xs bg-secondary px-2 py-1 rounded-md hover:bg-accent font-mono">nama</button>
              <button type="button" onClick={() => handleInsertVariable('{{group}}')} className="text-xs bg-secondary px-2 py-1 rounded-md hover:bg-accent font-mono">group</button>
              {allCustomFields.map(field => (
                  <button key={field} type="button" onClick={() => handleInsertVariable(`{{${field}}}`)} className="text-xs bg-secondary px-2 py-1 rounded-md hover:bg-accent font-mono">{field}</button>
              ))}
          </div>
          <textarea ref={textareaRef} id="message" value={draft.message || ''} onChange={e => updateDraft('message', e.target.value)} rows={6} className={`w-full bg-background border rounded-md px-3 py-2 rounded-t-none focus:ring-0 focus:border-ring focus:ring-offset-0 ${errors.message ? 'border-destructive' : 'border-border'}`} placeholder="Gunakan {{nama}} untuk variabel nama." />
          {errors.message && <p className="text-sm text-destructive mt-1">{errors.message}</p>}
          <div className="flex items-center space-x-2 mt-2">
              <button onClick={() => setShowAiModal('generate')} disabled={loadingAction !== null} className="text-sm bg-secondary px-3 py-1 rounded-md flex items-center hover:bg-accent disabled:opacity-50">
                  {loadingAction === 'generate' ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-magic mr-2"></i>}
                  Generate with AI
              </button>
              <button onClick={() => setShowAiModal('translate')} disabled={loadingAction !== null} className="text-sm bg-secondary px-3 py-1 rounded-md flex items-center hover:bg-accent disabled:opacity-50">
                  {loadingAction === 'translate' ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-language mr-2"></i>}
                  Translate
              </button>
          </div>
          {aiError && <p className="text-sm text-destructive mt-2">{aiError}</p>}
          {aiSuggestions.length > 0 && (
              <div className="mt-2 space-y-2">
                  <p className="text-sm font-medium">AI Suggestions:</p>
                  {aiSuggestions.map((s, i) => (<div key={i} className="text-sm p-2 bg-muted rounded-md border border-border cursor-pointer hover:bg-accent" onClick={() => updateDraft('message', s)}>{s}</div>))}
              </div>
          )}
      </div>

      {(mode === 'single' || mode === 'bulk') && (
        <div>
            <label htmlFor="attachment" className="block text-sm font-semibold mb-2">Lampiran (Opsional)</label>
            <input type="file" id="attachment" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
            {draft.attachment && <p className="text-xs text-muted-foreground mt-1">File terpilih: {draft.attachment.name}</p>}
        </div>
      )}

      {(mode === 'bulk' || mode === 'file') && (
        <div>
            <h3 className="text-lg font-semibold mb-2">Pilih Kontak</h3>
            <div className="flex items-start gap-4">
                <button type="button" onClick={() => setIsModalOpen(true)} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent flex-shrink-0">
                    <i className="fas fa-users mr-2"></i>
                    Pilih Kontak
                </button>
                <div className="pt-2">
                    <p className="text-sm text-muted-foreground">{draft.selectedContacts?.length || 0} dari {contacts.length} kontak terpilih.</p>
                </div>
            </div>
            {errors.selectedContacts && <p className="text-sm text-destructive mt-1">{errors.selectedContacts}</p>}
        </div>
      )}

      {mode === 'file' && (draft.selectedContacts?.length || 0) > 0 && (
         <div>
            <h3 className="text-lg font-semibold mb-2">Pencocokan File</h3>
             <p className="text-sm text-muted-foreground mb-2">Aplikasi akan otomatis mencocokkan kontak terpilih dengan file dari File Manager berdasarkan nama.</p>
            <div className="mt-4 max-h-48 overflow-y-auto border rounded-md p-2">
                <h4 className="font-semibold text-sm mb-2">Hasil Pencocokan:</h4>
                <ul className="text-sm space-y-1">
                    {contacts.filter(c => draft.selectedContacts!.includes(c.id)).map(contact => {
                        const matchedFile = matchedFiles.find(mf => mf.contactId === contact.id);
                        return (
                            <li key={contact.id} className="flex items-center justify-between p-1 rounded">
                                <span>{contact.name}</span>
                                {matchedFile ? (
                                    <span className="text-green-600 text-xs font-medium flex items-center"><i className="fas fa-check-circle mr-1"></i> {matchedFile.file.name}</span>
                                ) : (
                                    <span className="text-red-600 text-xs font-medium flex items-center"><i className="fas fa-times-circle mr-1"></i> No file matched</span>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>
         </div>
      )}

      <div>
        <label htmlFor="schedule-toggle" className="flex items-center cursor-pointer">
            <input type="checkbox" id="schedule-toggle" checked={draft.isScheduling} onChange={(e) => updateDraft('isScheduling', e.target.checked)} className="mr-2" />
            <span className="text-sm font-semibold">Jadwalkan Pengiriman</span>
        </label>
        {draft.isScheduling && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-4 bg-muted rounded-md border">
                <div>
                    <label htmlFor="schedule-date" className="block text-xs font-medium mb-1">Tanggal</label>
                    <input type="date" id="schedule-date" value={draft.scheduleDate} onChange={e => updateDraft('scheduleDate', e.target.value)} min={getTodayDateString()} className="w-full bg-background border-border rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                    <label htmlFor="schedule-time" className="block text-xs font-medium mb-1">Waktu</label>
                    <input type="time" id="schedule-time" value={draft.scheduleTime} onChange={e => updateDraft('scheduleTime', e.target.value)} className="w-full bg-background border-border rounded-md px-3 py-2 text-sm" />
                </div>
                {errors.schedule && <p className="text-sm text-destructive col-span-2">{errors.schedule}</p>}
            </div>
        )}
      </div>

      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAiModal(null)}>
            <div className="bg-card p-6 rounded-lg shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">{showAiModal === 'generate' ? 'Generate Message with AI' : 'Translate Message'}</h3>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={showAiModal === 'generate' ? 4 : 1} className="w-full bg-input border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring" placeholder={showAiModal === 'generate' ? "e.g., A flash sale for shoes, 50% off" : "e.g., Spanish"} autoFocus />
                <div className="flex justify-end space-x-3 mt-4">
                    <button onClick={() => { setShowAiModal(null); setAiPrompt(''); }} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Cancel</button>
                    <button onClick={handleAiSubmit} disabled={!aiPrompt} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-50">Submit</button>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
          <ContactSelectionModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={(selectedIds) => {
                  updateDraft('selectedContacts', selectedIds);
              }}
              contacts={contacts}
              initialSelectedIds={draft.selectedContacts || []}
          />
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button onClick={onCancel} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Cancel</button>
        <button onClick={handleCreateCampaign} disabled={isSending} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-primary/90 disabled:opacity-50">
          {isSending ? <i className="fas fa-spinner fa-spin mr-2"></i> : draft.isScheduling ? <i className="fas fa-clock mr-2"></i> : <i className="fas fa-paper-plane mr-2"></i>}
          {isSending ? 'Memproses...' : draft.isScheduling ? 'Jadwalkan' : 'Kirim Sekarang'}
        </button>
      </div>
    </div>
  );
};

export default CampaignCreator;

import type { Campaign, Contact, ApiSettings, ManagedFile } from '../types';
import { MessageStatus } from '../types';
import { getFile } from './dbService';

// Helper function to convert a data URL to a File object
async function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: mimeType });
}

const fonnteSend = async (contact: Contact, personalizedMessage: string, apiKey: string, fileAttachment?: { name: string; data: string; type: string }): Promise<{id: string}> => {
    const body: any = {
      target: contact.number,
      message: personalizedMessage,
    };
    if (fileAttachment) {
      body.file = fileAttachment.data;
      body.filename = fileAttachment.name;
    }

    const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const responseData = await response.json();
    if (!response.ok) {
        let errorMsg = responseData.detail || responseData.reason || JSON.stringify(responseData);
        throw new Error(errorMsg);
    }
    const messageId = responseData.id_log || (responseData.id && responseData.id[0]) || `mock_${Date.now()}`;
    return { id: messageId };
};

const baileysSend = async (contact: Contact, personalizedMessage: string, settings: Pick<ApiSettings, 'baileysServerUrl' | 'baileysApiKey'>, fileAttachment?: { name: string; data: string; type: string }): Promise<{id: string}> => {
    if (!settings.baileysServerUrl || !settings.baileysApiKey) {
      throw new Error("Baileys connection details are missing.");
    }
    const authHeader = `Bearer ${settings.baileysApiKey}`;
    const headers: HeadersInit = { 'Authorization': authHeader };
    const server = settings.baileysServerUrl;
    
    let endpoint: string;
    let body: BodyInit;
    
    if (fileAttachment) {
        endpoint = `${server}/messages/send-media`;
        const dataUrl = `data:${fileAttachment.type};base64,${fileAttachment.data}`;
        const file = await dataUrlToFile(dataUrl, fileAttachment.name, fileAttachment.type);
        
        const formData = new FormData();
        formData.append('number', contact.number);
        formData.append('caption', personalizedMessage);
        formData.append('file', file);
        
        body = formData;
    } else {
        endpoint = `${server}/messages/send-text`;
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          number: contact.number,
          text: personalizedMessage,
        });
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: body
    });

    const responseData = await response.json();
     if (responseData.status !== 'success') {
        let errorMsg = responseData.message || JSON.stringify(responseData);
        throw new Error(errorMsg);
    }
    const messageId = responseData?.data?.id || `mock_${Date.now()}`;
    return { id: messageId };
};


export const sendCampaign = async (
    campaign: Campaign, 
    allContacts: Contact[], 
    apiSettings: ApiSettings,
    updateCampaignCallback: (campaign: Campaign) => void,
    contactFiles?: { [contactId: string]: ManagedFile }
) => {
    const campaignCopy = JSON.parse(JSON.stringify(campaign));
    campaignCopy.status = 'Sending';
    updateCampaignCallback({...campaignCopy});

    const finalContacts = campaign.contacts.length === 1 && campaign.contacts[0] === 'single'
        ? campaign.logs.map(l => l.contact)
        : allContacts.filter(c => campaign.contacts.includes(c.id));

    for (let i = 0; i < finalContacts.length; i++) {
        const contact = finalContacts[i];
        const logIndex = campaignCopy.logs.findIndex(l => l.contact.id === contact.id);

        if (logIndex === -1 || campaignCopy.logs[logIndex].status === MessageStatus.Failed) {
            continue; // Skip if no log entry or if it's already marked as failed (e.g., no file match)
        }

        campaignCopy.logs[logIndex].status = MessageStatus.Sending;
        updateCampaignCallback({...campaignCopy}); 

        try {
            let personalizedMessage = campaign.message
              .replace(/{{nama}}/g, contact.name)
              .replace(/{{group}}/g, contact.group || '');

            if (contact.customFields) {
                Object.entries(contact.customFields).forEach(([key, value]) => {
                    personalizedMessage = personalizedMessage.replace(new RegExp(`{{${key}}}`, 'g'), value);
                });
            }

            let finalAttachment = campaign.attachment;
            if (contactFiles && contactFiles[contact.id]) {
                const fileMetadata = contactFiles[contact.id];
                const fileData = await getFile(fileMetadata.id);
                if (fileData) {
                    finalAttachment = { name: fileMetadata.name, data: fileData, type: fileMetadata.type };
                } else {
                    throw new Error(`File data not found in DB for ${fileMetadata.name}`);
                }
            }
            
            let sendResult;
            if (apiSettings.provider === 'baileys') {
                if (apiSettings.baileysSessionStatus === 'connected' && apiSettings.baileysServerUrl && apiSettings.baileysApiKey) {
                    sendResult = await baileysSend(contact, personalizedMessage, apiSettings, finalAttachment);
                } else {
                    throw new Error('Baileys is not connected. Please connect in Settings.');
                }
            } else { // Fonnte
                sendResult = await fonnteSend(contact, personalizedMessage, apiSettings.fonnteApiKey, finalAttachment);
            }
            
            campaignCopy.logs[logIndex].status = MessageStatus.Sent;
            campaignCopy.logs[logIndex].apiMessageId = sendResult.id;
        } catch (err) {
            campaignCopy.logs[logIndex].status = MessageStatus.Failed;
            campaignCopy.logs[logIndex].error = err instanceof Error ? err.message : "Unknown error";
        }
        campaignCopy.logs[logIndex].timestamp = new Date().toISOString();
        updateCampaignCallback({...campaignCopy});

        if (i < finalContacts.length - 1) {
            const delay = (apiSettings.antiBan.delay * 1000) + (Math.random() * 1000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
      
    campaignCopy.status = 'Completed';
    updateCampaignCallback({...campaignCopy});

    const sentCount = campaignCopy.logs.filter(l => l.status === MessageStatus.Sent).length;
    const failedCount = campaignCopy.logs.filter(l => l.status === MessageStatus.Failed).length;
    alert(`Campaign "${campaignCopy.name}" has finished.\n\nSent: ${sentCount}\nFailed: ${failedCount}`);
};
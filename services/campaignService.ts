import type { Campaign, Contact, ApiSettings, ManagedFile } from '../types';
import { MessageStatus } from '../types';
import { getFile } from './dbService';
import { sendMessage as sendBaileysMessage } from './baileysService';
import { sendMessage as sendFonnteMessage } from './fonnteService';


export const sendCampaign = async (
    campaign: Campaign, 
    allContacts: Contact[], 
    apiSettings: ApiSettings,
    updateCampaignCallback: (campaign: Campaign) => void,
    contactFiles?: { [contactId: string]: ManagedFile }
): Promise<{ sentCount: number; failedCount: number; }> => {
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
                if (apiSettings.baileysSessionStatus === 'connected') {
                    sendResult = await sendBaileysMessage(contact, personalizedMessage, apiSettings, finalAttachment);
                } else {
                    throw new Error('Baileys is not connected. Please connect in Settings.');
                }
            } else { // Fonnte
                sendResult = await sendFonnteMessage(contact, personalizedMessage, apiSettings.fonnteApiKey, finalAttachment);
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
    
    return { sentCount, failedCount };
};
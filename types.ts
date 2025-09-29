export interface Contact {
  id: string;
  name: string;
  number: string;
  group: string;
  customFields?: { [key: string]: string };
}

export interface Group {
  id: string;
  name: string;
}

export enum MessageStatus {
  Pending = 'Pending',
  Sending = 'Sending',
  Sent = 'Sent', // Successfully sent to API
  Delivered = 'Delivered', // Delivered to the recipient's device
  Read = 'Read', // Recipient has read the message
  Failed = 'Failed',
}

export interface MessageLog {
  contact: Contact;
  status: MessageStatus;
  timestamp: string;
  error?: string;
  apiMessageId?: string; // To store the ID from the API response
}

export interface Campaign {
  id:string;
  name: string;
  message: string;
  contacts: string[]; // array of contact ids
  schedule: Date | null;
  createdAt: Date;
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Completed';
  logs: MessageLog[];
  attachment?: {
    name: string;
    data: string; // base64
    type: string;
  };
}

export interface ApiSettings {
  provider: 'fonnte' | 'baileys';
  fonnteApiKey: string;
  fonnteDeviceStatus?: 'connected' | 'disconnected' | 'checking';
  fonnteConnectedNumber?: string;
  baileysServerUrl?: string;
  baileysApiKey?: string;
  baileysSessionStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
  baileysQrCode?: string;
  baileysConnectedNumber?: string;
  geminiApiKey: string;
  antiBan: {
    delay: number; // in seconds
    quota: number;
  }
}

export interface SmartReplyMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  suggestions?: string[];
}

export interface ManagedFile {
  id: string;
  name: string;
  type: string;
  data?: string; // base64 without data URI prefix - Made optional, stored in IndexedDB
  createdAt: string;
}

export interface DraftCampaign {
  mode: 'single' | 'bulk' | 'file';
  name: string;
  message: string;
  singleNumber: string;
  selectedContacts: string[];
  attachment: { name: string; data: string; type: string } | null;
  isScheduling: boolean;
  scheduleDate: string;
  scheduleTime: string;
}
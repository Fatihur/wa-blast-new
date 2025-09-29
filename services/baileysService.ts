import { ApiSettings, Contact } from "../types";

// This service makes API calls to a self-hosted Baileys server API.
// It uses an API Key for authentication via a Bearer token.

// Helper function to convert a data URL to a File object
async function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: mimeType });
}


const makeApiRequest = async (endpoint: string, settings: Pick<ApiSettings, 'baileysServerUrl' | 'baileysApiKey'>, options: RequestInit = {}) => {
    if (!settings.baileysServerUrl || !settings.baileysApiKey) {
        throw new Error("Baileys server URL or API Key is not configured.");
    }

    const authHeader = `Bearer ${settings.baileysApiKey}`;
    const url = `${settings.baileysServerUrl}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': authHeader,
            },
        });

        if (!response.ok) {
            let errorBody;
            try {
                errorBody = await response.json();
            } catch (e) {
                errorBody = await response.text();
            }
            console.error("Baileys API Error:", errorBody);
            throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorBody) || 'No response body'}`);
        }

        return response.json();

    } catch (error) {
        // Handle network errors (e.g., CORS, DNS, server offline)
        if (error instanceof TypeError && error.message.includes('fetch')) {
             throw new Error('A network error occurred (Failed to fetch). This is often due to a CORS policy on the server, an incorrect URL, or the server being offline. Please check the browser console (F12) for more details.');
        }
        // Re-throw other errors
        throw error;
    }
}

export const login = async (settings: Pick<ApiSettings, 'baileysServerUrl' | 'baileysApiKey'>): Promise<{ status: 'connected' | 'qr' | 'error', qr?: string, message?: string, connectedNumber?: string }> => {
    console.log('Checking Baileys instance status:', settings.baileysServerUrl);
    
    try {
        // A common pattern is to have a single endpoint that either returns status or a QR code.
        const response = await makeApiRequest('/sessions/status', settings);

        if (response?.status === 'connected') {
            // Assumes the response for a connected user includes their JID in `response.data.id`
            const connectedJid = response.data?.id;
            const connectedNumber = connectedJid ? connectedJid.split('@')[0] : undefined;
            return { status: 'connected', connectedNumber: connectedNumber };
        } else if (response?.status === 'qr' && response.qr) {
            // If not connected, assume we need a QR code.
            return { status: 'qr', qr: response.qr };
        } else {
             return { status: 'error', message: 'Unknown status from server. Expected "connected" or "qr".' };
        }
    } catch (error) {
        console.error("Error during Baileys login/status check:", error);
        return { status: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
};

export const logout = async (settings: Pick<ApiSettings, 'baileysServerUrl' | 'baileysApiKey'>): Promise<void> => {
    console.log('Logging out from Baileys instance:', settings.baileysServerUrl);
    try {
        await makeApiRequest('/sessions/logout', settings, { method: 'DELETE' });
    } catch (error) {
        console.error("Error during Baileys logout:", error);
        // Throw an error so the UI can catch it and inform the user.
        throw error;
    }
}

export const sendMessage = async (
    contact: Contact, 
    message: string, 
    settings: Pick<ApiSettings, 'baileysServerUrl' | 'baileysApiKey'>, 
    attachment?: { name: string; data: string; type: string }
): Promise<{id: string}> => {
    const headers: HeadersInit = {};
    
    let endpoint: string;
    let body: BodyInit;
    
    if (attachment) {
        endpoint = `/messages/send-media`;
        const dataUrl = `data:${attachment.type};base64,${attachment.data}`;
        const file = await dataUrlToFile(dataUrl, attachment.name, attachment.type);
        
        const formData = new FormData();
        formData.append('number', contact.number);
        formData.append('caption', message);
        formData.append('file', file);
        
        body = formData;
    } else {
        endpoint = `/messages/send-text`;
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          number: contact.number,
          text: message,
        });
    }

    const responseData = await makeApiRequest(endpoint, settings, {
        method: 'POST',
        headers: headers,
        body: body
    });

     if (responseData.status !== 'success') {
        let errorMsg = responseData.message || JSON.stringify(responseData);
        throw new Error(errorMsg);
    }
    const messageId = responseData?.data?.id || `mock_${Date.now()}`;
    return { id: messageId };
};

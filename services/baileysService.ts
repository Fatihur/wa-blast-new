import { ApiSettings } from "../types";

// This service makes API calls to a self-hosted Baileys server API.
// It uses an API Key for authentication via a Bearer token.

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

export const login = async (settings: Pick<ApiSettings, 'baileysServerUrl' | 'baileysApiKey'>): Promise<{ status: 'connected' | 'qr' | 'error', qr?: string, message?: string }> => {
    console.log('Checking Baileys instance status:', settings.baileysServerUrl);
    
    try {
        // A common pattern is to have a single endpoint that either returns status or a QR code.
        const response = await makeApiRequest('/sessions/status', settings);

        if (response?.status === 'connected') {
            return { status: 'connected' };
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
import type { ApiSettings, Contact } from "../types";

export const getDeviceStatus = async (apiKey: string): Promise<{ status: 'connected' | 'disconnected', device?: string, name?: string, message?: string }> => {
    if (!apiKey) {
        return { status: 'disconnected', message: "Fonnte API Key is not provided." };
    }

    try {
        const response = await fetch('https://api.fonnte.com/device', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
            },
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Fonnte API returned non-JSON response:", responseText);
            return { 
                status: 'disconnected', 
                message: `Server returned an invalid response. Details: ${responseText.substring(0, 150)}` 
            };
        }

        if (data && data.status === true) {
            return {
                status: 'connected',
                device: data.device,
                name: data.name,
            };
        } else {
            return {
                status: 'disconnected',
                message: data.reason || 'Failed to get device status from Fonnte.',
            };
        }

    } catch (error) {
        console.error("Error checking Fonnte device status:", error);
         if (error instanceof TypeError && error.message.includes('fetch')) {
             return { status: 'disconnected', message: 'A network error occurred (Failed to fetch). This could be due to a CORS policy. Please check the browser console (F12).' };
        }
        return { status: 'disconnected', message: error instanceof Error ? error.message : 'An unknown error occurred.' };
    }
}

export const sendMessage = async (
    contact: Contact, 
    personalizedMessage: string, 
    apiKey: string, 
    fileAttachment?: { name: string; data: string; type: string }
): Promise<{id: string}> => {
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

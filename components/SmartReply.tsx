import React, { useState } from 'react';
import type { ApiSettings, SmartReplyMessage } from '../types';
import { getReplySuggestions } from '../services/geminiService';

const MOCK_MESSAGES: SmartReplyMessage[] = [
    { id: 'msg1', sender: '+6281234567890', text: 'Hi, is this item still available?', timestamp: new Date() },
    { id: 'msg2', sender: '+6289876543210', text: 'What are the shipping options to Jakarta?', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
];


const SmartReply: React.FC<{ apiSettings: ApiSettings }> = ({ apiSettings }) => {
    const [messages, setMessages] = useState<SmartReplyMessage[]>(MOCK_MESSAGES);
    const [isLoading, setIsLoading] = useState<string | null>(null); // store message id
    const [error, setError] = useState<string | null>(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [newSender, setNewSender] = useState('+6281111111111');
    const [formErrors, setFormErrors] = useState<{sender?: string; text?: string}>({});

    const handleGetSuggestions = async (messageId: string, text: string) => {
        setIsLoading(messageId);
        setError(null);
        try {
            const suggestions = await getReplySuggestions(apiSettings.geminiApiKey, text);
            setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, suggestions } : msg
            ));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(null);
        }
    };
    
    const validateForm = () => {
        const errors: {sender?: string; text?: string} = {};
        if (!newSender.trim()) errors.sender = "Sender number is required.";
        if (!newMessageText.trim()) errors.text = "Message text is required.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }

    const handleAddMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const newMessage: SmartReplyMessage = {
            id: `msg_${Date.now()}`,
            sender: newSender,
            text: newMessageText,
            timestamp: new Date(),
        };

        setMessages(prev => [newMessage, ...prev]);
        setNewMessageText('');
        setFormErrors({});
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-foreground">Smart Reply</h1>
                <p className="text-muted-foreground">Simulate incoming messages and get AI-powered reply suggestions.</p>
            </header>

            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Simulate Incoming Message</h2>
                <form onSubmit={handleAddMessage} className="space-y-4">
                    <div>
                        <label htmlFor="sender" className="block text-sm font-medium mb-1">Sender Number</label>
                        <input
                            id="sender"
                            type="text"
                            value={newSender}
                            onChange={(e) => setNewSender(e.target.value)}
                            className={`w-full bg-input border rounded-md px-3 py-2 ${formErrors.sender ? 'border-destructive' : 'border-border'}`}
                            placeholder="e.g., +628123456789"
                        />
                         {formErrors.sender && <p className="text-sm text-destructive mt-1">{formErrors.sender}</p>}
                    </div>
                    <div>
                        <label htmlFor="newMessage" className="block text-sm font-medium mb-1">Message Text</label>
                        <textarea
                            id="newMessage"
                            rows={3}
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            className={`w-full bg-input border rounded-md px-3 py-2 ${formErrors.text ? 'border-destructive' : 'border-border'}`}
                            placeholder="Type or paste a customer's message here..."
                        />
                        {formErrors.text && <p className="text-sm text-destructive mt-1">{formErrors.text}</p>}
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90">
                            Add to Inbox
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Inbox</h2>
                {error && <p className="text-sm text-destructive mb-4">{error}</p>}
                <div className="space-y-6">
                    {messages.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Your simulated inbox is empty. Add a message above to get started.</p>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className="border-b pb-4 last:border-b-0">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold">{msg.sender}</p>
                                    <p className="text-xs text-muted-foreground">{msg.timestamp.toLocaleTimeString()}</p>
                                </div>
                                <p className="bg-muted p-3 rounded-lg">{msg.text}</p>
                                <div className="mt-3">
                                    {isLoading === msg.id ? (
                                        <div className="flex items-center text-muted-foreground">
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            <span>Generating suggestions...</span>
                                        </div>
                                    ) : msg.suggestions ? (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">AI Suggestions:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {msg.suggestions.map((s, i) => (
                                                    <button key={i} className="text-sm bg-accent text-accent-foreground px-3 py-1 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                                                        onClick={() => alert(`Replied with: "${s}"`)}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleGetSuggestions(msg.id, msg.text)}
                                            disabled={!apiSettings.geminiApiKey}
                                            className="text-sm bg-secondary px-3 py-1 rounded-md flex items-center hover:bg-accent disabled:opacity-50"
                                        >
                                            <i className="fas fa-magic mr-2"></i>
                                            Get Reply Suggestions
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartReply;
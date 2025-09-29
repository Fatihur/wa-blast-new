import React, { useState } from 'react';
import type { ApiSettings, AutoReplyRule } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface AutoReplyBotProps {
    settings: ApiSettings;
    setSettings: React.Dispatch<React.SetStateAction<ApiSettings>>;
}

const RuleForm: React.FC<{
    onSave: (rule: Omit<AutoReplyRule, 'id'>) => void;
    onCancel: () => void;
    rule?: AutoReplyRule | null;
}> = ({ onSave, onCancel, rule }) => {
    const [keywords, setKeywords] = useState(rule?.keywords || '');
    const [replyMessage, setReplyMessage] = useState(rule?.replyMessage || '');
    const [errors, setErrors] = useState<{ keywords?: string; replyMessage?: string }>({});

    const validate = () => {
        const newErrors: { keywords?: string; replyMessage?: string } = {};
        if (!keywords.trim()) newErrors.keywords = "Keywords are required.";
        if (!replyMessage.trim()) newErrors.replyMessage = "Reply message is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        onSave({ keywords, replyMessage, enabled: rule?.enabled ?? true });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-muted p-6 rounded-lg border border-border shadow-sm space-y-6 my-6">
            <h3 className="text-lg font-semibold">{rule ? 'Edit Aturan' : 'Tambah Aturan Baru'}</h3>
            <div>
                <label htmlFor="keywords" className="block text-sm font-semibold mb-2">Kata Kunci (pisahkan dengan koma)</label>
                <input
                    id="keywords"
                    type="text"
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    className={`w-full bg-background border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring ${errors.keywords ? 'border-destructive' : 'border-border'}`}
                    placeholder="e.g., harga, diskon, promo"
                />
                {errors.keywords && <p className="text-sm text-destructive mt-1">{errors.keywords}</p>}
            </div>
            <div>
                <label htmlFor="replyMessage" className="block text-sm font-semibold mb-2">Pesan Balasan</label>
                <textarea
                    id="replyMessage"
                    rows={4}
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    className={`w-full bg-background border rounded-md px-3 py-2 focus:ring-2 focus:ring-ring ${errors.replyMessage ? 'border-destructive' : 'border-border'}`}
                    placeholder="Gunakan {{nama}} untuk menyebut nama kontak"
                />
                {errors.replyMessage && <p className="text-sm text-destructive mt-1">{errors.replyMessage}</p>}
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-semibold hover:bg-accent">Batal</button>
                <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90">Simpan Aturan</button>
            </div>
        </form>
    );
};


const AutoReplyBot: React.FC<AutoReplyBotProps> = ({ settings, setSettings }) => {
    const { addNotification } = useNotification();
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);

    const rules = settings.autoReplyRules || [];

    const handleToggleBot = (enabled: boolean) => {
        setSettings(prev => ({ ...prev, autoReplyEnabled: enabled }));
        addNotification({
            type: 'info',
            title: `Bot Auto Reply ${enabled ? 'Diaktifkan' : 'Dinonaktifkan'}`,
            message: `Bot akan ${enabled ? 'secara otomatis membalas pesan' : 'berhenti membalas pesan'}.`
        });
    };

    const handleToggleRule = (ruleId: string, enabled: boolean) => {
        setSettings(prev => ({
            ...prev,
            autoReplyRules: (prev.autoReplyRules || []).map(r => r.id === ruleId ? { ...r, enabled } : r)
        }));
    };

    const handleSaveRule = (ruleData: Omit<AutoReplyRule, 'id'>) => {
        if (editingRule) {
            // Editing existing rule
            setSettings(prev => ({
                ...prev,
                autoReplyRules: (prev.autoReplyRules || []).map(r => r.id === editingRule.id ? { ...editingRule, ...ruleData } : r)
            }));
            addNotification({ type: 'success', title: 'Aturan Diperbarui', message: 'Aturan balasan otomatis telah diperbarui.' });
        } else {
            // Adding new rule
            const newRule: AutoReplyRule = { ...ruleData, id: `rule_${Date.now()}` };
            setSettings(prev => ({
                ...prev,
                autoReplyRules: [...(prev.autoReplyRules || []), newRule]
            }));
            addNotification({ type: 'success', title: 'Aturan Ditambahkan', message: 'Aturan balasan otomatis baru telah dibuat.' });
        }
        setShowForm(false);
        setEditingRule(null);
    };

    const handleDeleteRule = (ruleId: string) => {
        if (window.confirm("Anda yakin ingin menghapus aturan ini?")) {
            setSettings(prev => ({
                ...prev,
                autoReplyRules: (prev.autoReplyRules || []).filter(r => r.id !== ruleId)
            }));
            addNotification({ type: 'success', title: 'Aturan Dihapus', message: 'Aturan balasan otomatis telah dihapus.' });
        }
    };
    
    const startEdit = (rule: AutoReplyRule) => {
        setEditingRule(rule);
        setShowForm(true);
    };

    const startAdd = () => {
        setEditingRule(null);
        setShowForm(true);
    };
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-foreground">Bot Auto Reply</h1>
                <p className="text-muted-foreground">Atur balasan otomatis berdasarkan kata kunci.</p>
            </header>

            <div className="bg-card p-6 rounded-lg border border-border shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Status Bot</h2>
                    <p className="text-muted-foreground text-sm">Aktifkan untuk mulai membalas pesan secara otomatis.</p>
                </div>
                <label htmlFor="bot-toggle" className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input
                            type="checkbox"
                            id="bot-toggle"
                            className="sr-only"
                            checked={settings.autoReplyEnabled || false}
                            onChange={e => handleToggleBot(e.target.checked)}
                        />
                        <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform"></div>
                    </div>
                </label>
            </div>

            {showForm && <RuleForm onSave={handleSaveRule} onCancel={() => { setShowForm(false); setEditingRule(null); }} rule={editingRule} />}

            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Aturan Balasan</h2>
                    <button onClick={startAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-primary/90">
                        <i className="fas fa-plus mr-2"></i>
                        Tambah Aturan
                    </button>
                </div>

                {rules.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Belum ada aturan yang dibuat. Klik "Tambah Aturan" untuk memulai.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left responsive-table styled-table">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Kata Kunci</th>
                                    <th className="p-4">Pesan Balasan</th>
                                    <th className="p-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map(rule => (
                                    <tr key={rule.id} className="border-b">
                                        <td data-label="Status" className="p-4">
                                            <input type="checkbox" checked={rule.enabled} onChange={e => handleToggleRule(rule.id, e.target.checked)} title={rule.enabled ? "Disable rule" : "Enable rule"} />
                                        </td>
                                        <td data-label="Keywords" className="p-4 font-mono text-sm break-all">{rule.keywords}</td>
                                        <td data-label="Reply Message" className="p-4 text-sm break-all">{rule.replyMessage}</td>
                                        <td data-label="Actions" className="p-4 flex space-x-3 justify-end md:justify-start">
                                            <button onClick={() => startEdit(rule)} className="text-muted-foreground hover:text-primary" title="Edit Aturan">
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button onClick={() => handleDeleteRule(rule.id)} className="text-muted-foreground hover:text-destructive" title="Hapus Aturan">
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md mt-6" role="alert">
                <p className="font-bold">Cara Kerja Bot</p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li><strong>Untuk Baileys:</strong> Bot berjalan di browser Anda. Tab ini harus tetap terbuka agar bot dapat memeriksa dan membalas pesan baru setiap 15 detik.</li>
                    <li><strong>Untuk Fonnte:</strong> Fungsionalitas auto-reply Fonnte dikelola melalui <a href="https://fonnte.com/docs/webhook.php" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Webhook</a> di sisi server Anda. Pengaturan di halaman ini hanya untuk referensi dan tidak akan berfungsi tanpa implementasi webhook Anda sendiri.</li>
                </ul>
            </div>
             <style>{`
                #bot-toggle:checked ~ .dot {
                    transform: translateX(100%);
                    background-color: #005d5b; /* primary color */
                }
                #bot-toggle:checked ~ .block {
                    background-color: #a7d8d7; /* lighter primary */
                }
             `}</style>
        </div>
    );
};

export default AutoReplyBot;
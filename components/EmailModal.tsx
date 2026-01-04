import React, { useState, useEffect } from 'react';
import { Mail, Settings, X, Send, Save, AlertTriangle } from 'lucide-react';
import {
    EmailConfig,
    getEmailConfig,
    saveEmailConfig,
    sendInvoiceEmail,
    isEmailConfigured
} from '@/lib/email-service';

interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerEmail: string;
    customerName: string;
    invoiceNumber: string;
    invoiceHTML?: string;
}

export default function EmailModal({
    isOpen,
    onClose,
    customerEmail,
    customerName,
    invoiceNumber,
    invoiceHTML
}: EmailModalProps) {
    const [mode, setMode] = useState<'SEND' | 'CONFIG'>('SEND');
    const [config, setConfig] = useState<EmailConfig>({
        serviceId: '',
        templateIdInvoice: '',
        templateIdConfirm: '',
        publicKey: '' // "User ID" in EmailJS dashboard
    });

    const [emailTo, setEmailTo] = useState(customerEmail);
    const [sending, setSending] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const currentConfig = getEmailConfig();
            setConfig(currentConfig);
            setEmailTo(customerEmail);

            // Auto-switch to config if not configured
            if (!isEmailConfigured()) {
                setMode('CONFIG');
            } else {
                setMode('SEND');
            }
        }
    }, [isOpen, customerEmail]);

    const handleSaveConfig = () => {
        setSaving(true);
        try {
            saveEmailConfig(config);
            setMode('SEND');
            alert('Settings saved successfully!');
        } catch (e) {
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSendEmail = async () => {
        if (!invoiceHTML) {
            alert('Invoice content not ready');
            return;
        }

        setSending(true);
        try {
            await sendInvoiceEmail(
                emailTo,
                customerName,
                invoiceNumber,
                invoiceHTML
            );
            alert('Email sent successfully!');
            onClose();
        } catch (error: any) {
            alert(`Failed to send email: ${error.message || 'Unknown error'}`);
            if (error.message && error.message.includes('not configured')) {
                setMode('CONFIG');
            }
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', zIndex: 1100,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                background: 'white', padding: 24, borderRadius: 12, width: '100%', maxWidth: 500,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {mode === 'SEND' ? <><Mail size={20} /> Email Invoice</> : <><Settings size={20} /> Email Settings</>}
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {mode === 'SEND' && (
                            <button
                                onClick={() => setMode('CONFIG')}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                title="Settings"
                            >
                                <Settings size={20} />
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {mode === 'CONFIG' ? (
                    <div>
                        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#475569' }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Setup Instructions (EmailJS)</strong>
                            1. Sign up/Login at <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>emailjs.com</a><br />
                            2. Add an Email Service (e.g. Gmail) &rarr; Copy <strong>Service ID</strong><br />
                            3. Create an Email Template &rarr; Copy <strong>Template ID</strong><br />
                            4. Go to Account &gt; API Keys &rarr; Copy <strong>Public Key</strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <label>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Service ID</div>
                                <input
                                    type="text"
                                    value={config.serviceId}
                                    onChange={e => setConfig({ ...config, serviceId: e.target.value })}
                                    placeholder="service_xxxxx"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </label>

                            <label>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Invoice Template ID</div>
                                <input
                                    type="text"
                                    value={config.templateIdInvoice}
                                    onChange={e => setConfig({ ...config, templateIdInvoice: e.target.value })}
                                    placeholder="template_xxxxx"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </label>

                            <label>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Public Key</div>
                                <input
                                    type="text"
                                    value={config.publicKey}
                                    onChange={e => setConfig({ ...config, publicKey: e.target.value })}
                                    placeholder="Usually ~20 chars"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </label>

                            <label>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Confirmation Template ID (Optional)</div>
                                <input
                                    type="text"
                                    value={config.templateIdConfirm}
                                    onChange={e => setConfig({ ...config, templateIdConfirm: e.target.value })}
                                    placeholder="template_xxxxx"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </label>
                        </div>

                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                onClick={() => isEmailConfigured() ? setMode('SEND') : onClose()}
                                style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                style={{
                                    padding: '8px 20px', background: '#3b82f6', color: 'white',
                                    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}
                            >
                                {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', marginBottom: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#64748b' }}>Customer Email</div>
                                <input
                                    type="email"
                                    value={emailTo}
                                    onChange={e => setEmailTo(e.target.value)}
                                    placeholder="customer@example.com"
                                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                                />
                            </label>

                            <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', fontSize: 13, color: '#0369a1', display: 'flex', gap: 8 }}>
                                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                                <div>
                                    Calculated invoice #{invoiceNumber} will be attached to the email body.
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                onClick={onClose}
                                style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={sending}
                                style={{
                                    padding: '8px 20px', background: '#3b82f6', color: 'white',
                                    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}
                            >
                                {sending ? 'Sending...' : <><Send size={18} /> Send Email</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

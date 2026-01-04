import React, { useState, useEffect } from 'react';
import { Mail, Settings, X, Send, Save, AlertTriangle } from 'lucide-react';
import {
    EmailConfig,
    getEmailConfig,
    saveEmailConfig,
    sendInvoiceEmail,
    isEmailConfigured
} from '@/lib/email-service';

const [config, setConfig] = useState<EmailConfig>({
    serviceId: '',
    templateIdInvoice: '',
    templateIdConfirm: '',
    publicKey: '',
    privateKey: '' // Added privateKey
});

const [emailTo, setEmailTo] = useState(customerEmail);
const [sending, setSending] = useState(false);
const [saving, setSaving] = useState(false);

    // We need to import these specific functions for PDF generation
    // Assuming they are available or we can use the ref we might need to pass in?
    // Actually, in page.tsx we have the `invoiceRef`. 
    // `EmailModal` received `invoiceHTML`. 
    // To generate a PDF blob cleanly we might need the ref or regenerate it.
    // However, `getInvoicePDFBlob` takes an HTMLElement. 
    // We can try to construct one or pass the ref.
    // 
    // Better approach: Pass a callback `onSend` from page.tsx that handles the heavy lifting?
    // Or just pass the Ref to this modal?
    // Passing the Ref is tricky if conditional.
    // 
    // Let's modify the props to accept an `getBlob` function or similar.
    // OR we can parse the HTML string back to an element (messy).
    // 
    // Best quick solution: Import executing logic here but we need the ELEMENT.
    // Let's updated `EmailModal` to accept `invoiceRef`? 
    // Or just `onSend: (email: string) => Promise<void>`?
    // 
    // Let's refactor `EmailModal` to take `onSend` prop which will be implemented in `page.tsx`
    // using the existing `invoiceRef` there. This keeps PDF logic near the Ref.
    //
    // WAIT: I can't easily change `page.tsx` AND `EmailModal.tsx` in one step without breaking interface.
    // 
    // Alternative:
    // `EmailModal` is already imported in `page.tsx`.
    // I will change `handleSendEmail` inside `EmailModal` to call a new prop `onSend` IF it exists.
    // If not, fall back to old behavior?
    // 
    // Actually, the user wants PDF.
    // I will change the component to accept `onSend` and REMOVE the internal `sendInvoiceEmail` call from the actual sending button,
    // lifting the state up.
    // But `EmailModal` manages the CONFIG.
    //
    // Hybrid:
    // `EmailModal` manages Config. 
    // When "Send" is clicked, it calls `onSend(email, config)`.
    // Then `page.tsx` uses that config + its `invoiceRef` to call `sendInvoiceEmailServer`.

    // Let's update the interface first.
}

// ... imports ...

interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerEmail: string;
    customerName: string;
    invoiceNumber: string;
    invoiceHTML?: string; /* Still used for preview or fallback? */
    onSend: (email: string, config: EmailConfig) => Promise<void>;
}

export default function EmailModal({
    isOpen,
    onClose,
    customerEmail,
    customerName,
    invoiceNumber,
    onSend
}: EmailModalProps) {
    const [mode, setMode] = useState<'SEND' | 'CONFIG'>('SEND');
    const [config, setConfig] = useState<EmailConfig>({
        serviceId: '',
        templateIdInvoice: '',
        templateIdConfirm: '',
        publicKey: '',
        privateKey: ''
    });

    const [emailTo, setEmailTo] = useState(customerEmail);
    const [sending, setSending] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const currentConfig = getEmailConfig();
            setConfig(currentConfig);
            setEmailTo(customerEmail);

            // Auto-switch to config if basic keys missing
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

    const handleSendClick = async () => {
        setSending(true);
        try {
            // Use the provided onSend callback which has access to the Invoice Ref for PDF generation
            await onSend(emailTo, config);
            alert('Email sent successfully!');
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(`Failed to send email: ${error.message || 'Unknown error'}`);
            // If auth error, maybe suggest config?
            if (error.message && (error.message.includes('configured') || error.message.includes('Key'))) {
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
                        {mode === 'SEND' ? <><Mail size={20} /> Email Invoice (PDF)</> : <><Settings size={20} /> Email Settings</>}
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
                            1. Login at <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>emailjs.com</a><br />
                            2. <strong>Service ID</strong> (Email Services)<br />
                            3. <strong>Template ID</strong> (Email Templates)<br />
                            4. <strong>Public Key</strong> & <strong>Private Key</strong> (Account &gt; API Keys)
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
                            <label>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Service ID</div>
                                <input
                                    type="text"
                                    value={config.serviceId}
                                    onChange={e => setConfig({ ...config, serviceId: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </label>

                            <label>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Invoice Template ID</div>
                                <input
                                    type="text"
                                    value={config.templateIdInvoice}
                                    onChange={e => setConfig({ ...config, templateIdInvoice: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <label>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Public Key</div>
                                    <input
                                        type="text"
                                        value={config.publicKey}
                                        onChange={e => setConfig({ ...config, publicKey: e.target.value })}
                                        placeholder="User ID"
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                    />
                                </label>
                                <label>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Private Key</div>
                                    <input
                                        type="password"
                                        value={config.privateKey || ''}
                                        onChange={e => setConfig({ ...config, privateKey: e.target.value })}
                                        placeholder="Access Token"
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                                    />
                                </label>
                            </div>

                            <label>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Confirmation Template ID (Optional)</div>
                                <input
                                    type="text"
                                    value={config.templateIdConfirm}
                                    onChange={e => setConfig({ ...config, templateIdConfirm: e.target.value })}
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
                                    Invoice <strong>#{invoiceNumber}</strong> will be attached as a PDF.
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
                                onClick={handleSendClick}
                                disabled={sending}
                                style={{
                                    padding: '8px 20px', background: '#3b82f6', color: 'white',
                                    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}
                            >
                                {sending ? 'Sending...' : <><Send size={18} /> Send PDF</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

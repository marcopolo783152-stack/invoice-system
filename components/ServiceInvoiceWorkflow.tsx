'use client';
import React, { useEffect, useState } from 'react';
import { SavedInvoice } from '@/lib/invoice-storage';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import { canAccess } from '@/lib/access-policy';
import { displayServiceDate, emptyPlan, isServiceComplete, isServiceInvoice, ServiceAction, ServiceCall, ServicePlan } from '@/lib/service-workflow';
import { subscribeServiceInvoice, updateServiceWorkflow } from '@/lib/service-workflow-storage';
import styles from './ServiceWorkflow.module.css';

const timestamp = (at: string) => new Date(at).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' });

export default function ServiceInvoiceWorkflow({ invoice: initial, onUpdated }: { invoice: SavedInvoice; onUpdated: (invoice: SavedInvoice) => void }) {
  const { staff } = useStaffAccess();
  const [invoice, setInvoice] = useState(initial);
  const [plan, setPlan] = useState<ServicePlan>(initial.data.serviceWorkflow?.plan || emptyPlan());
  const [planRevision, setPlanRevision] = useState(initial.data.serviceWorkflow?.revision || 0);
  const [dirty, setDirty] = useState(false);
  const [outcome, setOutcome] = useState<ServiceCall['outcome']>('answered');
  const [message, setMessage] = useState<ServiceCall['message']>('none');
  const [notes, setNotes] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [synced, setSynced] = useState(false);
  const workflow = invoice.data.serviceWorkflow;
  const calls = workflow?.calls || [];
  const latest = calls[calls.length - 1];
  const complete = isServiceComplete(invoice.data);
  const readable = canAccess(staff, 'invoices');
  const writable = canAccess(staff, 'invoices', 'write') && synced && !invoice.data.isDraft && !invoice.data.returned;

  useEffect(() => {
    setSynced(false);
    if (!isServiceInvoice(initial.data) || !readable) return;
    return subscribeServiceInvoice(initial.id, next => {
      setInvoice(next); onUpdated(next); setSynced(true); setError('');
    }, message => { setError(message); setSynced(false); });
    // The subscription owns the latest snapshot; parent callback identity may change per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id, staff?.uid, readable]);
  useEffect(() => {
    if (!dirty) { setPlan(workflow?.plan || emptyPlan()); setPlanRevision(workflow?.revision || 0); }
  }, [workflow, dirty]);

  if (!isServiceInvoice(initial.data)) return null;
  const editPlan = (patch: Partial<ServicePlan>) => { setDirty(true); setPlan(current => ({ ...current, ...patch })); setNotice(''); };
  async function save(action: ServiceAction) {
    if (!staff || !writable || busy) return false;
    setBusy(true); setError(''); setNotice('');
    try { await updateServiceWorkflow(invoice.id, action, staff); setNotice('Saved.'); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please try again.'); return false; }
    finally { setBusy(false); }
  }
  async function logCall(event: React.FormEvent) {
    event.preventDefault();
    const success = await save({ type: 'call', call: { id: crypto.randomUUID(), outcome, message, notes,
      pickupDate: outcome === 'answered' ? pickupDate : '', pickupTime: outcome === 'answered' ? pickupTime : '', followUpDate } });
    if (success) { setNotes(''); setPickupDate(''); setPickupTime(''); setFollowUpDate(''); setMessage('none'); }
  }
  return <section className={`${styles.panel} no-print`} aria-label="Service calls and delivery">
    <div className={styles.heading}>
      <div><h2>Customer contact & delivery</h2><p className={styles.muted}>Staff notes · All dates and times are Alexandria, VA time</p></div>
      <span className={styles.badge}>{complete ? workflow?.delivered ? 'Delivered' : 'Picked up' : latest ? latest.outcome === 'answered' ? 'Customer answered' : 'No answer' : 'Not called'}</span>
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {notice && <p role="status" className={styles.success}>{notice}</p>}
    {!synced && !error && <p role="status" className={styles.muted}>Connecting to service records…</p>}
    {!writable && synced && <p className={styles.muted}>{invoice.data.isDraft ? 'Save this invoice before recording calls or scheduling delivery.' : 'You can view these records. Invoice write access is required to make changes.'}</p>}
    <div className={styles.columns}>
      <div className={styles.section}>
        <h3>Record a customer call</h3>
        {complete ? <p className={styles.muted}>Service completed. Call history is retained below.</p> : <form className={styles.form} onSubmit={logCall}>
          <fieldset disabled={!writable || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} className={styles.form}>
            <label>Call result<select value={outcome} onChange={e => { setOutcome(e.target.value as ServiceCall['outcome']); setPickupDate(''); setPickupTime(''); setMessage('none'); }}><option value="answered">Customer answered</option><option value="no_answer">No answer</option></select></label>
            {outcome === 'no_answer' ? <label>What happened?<select value={message} onChange={e => setMessage(e.target.value as ServiceCall['message'])}><option value="none">No message left</option><option value="voicemail">Left a voicemail</option><option value="text">Sent a message / text</option></select></label> : <div className={styles.row}>
              <label>Customer coming on (optional)<input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} /></label>
              <label>Expected time (optional)<input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} /></label>
            </div>}
            <label>Notes<textarea maxLength={4000} placeholder={outcome === 'answered' ? 'What did the customer confirm?' : 'Message details or reason to call again'} value={notes} onChange={e => setNotes(e.target.value)} /></label>
            <label>Follow-up date{outcome === 'no_answer' ? ' *' : ' (optional)'}<input type="date" required={outcome === 'no_answer'} value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} /></label>
            <p className={styles.muted}>Recorded by {staff?.name || staff?.email || 'signed-in staff'} · Date and time are saved automatically. This records contact already made.</p>
            <button className={styles.button} disabled={busy}>Save call result</button>
          </fieldset>
        </form>}
        {workflow?.followUpDate && !complete && <div style={{ marginTop: 14 }}><p>Next follow-up: <strong>{displayServiceDate(workflow.followUpDate)}</strong></p><button type="button" className={styles.secondary} disabled={!writable || busy} onClick={() => save({ type: 'followup_done', expectedRevision: workflow.revision })}>Mark follow-up handled</button></div>}
      </div>
      <div className={styles.section}>
        <h3>Return to customer</h3>
        {workflow?.delivered ? <><p className={styles.success}>Delivered {timestamp(workflow.delivered.at)} by {workflow.delivered.by.name}</p><button className={styles.secondary} disabled={!writable || busy} onClick={() => { if (window.confirm('Reopen this delivery and return it to the active dashboard?')) save({ type: 'reopen', expectedRevision: workflow.revision }); }}>Reopen delivery</button></> : complete ? <p className={styles.muted}>Customer pickup has been completed.</p> : <form className={styles.form} onSubmit={async e => { e.preventDefault(); if (await save({ type: 'plan', plan, expectedRevision: planRevision })) setDirty(false); }}>
          <fieldset disabled={!writable || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} className={styles.form}>
            <label>Return method<select value={plan.method} onChange={e => editPlan({ method: e.target.value as ServicePlan['method'] })}><option value="pickup">Customer pickup</option><option value="delivery">Delivery to customer</option></select></label>
            <label>{plan.method === 'delivery' ? 'Delivery date' : 'Scheduled pickup date'}<input type="date" value={plan.date} onChange={e => editPlan({ date: e.target.value })} /></label>
            <div className={styles.row}><label>Window start<input type="time" value={plan.startTime} onChange={e => editPlan({ startTime: e.target.value })} /></label><label>Window end<input type="time" value={plan.endTime} onChange={e => editPlan({ endTime: e.target.value })} /></label></div>
            <label>Assigned staff / driver<input maxLength={200} value={plan.assignedTo} onChange={e => editPlan({ assignedTo: e.target.value })} placeholder="Staff member or delivery team" /></label>
            <label>Dispatch notes<textarea maxLength={4000} value={plan.notes} onChange={e => editPlan({ notes: e.target.value })} placeholder="Delivery address, access instructions, or customer requests" /></label>
            {plan.method === 'delivery' && !plan.date && <p className={styles.muted}>Save without a date to show this under “Needs scheduling” on the dashboard.</p>}
            {dirty && planRevision !== (workflow?.revision || 0) && <p className={styles.error}>This record changed while you were editing. <button type="button" className={styles.secondary} onClick={() => setDirty(false)}>Load latest details</button></p>}
            <button className={styles.button} disabled={busy || (dirty && planRevision !== (workflow?.revision || 0))}>Save schedule</button>
          </fieldset>
          {workflow?.plan.method === 'delivery' && workflow.plan.date && <button type="button" className={styles.secondary} disabled={!writable || busy || dirty} onClick={() => { if (window.confirm(`Mark invoice ${invoice.data.invoiceNumber} delivered? This will remove it from active delivery reminders.`)) save({ type: 'delivered', expectedRevision: workflow.revision }); }}>Mark delivered</button>}
          <p className={styles.muted}>Delivery completion leaves payment records unchanged.</p>
        </form>}
      </div>
    </div>
    <details className={styles.history} open={calls.length > 0}>
      <summary>Call history ({calls.length})</summary>
      {calls.length === 0 ? <p className={styles.muted}>No calls recorded yet.</p> : [...calls].reverse().map(call => <article key={call.id} className={styles.entry}>
        <strong>{call.outcome === 'answered' ? 'Customer answered' : 'No answer'}{call.outcome === 'no_answer' ? ` · ${call.message === 'voicemail' ? 'Voicemail left' : call.message === 'text' ? 'Message / text sent' : 'No message left'}` : ''}</strong>
        <p className={styles.muted}>{timestamp(call.at)} · {call.by.name}</p>
        {call.pickupDate && <p className={styles.notes}>Customer coming: {displayServiceDate(call.pickupDate)}{call.pickupTime ? ` at ${call.pickupTime}` : ''}</p>}
        {call.followUpDate && <p className={styles.muted}>Follow-up requested: {displayServiceDate(call.followUpDate)}</p>}
        {call.notes && <p className={styles.notes}>{call.notes}</p>}
      </article>)}
    </details>
  </section>;
}

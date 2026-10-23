'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import { canAccess } from '@/lib/access-policy';
import { SavedInvoice } from '@/lib/invoice-storage';
import { deliveryBucket, displayServiceDate, followUpBucket } from '@/lib/service-workflow';
import { subscribeServiceInvoices } from '@/lib/service-workflow-storage';
import styles from './ServiceWorkflow.module.css';

type Tab = 'today' | 'overdue' | 'upcoming' | 'unscheduled' | 'followups';
const tabs: { id: Tab; label: string }[] = [{ id: 'today', label: 'Deliveries today' }, { id: 'overdue', label: 'Overdue' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'unscheduled', label: 'Needs scheduling' }, { id: 'followups', label: 'Call follow-ups' }];

export default function ServiceOperationsDashboard({ onInvoicesUpdated }: { onInvoicesUpdated?: (invoices: SavedInvoice[]) => void }) {
  const { staff, loading: accessLoading } = useStaffAccess();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [tab, setTab] = useState<Tab>('today');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const allowed = canAccess(staff, 'invoices');
  useEffect(() => {
    if (!allowed) { setInvoices([]); return; }
    setLoading(true); setError('');
    return subscribeServiceInvoices(rows => { setInvoices(rows); onInvoicesUpdated?.(rows); setLoading(false); setError(''); }, message => { setError(message); setLoading(false); });
  }, [staff?.uid, allowed, onInvoicesUpdated]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    const refresh = () => setNow(new Date());
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);
  if (accessLoading || !allowed) return null;
  const groups: Record<Tab, SavedInvoice[]> = { today: [], overdue: [], upcoming: [], unscheduled: [], followups: [] };
  for (const invoice of invoices) {
    const bucket = deliveryBucket(invoice.data, now);
    if (bucket) groups[bucket].push(invoice);
    if (followUpBucket(invoice.data, now)) groups.followups.push(invoice);
  }
  for (const key of Object.keys(groups) as Tab[]) groups[key].sort((a, b) => {
    const dateA = key === 'followups' ? a.data.serviceWorkflow?.followUpDate : `${a.data.serviceWorkflow?.plan.date || ''} ${a.data.serviceWorkflow?.plan.startTime || ''}`;
    const dateB = key === 'followups' ? b.data.serviceWorkflow?.followUpDate : `${b.data.serviceWorkflow?.plan.date || ''} ${b.data.serviceWorkflow?.plan.startTime || ''}`;
    return (dateA || '').localeCompare(dateB || '') || a.data.invoiceNumber.localeCompare(b.data.invoiceNumber);
  });
  const dueCalls = groups.followups.filter(row => followUpBucket(row.data, now) !== 'upcoming').length;
  return <section className={`${styles.panel} no-print`} aria-label="Service delivery and call reminders">
    <div className={styles.heading}><div><h2>Service desk</h2><p className={styles.muted}>Delivery schedule & customer follow-ups · Alexandria, VA time · Updates automatically</p></div><span className={styles.badge}>{groups.overdue.length} overdue deliveries · {dueCalls} calls due</span></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.tabs} role="tablist" aria-label="Service reminders">{tabs.map(item => <button type="button" role="tab" aria-selected={tab === item.id} aria-controls="service-reminder-list" key={item.id} className={`${styles.tab} ${tab === item.id ? styles.active : ''}`} onClick={() => setTab(item.id)}>{item.label} ({groups[item.id].length})</button>)}</div>
    <div id="service-reminder-list" role="tabpanel" aria-label={tabs.find(item => item.id === tab)?.label} className={styles.list}>
      {loading ? <p role="status" className={styles.muted}>Loading service records…</p> : !error && !groups[tab].length ? <p className={styles.muted}>No {tabs.find(item => item.id === tab)?.label.toLowerCase()}.</p> : groups[tab].map(invoice => {
        const data = invoice.data, workflow = data.serviceWorkflow!;
        const latest = workflow.calls[workflow.calls.length - 1];
        const href = `/admin/invoices/invoices/view?id=${encodeURIComponent(invoice.id)}`;
        return <article className={styles.card} key={invoice.id}>
          <div><Link href={href}>#{data.invoiceNumber} · {data.soldTo?.name || 'Customer'}</Link>
            {data.soldTo?.phone && <p><a href={`tel:${data.soldTo.phone.replace(/[^+\d]/g, '')}`}>{data.soldTo.phone}</a></p>}
            {tab === 'followups' ? <><p><strong>{followUpBucket(data, now) === 'overdue' ? 'Overdue follow-up' : followUpBucket(data, now) === 'today' ? 'Call today' : 'Follow-up'}: {displayServiceDate(workflow.followUpDate)}</strong></p>
              {latest && <p className={styles.muted}>Last call: {latest.outcome === 'answered' ? 'Answered' : latest.message === 'voicemail' ? 'Voicemail left' : latest.message === 'text' ? 'Message sent' : 'No answer'} · {latest.by.name}</p>}</> : <><p><strong>{displayServiceDate(workflow.plan.date)}{workflow.plan.startTime ? ` · ${workflow.plan.startTime}${workflow.plan.endTime ? `–${workflow.plan.endTime}` : ''}` : ''}</strong></p><p className={styles.muted}>Assigned: {workflow.plan.assignedTo || 'Unassigned'} · Service: {data.status || 'In progress'}</p>{workflow.plan.notes && <p className={styles.notes}>{workflow.plan.notes}</p>}</>}
          </div><Link className={styles.secondary} href={href}>{tab === 'followups' ? 'Record call' : tab === 'unscheduled' ? 'Schedule delivery' : 'Open delivery'}</Link>
        </article>;
      })}
    </div>
  </section>;
}

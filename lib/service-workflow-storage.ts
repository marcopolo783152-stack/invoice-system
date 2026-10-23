'use client';
import { collection, doc, onSnapshot, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './auth';
import { getStorePrefix } from './user-storage';
import { canAccess, StaffAccess } from './access-policy';
import { InvoiceData } from './calculations';
import { SavedInvoice } from './invoice-storage';
import { applyServiceAction, ServiceAction } from './service-workflow';

export async function updateServiceWorkflow(id: string, action: ServiceAction, staff: StaffAccess): Promise<void> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== staff.uid || !canAccess(staff, 'invoices', 'write')) throw new Error('Sign in with permission to update invoices.');
  const ref = doc(db, getStorePrefix() + 'invoices', id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This invoice no longer exists.');
    const workflow = applyServiceAction(snapshot.data().data as InvoiceData, action, { uid: staff.uid, name: staff.name || staff.email }, new Date().toISOString());
    // Updating only this field protects payments, signatures, prices and service status.
    transaction.update(ref, { 'data.serviceWorkflow': workflow, updatedAt: Timestamp.now() });
  });
  window.dispatchEvent(new Event('backup-trigger'));
}

function savedInvoice(id: string, record: any): SavedInvoice {
  return { id, data: record.data, createdAt: record.createdAt?.toDate?.().toISOString() || '', updatedAt: record.updatedAt?.toDate?.().toISOString() || '' };
}
export function subscribeServiceInvoice(id: string, next: (invoice: SavedInvoice) => void, error: (message: string) => void) {
  if (!db) { error('Cloud storage is unavailable.'); return () => {}; }
  return onSnapshot(doc(db, getStorePrefix() + 'invoices', id), snapshot => {
    if (!snapshot.exists()) { error('This invoice no longer exists.'); return; }
    next(savedInvoice(snapshot.id, snapshot.data()));
  }, () => error('Unable to sync this invoice. Check your connection and invoice access.'));
}
export function subscribeServiceInvoices(next: (invoices: SavedInvoice[]) => void, error: (message: string) => void) {
  if (!db) { error('Cloud storage is unavailable.'); return () => {}; }
  return onSnapshot(collection(db, getStorePrefix() + 'invoices'), snapshot => {
    next(snapshot.docs.map(row => savedInvoice(row.id, row.data())).filter(row => row.data));
  }, () => error('Unable to load service reminders. Check your connection and invoice access.'));
}

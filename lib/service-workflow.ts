import type { InvoiceData } from './calculations';

export type StaffStamp = { uid: string; name: string };
export type ServiceCall = {
  id: string; at: string; by: StaffStamp;
  outcome: 'answered' | 'no_answer';
  message: 'none' | 'voicemail' | 'text';
  notes: string; pickupDate: string; pickupTime: string; followUpDate: string;
};
export type ServicePlan = {
  method: 'pickup' | 'delivery'; date: string;
  startTime: string; endTime: string; assignedTo: string; notes: string;
};
export type ServiceWorkflow = {
  revision: number; calls: ServiceCall[]; followUpDate: string;
  plan: ServicePlan; updatedAt: string; updatedBy: StaffStamp;
  delivered: { at: string; by: StaffStamp } | null;
};
export type ServiceAction =
  | { type: 'call'; call: Omit<ServiceCall, 'by' | 'at'> }
  | { type: 'plan'; plan: ServicePlan; expectedRevision: number }
  | { type: 'followup_done'; expectedRevision: number }
  | { type: 'delivered'; expectedRevision: number }
  | { type: 'reopen'; expectedRevision: number };

export const emptyPlan = (): ServicePlan => ({ method: 'pickup', date: '', startTime: '', endTime: '', assignedTo: '', notes: '' });
export const isServiceInvoice = (data: InvoiceData) => data.documentType === 'WASH' || data.mode === 'wash';
export const isServiceComplete = (data: InvoiceData) => data.status === 'picked_up' || !!data.serviceWorkflow?.delivered;
export const servicePickupDate = (data: InvoiceData) => data.serviceWorkflow?.plan.method === 'pickup' && data.serviceWorkflow.plan.date ? data.serviceWorkflow.plan.date : data.pickupDate;

export function preserveServiceWorkflow(edited: InvoiceData, current: InvoiceData): InvoiceData {
  const result = { ...edited };
  delete result.serviceWorkflow;
  if (current.serviceWorkflow) result.serviceWorkflow = current.serviceWorkflow;
  return result;
}

// Dates represent the Alexandria showroom's calendar, regardless of a staff device's timezone.
export function businessClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}
export function displayServiceDate(date: string) {
  return date ? `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(0, 4)}` : 'Not scheduled';
}
function checkDate(value: string) {
  if (!value) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error('Enter a valid date.');
}
function checkTime(value: string) {
  if (value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Enter a valid time.');
}
export function deliveryBucket(data: InvoiceData, now = new Date()): 'today' | 'upcoming' | 'overdue' | 'unscheduled' | null {
  const workflow = data.serviceWorkflow;
  if (!isServiceInvoice(data) || data.isDraft || data.returned || isServiceComplete(data) || workflow?.plan?.method !== 'delivery') return null;
  const plan = workflow.plan, clock = businessClock(now);
  if (!plan.date) return 'unscheduled';
  if (plan.date < clock.date || (plan.date === clock.date && !!plan.endTime && plan.endTime < clock.time)) return 'overdue';
  return plan.date === clock.date ? 'today' : 'upcoming';
}
export function followUpBucket(data: InvoiceData, now = new Date()): 'today' | 'overdue' | 'upcoming' | null {
  const date = data.serviceWorkflow?.followUpDate;
  if (!isServiceInvoice(data) || data.isDraft || data.returned || isServiceComplete(data) || !date) return null;
  const today = businessClock(now).date;
  return date < today ? 'overdue' : date === today ? 'today' : 'upcoming';
}

// Pure transition used inside a Firestore transaction: never replace another staff member's history.
export function applyServiceAction(data: InvoiceData, action: ServiceAction, by: StaffStamp, at: string): ServiceWorkflow {
  if (!isServiceInvoice(data) || data.isDraft || data.returned) throw new Error('Only active, saved service invoices can be updated.');
  const previous = data.serviceWorkflow;
  const workflow: ServiceWorkflow = {
    revision: previous?.revision || 0, calls: previous?.calls || [], followUpDate: previous?.followUpDate || '',
    plan: previous?.plan || emptyPlan(), delivered: previous?.delivered || null, updatedAt: at, updatedBy: by,
  };
  if ('expectedRevision' in action && action.expectedRevision !== workflow.revision) throw new Error('Another staff member updated this invoice. Review the latest details and try again.');
  if (action.type !== 'reopen' && isServiceComplete(data)) throw new Error('This service is already completed.');
  if (action.type === 'call') {
    const call = action.call;
    if (workflow.calls.some(c => c.id === call.id)) return previous!; // safe retry
    if (!call.id || !['answered', 'no_answer'].includes(call.outcome) || !['none', 'voicemail', 'text'].includes(call.message)) throw new Error('Select a call result.');
    checkDate(call.pickupDate); checkDate(call.followUpDate); checkTime(call.pickupTime);
    if (call.pickupTime && !call.pickupDate) throw new Error('Choose the customer pickup date.');
    if (call.outcome === 'no_answer' && !call.followUpDate) throw new Error('Choose a follow-up date for an unanswered call.');
    if (call.notes.length > 4000) throw new Error('Keep notes under 4,000 characters.');
    const entry: ServiceCall = { ...call, notes: call.notes.trim(), at, by,
      message: call.outcome === 'answered' ? 'none' : call.message,
      pickupDate: call.outcome === 'answered' ? call.pickupDate : '',
      pickupTime: call.outcome === 'answered' ? call.pickupTime : '' };
    workflow.calls = [...workflow.calls, entry];
    workflow.followUpDate = entry.followUpDate;
    if (entry.pickupDate && workflow.plan.method === 'pickup') {
      workflow.plan = { ...workflow.plan, date: entry.pickupDate, startTime: entry.pickupTime, endTime: '' };
    }
  } else if (action.type === 'plan') {
    const plan = action.plan;
    if (!['pickup', 'delivery'].includes(plan.method)) throw new Error('Select pickup or delivery.');
    checkDate(plan.date); checkTime(plan.startTime); checkTime(plan.endTime);
    if ((plan.startTime || plan.endTime) && !plan.date) throw new Error('Choose a date before entering a time window.');
    if (plan.endTime && (!plan.startTime || plan.endTime <= plan.startTime)) throw new Error('The end time must be after the start time.');
    if (plan.assignedTo.length > 200 || plan.notes.length > 4000) throw new Error('Staff name or notes are too long.');
    workflow.plan = { ...plan, assignedTo: plan.assignedTo.trim(), notes: plan.notes.trim() };
  } else if (action.type === 'followup_done') {
    workflow.followUpDate = '';
  } else if (action.type === 'delivered') {
    if (workflow.plan.method !== 'delivery' || !workflow.plan.date) throw new Error('Schedule a delivery date first.');
    workflow.delivered = { at, by };
    workflow.followUpDate = '';
  } else if (action.type === 'reopen') {
    if (!workflow.delivered || data.status === 'picked_up') throw new Error('Only a completed delivery can be reopened here.');
    workflow.delivered = null;
  }
  workflow.revision += 1;
  return workflow;
}

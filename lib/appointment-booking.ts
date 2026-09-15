import { collection, doc, runTransaction } from 'firebase/firestore';
import { auth } from './auth';
import { db } from './firebase';
import { APPOINTMENT_STAFF, appointmentSlots, isFutureSlot } from './appointment-slots';

export async function reserveAppointment(input: {
  name: string; email: string; phone: string; staffId: string; date: string; time: string; notes: string;
}) {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Please wait for the secure connection and try again.');
  const staff = APPOINTMENT_STAFF.find(s => s.id === input.staffId);
  if (!staff || !isFutureSlot(input.date, input.time)) throw new Error('Please select an available future time.');
  if (!input.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.phone.replace(/\D/g, '').length < 7)
    throw new Error('Please enter your full name, valid email, and phone number.');
  const slotId = input.staffId + '_' + input.date + '_' + input.time;
  const slotRef = doc(db, 'showroom_appointment_slots', slotId);
  const appointmentRef = doc(collection(db, 'showroom_appointments'));
  await runTransaction(db, async tx => {
    const slot = await tx.get(slotRef);
    if (slot.exists()) throw new Error('That time was just booked. Please choose another time.');
    const booking = {
      id: appointmentRef.id, ownerUid: auth.currentUser!.uid, staffId: staff.id,
      manager: staff.name, name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim(),
      date: input.date, time: appointmentSlots().find(s => s.value === input.time)!.label,
      slotTime: input.time, slotId, notes: input.notes.trim(), status: 'pending',
      createdAt: new Date().toISOString(),
    };
    tx.set(appointmentRef, booking);
    // Public availability contains no customer contact information.
    tx.set(slotRef, { staffId: staff.id, date: input.date, time: input.time, appointmentId: appointmentRef.id });
  });
}

export async function changeAppointmentStatus(id: string, status: 'confirmed' | 'rejected' | 'cancelled') {
  const ref = doc(db, 'showroom_appointments', id);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Appointment no longer exists.');
    const booking = snap.data();
    const slotRef = booking.slotId ? doc(db, 'showroom_appointment_slots', booking.slotId) : null;
    const slot = slotRef ? await tx.get(slotRef) : null;
    if (status === 'confirmed' && slotRef) {
      if (slot?.exists() && slot.data().appointmentId !== id) throw new Error('This time has been booked by another customer.');
      if (!slot?.exists()) {
        if (!isFutureSlot(booking.date, booking.slotTime)) throw new Error('Please book a new future appointment.');
        tx.set(slotRef, { staffId: booking.staffId, date: booking.date, time: booking.slotTime, appointmentId: id });
      }
    }
    tx.update(ref, { status });
    if (status !== 'confirmed' && slotRef && slot?.exists() && slot.data().appointmentId === id) tx.delete(slotRef);
  });
}

export async function deleteAppointment(id: string) {
  const ref = doc(db, 'showroom_appointments', id);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const slotRef = snap.data().slotId ? doc(db, 'showroom_appointment_slots', snap.data().slotId) : null;
    const slot = slotRef ? await tx.get(slotRef) : null;
    if (slotRef && slot?.exists() && slot.data().appointmentId === id) tx.delete(slotRef);
    tx.delete(ref);
  });
}

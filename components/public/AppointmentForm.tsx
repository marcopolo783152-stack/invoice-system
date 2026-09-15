'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle2, Loader2, Send } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { reserveAppointment } from '@/lib/appointment-booking';
import { APPOINTMENT_STAFF, appointmentSlots, showroomNow, isFutureSlot } from '@/lib/appointment-slots';
import AddressAutocomplete from '../AddressAutocomplete';

export default function AppointmentForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        staffId: 'nazif',
        date: '',
        time: '',
        notes: '',
        address: '',
        city: '',
        state: '',
        zip: ''
    });

    const [booked, setBooked] = useState<string[]>([]);
    const [availabilityReady, setAvailabilityReady] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    useEffect(() => {
      setBooked([]);
      setAvailabilityReady(false);
      setError('');
      if (!formData.date) return;
      return onSnapshot(query(collection(db, 'showroom_appointment_slots'),
        where('staffId', '==', formData.staffId), where('date', '==', formData.date)), snapshot => {
          setBooked(snapshot.docs.map(d => d.data().time));
          setAvailabilityReady(true);
        }, () => { setError('Availability could not be checked. Please try again or call the showroom.'); setAvailabilityReady(false); });
    }, [formData.staffId, formData.date, refresh]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value, ...(name === 'staffId' || name === 'date' ? { time: '' } : {}) }));
    };

    const generateTimeSlots = appointmentSlots;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!availabilityReady || booked.includes(formData.time)) return;
        setError('');
        setIsSubmitting(true);

        try {
            await reserveAppointment(formData);
            setIsSuccess(true);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
            setRefresh(v => v + 1);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 p-12 text-center rounded-sm">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                <h3 className="text-2xl font-serif text-emerald-900 mb-4">Appointment Request Received</h3>
                <p className="text-emerald-700 font-light max-w-md mx-auto">
                    Thank you, {formData.name}. We received your request to meet {APPOINTMENT_STAFF.find(s => s.id === formData.staffId)?.name} on {formData.date} at {appointmentSlots().find(s => s.value === formData.time)?.label} (Alexandria time). Your appointment is pending staff confirmation.
                </p>
                <button onClick={() => window.location.href = '/'} className="mt-8 px-6 py-3 bg-emerald-700 text-white font-bold uppercase tracking-wider text-sm rounded-sm hover:bg-emerald-800 transition-colors">
                    Return to Home
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-neutral-100 p-8 shadow-sm rounded-sm max-w-3xl mx-auto space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-serif text-neutral-900 mb-2">Book an Appointment</h2>
                <p className="text-neutral-500">Open every day, 10:00 AM–6:00 PM. Lunch: 1:30–2:00 PM. Appointments are 30 minutes, in Alexandria time.</p>
            </div>

            {error && <p role="alert" className="text-red-700">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Full Name</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Email Address</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Phone Number</label>
                    <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Consult with</label>
                    <select name="staffId" value={formData.staffId} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm">
                        {APPOINTMENT_STAFF.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Date</label>
                    <input required type="date" min={showroomNow().date} name="date" value={formData.date} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Time (Alexandria, Virginia)</label>
                    <select required disabled={!availabilityReady} name="time" value={formData.time} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm">
                        <option value="">Select a time</option>
                        {generateTimeSlots().map(slot => (
                            <option key={slot.value} value={slot.value} disabled={booked.includes(slot.value) || !isFutureSlot(formData.date, slot.value)}>{slot.label}{booked.includes(slot.value) ? " — Booked" : ""}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Additional Notes / Reason for Visit</label>
                <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
            </div>

            <button
                type="submit"
                disabled={isSubmitting || !availabilityReady || !isFutureSlot(formData.date, formData.time) || booked.includes(formData.time)}
                className="w-full bg-editorial-accent text-white font-bold uppercase tracking-widest text-sm py-4 flex items-center justify-center hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
                {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking Appointment...</>
                ) : (
                    <><Send className="w-4 h-4 mr-2" /> Book Appointment</>
                )}
            </button>
        </form>
    );
}

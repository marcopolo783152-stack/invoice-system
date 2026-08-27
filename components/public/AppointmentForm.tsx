'use client';

import React, { useState } from 'react';
import { Calendar, Clock, User, CheckCircle2, Loader2, Send } from 'lucide-react';

export default function AppointmentForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        manager: 'Mr. M. Nazif Manager of Marco Polo',
        date: '',
        time: '',
        notes: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const generateTimeSlots = () => {
        const slots = [];
        let current = new Date();
        current.setHours(10, 30, 0, 0);
        const end = new Date();
        end.setHours(17, 30, 0, 0);

        while (current <= end) {
            slots.push(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            current.setMinutes(current.getMinutes() + 30);
        }
        return slots;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // In a real app, this would save to Firebase/backend
            // For now, we simulate a network delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            setIsSuccess(true);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 p-12 text-center rounded-sm">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                <h3 className="text-2xl font-serif text-emerald-900 mb-4">Appointment Confirmed</h3>
                <p className="text-emerald-700 font-light max-w-md mx-auto">
                    Thank you, {formData.name}. Your appointment with {formData.manager} is scheduled for {formData.date} at {formData.time}. We will send you a confirmation email shortly.
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
                <p className="text-neutral-500">Schedule a 30-minute consultation with our management team.</p>
            </div>

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
                    <select name="manager" value={formData.manager} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm">
                        <option value="Mr. M. Nazif Manager of Marco Polo">Mr. M. Nazif (Manager of Marco Polo)</option>
                        <option value="Mr. Farid General Manager">Mr. Farid (General Manager)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Date</label>
                    <input required type="date" min={new Date().toISOString().split('T')[0]} name="date" value={formData.date} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Time (10:30 AM - 5:30 PM)</label>
                    <select required name="time" value={formData.time} onChange={handleChange} className="w-full border border-neutral-200 p-3 outline-none focus:border-editorial-accent text-sm">
                        <option value="">Select a time</option>
                        {generateTimeSlots().map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
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
                disabled={isSubmitting}
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

import React from 'react';
import AppointmentForm from '@/components/public/AppointmentForm';

export default function BookAppointmentPage() {
    return (
        <div className="bg-neutral-50 py-16 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-serif text-neutral-900 mb-6">Schedule a Consultation</h1>
                    <p className="text-lg text-neutral-600 max-w-2xl mx-auto font-light leading-relaxed">
                        Book a time to speak with our management team about your rug cleaning, repair, or appraisal needs.
                    </p>
                </div>
                <AppointmentForm />
            </div>
        </div>
    );
}

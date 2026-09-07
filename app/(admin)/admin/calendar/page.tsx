'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SHOWROOM_APPOINTMENTS } from '@/lib/showroom-firebase';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, SHOWROOM_APPOINTMENTS));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const selectedAppointments = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments.filter(app => app.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(app => app.date === dateStr);
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="p-8 bg-neutral-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-neutral-900 flex items-center gap-3">
            <CalendarIcon size={28} className="text-editorial-accent" /> Showroom Calendar
          </h1>
          <p className="text-neutral-500 mt-2">Manage your appointments and cleaning pickups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 shadow-sm p-6 rounded-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-800">{format(currentDate, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 border border-neutral-200 rounded-md hover:bg-neutral-50">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="p-2 border border-neutral-200 rounded-md hover:bg-neutral-50">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-px bg-neutral-200 border border-neutral-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-neutral-50 p-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
            
            {/* Empty slots for first week padding */}
            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white min-h-[100px]" />
            ))}

            {daysInMonth.map(date => {
              const dayApps = getAppointmentsForDay(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              
              return (
                <div 
                  key={date.toString()} 
                  onClick={() => setSelectedDate(date)}
                  className={`bg-white min-h-[100px] p-2 border-t border-transparent cursor-pointer transition-colors hover:bg-neutral-50 
                    ${isSelected ? 'ring-2 ring-inset ring-editorial-accent bg-blue-50/20' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isSameDay(date, new Date()) ? 'text-editorial-accent' : 'text-neutral-700'}`}>
                    {format(date, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayApps.slice(0, 3).map((app, i) => (
                      <div key={i} className="text-xs px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded truncate border border-neutral-200">
                        {app.time} - {app.name}
                      </div>
                    ))}
                    {dayApps.length > 3 && (
                      <div className="text-xs text-neutral-500 font-medium pl-1">+{dayApps.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        <div className="bg-white border border-neutral-200 shadow-sm p-6 rounded-md">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-4 mb-4">
            Agenda for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : '...'}
          </h2>
          
          {selectedAppointments.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
              <p>No appointments scheduled for this day.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {selectedAppointments.map(app => (
                <div key={app.id} className="p-4 border border-neutral-200 rounded-md hover:border-editorial-accent transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-neutral-800">{app.name}</div>
                    <div className="text-xs font-mono bg-neutral-100 px-2 py-1 rounded-full">{app.status || 'pending'}</div>
                  </div>
                  <div className="space-y-2 text-sm text-neutral-600 mt-3">
                    <div className="flex items-center gap-2"><Clock size={16} className="text-neutral-400"/> {app.time}</div>
                    <div className="flex items-center gap-2"><MapPin size={16} className="text-neutral-400"/> {app.address}, {app.city}</div>
                    <div className="flex items-center gap-2"><User size={16} className="text-neutral-400"/> {app.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

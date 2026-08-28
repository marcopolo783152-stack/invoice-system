import React, { useEffect, useState } from 'react';
import { subscribeToCollection, SHOWROOM_APPOINTMENTS, updateShowroomDoc, deleteShowroomDoc } from '@/lib/showroom-firebase';
import { Calendar, User, Clock, CheckCircle2, XCircle, Trash2, Plus } from 'lucide-react';
import AppointmentForm from './AppointmentForm';

export default function AppointmentsAdminTab() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateShowroomDoc(SHOWROOM_APPOINTMENTS, id, { status: newStatus });
  };
  
  const handleDelete = async (id: string) => {
    if(confirm('Are you sure you want to delete this appointment?')) {
      await deleteShowroomDoc(SHOWROOM_APPOINTMENTS, id);
    }
  };


  useEffect(() => {
    const unsub = subscribeToCollection(SHOWROOM_APPOINTMENTS, (data) => {
      // sort by created date descending
      setAppointments(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-xl font-serif text-neutral-900">Scheduled Appointments</h2>
            <div className="text-sm text-neutral-500">Total requests: {appointments.length}</div>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="bg-editorial-accent text-white px-4 py-2 text-sm uppercase font-bold tracking-wider flex items-center gap-2">
            <Plus size={16} /> {showAddForm ? 'Close Form' : 'Add Appointment'}
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-white p-6 border border-neutral-200 shadow-sm rounded-lg">
            <h3 className="font-serif text-lg mb-4">Book New Appointment</h3>
            <AppointmentForm />
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="py-12 text-center text-neutral-400 bg-stone-50 border border-neutral-100 rounded-lg">
          No appointments scheduled yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-white border border-neutral-200 p-5 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-4 border-b border-neutral-100 pb-3">
                <div className="font-bold text-neutral-800 text-lg flex items-center">
                  <User className="w-4 h-4 mr-2 text-editorial-accent" />
                  {appt.name}
                </div>
                <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-sm ${appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {appt.status || 'Pending'}
                </span>
              </div>
              
              <div className="space-y-3 text-sm text-neutral-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-3 text-neutral-400" />
                  {appt.date}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-3 text-neutral-400" />
                  {appt.time}
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-3 text-neutral-400" />
                  <span className="truncate">{appt.manager}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-1">
                <div className="text-xs font-bold uppercase text-neutral-400 tracking-wider">Contact</div>
                <div className="text-sm">{appt.email}</div>
                <div className="text-sm">{appt.phone}</div>
              </div>

              {appt.notes && (
                <div className="mt-4 p-3 bg-stone-50 rounded text-sm text-neutral-700 italic border border-stone-200">
                  "{appt.notes}"
                </div>
              )}
              
              <div className="mt-5 flex gap-2">
                {appt.status !== 'confirmed' && (
                    <button onClick={() => handleStatusChange(appt.id, 'confirmed')} className="flex-1 bg-emerald-600 text-white py-2 text-xs uppercase font-bold tracking-wider rounded-sm hover:bg-emerald-700 flex items-center justify-center gap-1">
                        <CheckCircle2 size={14} /> Accept
                    </button>
                )}
                {appt.status !== 'rejected' && (
                    <button onClick={() => handleStatusChange(appt.id, 'rejected')} className="flex-1 bg-neutral-200 text-neutral-700 py-2 text-xs uppercase font-bold tracking-wider rounded-sm hover:bg-neutral-300 flex items-center justify-center gap-1">
                        <XCircle size={14} /> Reject
                    </button>
                )}
                <button onClick={() => handleDelete(appt.id)} className="px-3 bg-red-100 text-red-600 py-2 text-xs uppercase font-bold tracking-wider rounded-sm hover:bg-red-200 flex items-center justify-center gap-1">
                    <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

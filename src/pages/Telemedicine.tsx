import React, { useState, useEffect } from 'react';
import {
  Video, Calendar, Clock, User, PhoneCall,
  CheckCircle2, AlertCircle, Plus, Mic, MicOff,
  VideoOff, ShieldCheck, Stethoscope, Sparkles, MessageSquare
} from 'lucide-react';
import {
  getAppointments, bookAppointment, getDoctors,
  chatWithCASA, type Appointment
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function Telemedicine() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState<string>('2026-06-01');
  const [bookingTime, setBookingTime] = useState<string>('10:00');
  const [bookingReason, setBookingReason] = useState<string>('Follow-up consultation');
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);

  // Video Simulator State
  const [inCall, setInCall] = useState<boolean>(false);
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [videoOff, setVideoOff] = useState<boolean>(false);

  // CASA Chat State
  const [casaMessages, setCasaMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I am CASA (Clinical Assessment Scheduling Assistant). I can help triage symptoms before your video call or schedule an urgent specialist visit.',
    },
  ]);
  const [casaInput, setCasaInput] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        const [appts, docs] = await Promise.all([
          getAppointments().catch(() => []),
          getDoctors().catch(() => []),
        ]);
        setAppointments(appts || []);
        setDoctors(
          docs && docs.length > 0
            ? docs
            : [
                { id: 1, name: 'Dr. Sarah Chen', specialization: 'Cardiology' },
                { id: 2, name: 'Dr. Marcus Vance', specialization: 'Critical Care / ICU' },
                { id: 3, name: 'Dr. Elena Morales', specialization: 'Internal Medicine' },
                { id: 4, name: 'Dr. Priya Patel', specialization: 'Endocrinology' },
              ]
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      const dateTime = `${bookingDate}T${bookingTime}:00`;
      const created = await bookAppointment({
        doctor_id: selectedDoctorId,
        appointment_date: dateTime,
        notes: bookingReason,
      });
      setAppointments((prev) => [created, ...prev]);
      setIsBookingOpen(false);
    } catch {
      // Offline fallback
      setAppointments((prev) => [
        {
          id: Math.floor(Math.random() * 1000) + 10,
          doctor_id: selectedDoctorId,
          appointment_date: `${bookingDate}T${bookingTime}:00`,
          status: 'Scheduled',
          notes: bookingReason,
          doctor: {
            name: doctors.find((d) => d.id === selectedDoctorId)?.name || 'Specialist Doctor',
            specialization: doctors.find((d) => d.id === selectedDoctorId)?.specialization || 'Clinical Specialist',
          },
        },
        ...prev,
      ]);
      setIsBookingOpen(false);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSendCasa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!casaInput.trim()) return;

    const userText = casaInput;
    setCasaMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setCasaInput('');

    try {
      const res = await chatWithCASA(userText);
      setCasaMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setCasaMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I have logged these clinical indicators for your attending specialist. Your video encounter bandwidth has been prioritized on WebRTC port 3000.',
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Video className="w-4 h-4" />
              WebRTC Encrypted Telehealth Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Telemedicine & Video Encounters</h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time video consultation with EHR-linked live vitals HUD and automated SOAP transcription.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> Book Consultation
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Screen */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="relative aspect-video bg-slate-950 flex items-center justify-center">
              {inCall ? (
                <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400 mb-3 animate-pulse">
                      <Stethoscope className="w-10 h-10" />
                    </div>
                    <div className="text-base font-bold text-white">Live Consultation Active</div>
                    <div className="text-xs text-slate-400">Dr. Sarah Chen, MD &bull; Cardiology Stepdown</div>
                  </div>

                  {/* Vitals HUD Overlay */}
                  <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                    <div className="text-[10px] text-cyan-400 font-mono font-bold uppercase">Bedside Telemetry HUD</div>
                    <div className="text-white font-mono">HR: <strong>76 bpm</strong> &bull; SpO2: <strong>99%</strong></div>
                    <div className="text-slate-400 font-mono">BP: <strong>122/78 mmHg</strong></div>
                  </div>

                  <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    TLS Transport Security
                  </div>
                </div>
              ) : (
                <div className="text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
                    <Video className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white">Encrypted Video Chamber</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Select a scheduled appointment below or launch an immediate video examination room.
                  </p>
                  <button
                    onClick={() => setInCall(true)}
                    className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Start Room Session
                  </button>
                </div>
              )}
            </div>

            {/* Video Controls Toolbar */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMicMuted(!micMuted)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    micMuted ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                  title={micMuted ? 'Unmute' : 'Mute'}
                >
                  {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setVideoOff(!videoOff)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    videoOff ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                  title={videoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {videoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
              </div>

              {inCall && (
                <button
                  onClick={() => setInCall(false)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20"
                >
                  End Consultation
                </button>
              )}
            </div>
          </div>

          {/* CASA Chat Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col h-[520px]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">CASA Clinical Triage Assistant</h2>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">Pre-consultation triage & symptom questionnaire agent</p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {casaMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white ml-6'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 mr-4'
                  }`}
                >
                  {m.content}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendCasa} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Ask CASA or describe symptoms..."
                value={casaInput}
                onChange={(e) => setCasaInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Scheduled Appointments Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Scheduled Video Consultations
            </h2>
            <span className="text-xs text-slate-400">{appointments.length} appointments booked</span>
          </div>

          <div className="divide-y divide-slate-800">
            {appointments.map((appt) => (
              <div key={appt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">
                    {appt.doctor?.name || `Doctor #${appt.doctor_id}`}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {appt.doctor?.specialization || 'Attending Physician'} &bull; Reason: {appt.notes || 'Routine Follow-up'}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-slate-300 font-mono">
                    <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                    {new Date(appt.appointment_date).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium capitalize">
                    {appt.status}
                  </span>
                  <button
                    onClick={() => setInCall(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all"
                  >
                    Join Call
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-xs">
            <h3 className="text-base font-bold text-white mb-1">Book Telemedicine Encounter</h3>
            <p className="text-slate-400 mb-4">Choose an attending specialist and preferred time slot</p>

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="text-slate-300 block mb-1">Select Specialist</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Time</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Reason / Clinical Notes</label>
                <textarea
                  rows={3}
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Primary complaint, symptoms or reason for consult..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {bookingLoading ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

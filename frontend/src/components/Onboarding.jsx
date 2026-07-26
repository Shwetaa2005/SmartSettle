import React, { useState } from 'react';
import { PlusCircle, LogIn, Users } from 'lucide-react';

export default function Onboarding({ onCreateTrip, onJoinTrip }) {
  const [isCreating, setIsCreating] = useState(true);
  const [tripId, setTripId] = useState('');
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [upiId, setUpiId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isCreating) {
      // Auto-generate trip code if empty
      const generatedId = tripId.trim().toUpperCase() || `TRIP-${Math.floor(1000 + Math.random() * 9000)}`;
      onCreateTrip({ tripId: generatedId, title, hostName: name, hostUpiId: upiId });
    } else {
      onJoinTrip({ tripId: tripId.trim().toUpperCase(), name, upiId });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-1">
            <Users size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">SmartSettle Engine</h1>
          <p className="text-sm text-slate-500">Real-time collaborative group expense optimization</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-sm font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className={`py-2 rounded-xl transition-all ${isCreating ? 'bg-white text-indigo-600 shadow-sm' : ''}`}
          >
            Create Trip
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className={`py-2 rounded-xl transition-all ${!isCreating ? 'bg-white text-indigo-600 shadow-sm' : ''}`}
          >
            Join Trip
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isCreating && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trip Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Goa Beach Trip"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trip ID Code</label>
            <input
              type="text"
              placeholder={isCreating ? 'e.g., GOA-2026 (Optional)' : 'e.g., GOA-2026'}
              required={!isCreating}
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Amit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              UPI ID <span className="text-slate-400 font-normal">(Optional for Cash)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., name@okaxis"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            {isCreating ? <PlusCircle size={20} /> : <LogIn size={20} />}
            <span>{isCreating ? 'Start New Trip' : 'Join Trip Room'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
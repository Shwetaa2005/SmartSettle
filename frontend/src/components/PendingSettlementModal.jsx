// src/components/PendingSettlementModal.jsx
import React from 'react';

export function PendingSettlementModal({ trip, currentUser, confirmSettlement, rejectSettlement }) {
  if (!trip?.settlementRequests || !currentUser) return null;

  // Filter requests sent TO the logged-in user awaiting confirmation
  const pendingRequests = trip.settlementRequests.filter(
    (req) => req.to?.trim().toLowerCase() === currentUser?.trim().toLowerCase() && req.status === 'awaiting_confirmation'
  );

  if (pendingRequests.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {pendingRequests.map((req) => (
        <div key={req.settlementId} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 animate-slide-up">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">💸</span>
            <div>
              <h3 className="text-lg font-black text-slate-900">Payment Confirmation</h3>
              <p className="text-xs text-slate-400">Please confirm if you received this settlement</p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount Sent</p>
            <p className="text-3xl font-black text-emerald-600 my-1">₹{parseFloat(req.amount).toFixed(2)}</p>
            <p className="text-xs text-slate-600">
              From: <strong className="text-slate-800">{req.from}</strong> ➔ To: <strong className="text-indigo-600">{currentUser}</strong>
            </p>
          </div>

          <div className="flex space-x-3 pt-2">
            <button 
              onClick={() => confirmSettlement(req.settlementId)} 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-xs"
            >
              Confirm Received
            </button>
            <button 
              onClick={() => rejectSettlement(req.settlementId)} 
              className="flex-1 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 font-bold py-3 px-4 rounded-xl border border-rose-200 transition-all text-xs"
            >
              Not Received / Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
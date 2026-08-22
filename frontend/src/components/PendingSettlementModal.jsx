// src/components/PendingSettlementModal.jsx
import React from 'react';

export function PendingSettlementModal({ trip, currentUser, confirmSettlement, rejectSettlement }) {
  if (!trip?.settlementRequests || !currentUser) return null;

  // Filter requests sent TO the logged-in user awaiting confirmation
  const pendingRequests = trip.settlementRequests.filter(
    (req) => req.to === currentUser && req.status === 'awaiting_confirmation'
  );

  if (pendingRequests.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {pendingRequests.map((req) => (
        <div key={req.settlementId} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">💸</span>
            <h3 className="text-lg font-bold text-gray-900">Payment Confirmation Requested</h3>
          </div>
          
          <p className="text-gray-600 text-sm leading-relaxed">
            <strong className="text-gray-900">{req.from}</strong> claims they marked <span className="font-bold text-green-600">${req.amount}</span> as paid to you.
          </p>

          <div className="flex space-x-3 pt-2">
            <button 
              onClick={() => confirmSettlement(req.settlementId)} 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Confirm Received
            </button>
            <button 
              onClick={() => rejectSettlement(req.settlementId)} 
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
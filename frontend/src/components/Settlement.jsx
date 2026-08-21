import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, CheckCircle, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function Settlement({ 
  trip = { title: 'Trip', participants: [] }, 
  settlements = [], 
  currentUser = '', 
  onBack,
  onMarkPaid,
  onConfirmSettlement,
  onRejectSettlement
}) {
  const [pendingHandshakes, setPendingHandshakes] = useState({});
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Helper to build native UPI deep link
  const generateUPILink = (payeeUpi, payeeName, amount) => {
    const cleanAmount = parseFloat(amount || 0).toFixed(2);
    const encodedName = encodeURIComponent(payeeName || '');
    const note = encodeURIComponent(`SmartSettle - ${trip?.title || 'Trip'}`);
    return `upi://pay?pa=${payeeUpi}&pn=${encodedName}&am=${cleanAmount}&cu=INR&tn=${note}`;
  };

  const handleMarkPaid = async (key, item) => {
    setPendingHandshakes((prev) => ({ ...prev, [key]: 'awaiting_confirmation' }));
    if (onMarkPaid) {
      try {
        await onMarkPaid(item);
      } catch (error) {
        console.error('Failed to mark transaction as paid:', error);
      }
    }
  };

  const handleConfirmReceived = async (key, item) => {
    setPendingHandshakes((prev) => ({ ...prev, [key]: 'settled' }));
    if (onConfirmSettlement) {
      try {
        await onConfirmSettlement(item);
      } catch (error) {
        console.error('Failed to confirm settlement:', error);
      }
    }
  };

  const handleReject = async (key, item) => {
    setPendingHandshakes((prev) => ({ ...prev, [key]: 'unpaid' }));
    if (onRejectSettlement) {
      try {
        await onRejectSettlement(item);
      } catch (error) {
        console.error('Failed to reject settlement:', error);
      }
    }
  };

  // Filter settlements specific to the logged-in user
  const myDebts = settlements.filter((s) => s.from === currentUser);
  const myReceivables = settlements.filter((s) => s.to === currentUser);

  // Calculate Net Personal Balance
  const totalOwed = myDebts.reduce((sum, item) => sum + item.amount, 0);
  const totalReceivable = myReceivables.reduce((sum, item) => sum + item.amount, 0);
  const netBalance = totalReceivable - totalOwed;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
          <h1 className="text-base font-black text-slate-800">Settlement Hub</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Personal Balance Card */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Net Position</span>
            <span className="text-xs font-mono bg-slate-800 text-indigo-300 px-2.5 py-1 rounded-lg">
              User: {currentUser}
            </span>
          </div>

          <div>
            {netBalance > 0 ? (
              <h2 className="text-3xl font-black text-emerald-400">+₹{netBalance.toFixed(2)}</h2>
            ) : netBalance < 0 ? (
              <h2 className="text-3xl font-black text-rose-400">-₹{Math.abs(netBalance).toFixed(2)}</h2>
            ) : (
              <h2 className="text-3xl font-black text-slate-200">₹0.00</h2>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {netBalance > 0
                ? 'You are owed money overall.'
                : netBalance < 0
                ? 'You owe money to group members.'
                : 'You are completely even!'}
            </p>
          </div>
        </div>

        {/* Action Needed: Money You Owe */}
        {myDebts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center space-x-1">
              <ArrowUpRight size={14} className="text-rose-500" />
              <span>Payments You Need to Make</span>
            </h3>

            {myDebts.map((item, idx) => {
              const key = `${item.from}-${item.to}-${item.amount}`;
              const currentStatus = item.status || pendingHandshakes[key] || 'unpaid';
              const payeeInfo = trip.participants?.find((p) => p.name === item.to);
              const upiId = payeeInfo?.upiId;

              return (
                <div key={idx} className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold">Pay To</p>
                      <p className="text-sm font-black text-slate-800">{item.to}</p>
                    </div>
                    <span className="text-xl font-black text-rose-600">₹{item.amount.toFixed(2)}</span>
                  </div>

                  {currentStatus === 'unpaid' && (
                    <div className="space-y-2 pt-1">
                      {upiId ? (
                        <a
                          href={generateUPILink(upiId, item.to, item.amount)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all"
                        >
                          <ExternalLink size={14} />
                          <span>Pay via UPI ({upiId})</span>
                        </a>
                      ) : (
                        <p className="text-xs text-amber-600 font-medium">💵 Cash payment required (No UPI ID registered)</p>
                      )}

                      <button
                        onClick={() => handleMarkPaid(key, item)}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                      >
                        Mark as Paid / Sent
                      </button>
                    </div>
                  )}

                  {currentStatus === 'awaiting_confirmation' && (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center space-x-1.5">
                      <Clock size={14} className="animate-spin" />
                      <span>Awaiting {item.to}'s confirmation</span>
                    </div>
                  )}

                  {currentStatus === 'settled' && (
                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-700 text-xs font-bold flex items-center justify-center space-x-1">
                      <CheckCircle size={14} />
                      <span>Payment Settled</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Action Needed: Money Owed to You */}
        {myReceivables.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center space-x-1">
              <ArrowDownLeft size={14} className="text-emerald-500" />
              <span>Payments Coming to You</span>
            </h3>

            {myReceivables.map((item, idx) => {
              const key = `${item.from}-${item.to}-${item.amount}`;
              const currentStatus = item.status || pendingHandshakes[key] || 'unpaid';

              return (
                <div key={idx} className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold">Owed By</p>
                      <p className="text-sm font-black text-slate-800">{item.from}</p>
                    </div>
                    <span className="text-xl font-black text-emerald-600">₹{item.amount.toFixed(2)}</span>
                  </div>

                  {currentStatus === 'unpaid' && (
                    <p className="text-xs text-slate-400 italic">
                      Waiting for {item.from} to send payment.
                    </p>
                  )}

                  {currentStatus === 'awaiting_confirmation' && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
                      <p className="text-xs font-bold text-amber-800">
                        🔔 {item.from} marked this payment as paid. Please verify your UPI/cash.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleConfirmReceived(key, item)}
                          className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all"
                        >
                          Confirm Received
                        </button>
                        <button
                          onClick={() => handleReject(key, item)}
                          className="py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-lg transition-all"
                        >
                          Reject / Not Received
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStatus === 'settled' && (
                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-700 text-xs font-bold flex items-center justify-center space-x-1">
                      <CheckCircle size={14} />
                      <span>Payment Settled</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* All Group Balances Toggle */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={() => setShowAllTransactions(!showAllTransactions)}
            className="w-full text-center text-xs font-bold text-indigo-600 hover:underline"
          >
            {showAllTransactions ? 'Hide full group ledger' : 'View full group ledger'}
          </button>

          {showAllTransactions && (
            <div className="mt-3 space-y-2">
              {settlements.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <span className="font-semibold text-slate-700">{item.from} owes {item.to}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">₹{item.amount.toFixed(2)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.status === 'settled' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'awaiting_confirmation' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.status || 'unpaid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
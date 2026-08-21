import React, { useState } from 'react';
import { Wifi, WifiOff, Plus, Users, Receipt, Share2, RefreshCw } from 'lucide-react';
import ExpenseModal from './ExpenseModal';

export default function Dashboard({ 
  trip = { title: 'Untitled Trip', tripId: 'N/A', participants: [], expenses: [] }, 
  settlements = [], 
  isOnline = true, 
  isSyncing = false, 
  onAddExpense, 
  onNavigateToSettlement,
  onLeaveTrip,
  currentUser = ''
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Safe fallback handler for sharing trip code
  const handleShareTripCode = () => {
    const code = trip?.tripId || 'N/A';
    if (navigator.share) {
      navigator.share({
        title: `Join ${trip?.title || 'Trip'} on SmartSettle`,
        text: `Use this trip code to join: ${code}`,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      alert(`Trip code ${code} copied to clipboard!`);
    } else {
      alert(`Share Trip Code: ${code}`);
    }
  };

  const handleExpenseSubmit = (expenseData) => {
    if (onAddExpense) {
      onAddExpense(expenseData);
    }
    setIsModalOpen(false);
  };

  const participantsList = trip?.participants || [];
  const expensesList = trip?.expenses || [];

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* Network Connection Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center space-x-2 shadow-sm">
          <WifiOff size={16} />
          <span>OFFLINE MODE — Expenses will save locally and sync automatically when signal returns.</span>
        </div>
      )}

      {isSyncing && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center space-x-2 animate-pulse">
          <RefreshCw size={16} className="animate-spin" />
          <span>Syncing offline transactions with group ledger...</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-800">{trip?.title || 'Trip Dashboard'}</h1>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <p className="text-xs text-slate-400 font-mono">Code: <span className="font-bold text-indigo-600">{trip?.tripId || '---'}</span></p>
          </div>

          <button
            onClick={onLeaveTrip}
            className="text-xs text-slate-400 hover:text-rose-500 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
          >
            Exit Trip
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Participants Banner */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Users size={14} className="mr-1" /> Participants ({participantsList.length})
            </span>
            <button 
              onClick={handleShareTripCode}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-1"
            >
              <Share2 size={12} />
              <span>Invite</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {participantsList.map((p, idx) => (
              <span key={p.name || idx} className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100">
                {p.name} {p.upiId ? '⚡' : '💵'}
              </span>
            ))}
          </div>
        </div>

        {/* Expense Feed */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Recent Activity Feed</h2>

          {expensesList.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 space-y-2">
              <Receipt size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No expenses added yet</p>
              <p className="text-xs text-slate-400">Tap the "+ Log Expense" button below to add your first purchase.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expensesList.map((item, idx) => {
                const numericAmount = parseFloat(item.amount || 0);
                const splitCount = item.splitAmong?.length || participantsList.length || 1;

                return (
                  <div key={item.expenseId || item.id || idx} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">{item.description || 'Expense'}</p>
                      <p className="text-xs text-slate-500">
                        Paid by <span className="font-semibold text-slate-700">{item.paidBy || 'Unknown'}</span> • Split among {splitCount} people
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-600">₹{numericAmount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Fixed Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 z-40">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>Log Expense</span>
          </button>

          <button
            onClick={onNavigateToSettlement}
            className="py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-300 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            <span>Settle Up</span>
          </button>
        </div>
      </div>

      {/* Expense Modal */}
      {isModalOpen && (
        <ExpenseModal
          participants={participantsList}
          currentUser={currentUser || trip?.hostName || trip?.name || 'User'}
          onClose={() => setIsModalOpen(false)}
          onSubmitExpense={handleExpenseSubmit}
        />
      )}
    </div>
  );
}
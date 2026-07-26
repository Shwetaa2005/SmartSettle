import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function ExpenseModal({ participants, currentUser, onClose, onSubmitExpense }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser || (participants[0]?.name || ''));
  const [selectedParticipants, setSelectedParticipants] = useState(
    participants.map((p) => p.name)
  );

  const toggleParticipant = (name) => {
    if (selectedParticipants.includes(name)) {
      if (selectedParticipants.length > 1) {
        setSelectedParticipants(selectedParticipants.filter((n) => n !== name));
      }
    } else {
      setSelectedParticipants([...selectedParticipants, name]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0) {
      alert('Please enter a valid description and amount.');
      return;
    }

    const newExpense = {
      expenseId: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      description,
      amount: parseFloat(amount),
      paidBy,
      splitAmong: selectedParticipants,
      timestamp: new Date().toISOString(),
    };

    onSubmitExpense(newExpense);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5 animate-slide-up shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-800">Log Group Expense</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Dinner at Fishermans Wharf"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount (₹)</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold bg-white"
            >
              {participants.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Split Among</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {participants.map((p) => {
                const isSelected = selectedParticipants.includes(p.name);
                return (
                  <button
                    type="button"
                    key={p.name}
                    onClick={() => toggleParticipant(p.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>{p.name}</span>
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] mt-4"
          >
            Add Expense
          </button>
        </form>
      </div>
    </div>
  );
}
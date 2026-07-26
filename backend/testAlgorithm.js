import { calculateMinSettlements } from './utils/settlementEngine.js';

// Mock Trip Data
const mockParticipants = [
  { name: 'Amit', upiId: 'amit@okaxis' },
  { name: 'Priya', upiId: 'priya@upi' },
  { name: 'Rahul', upiId: null }, 
  { name: 'Sneha', upiId: 'sneha@ybl' },
];

const mockExpenses = [
  {
    expenseId: 'uuid-1',
    description: 'Goa Hotel Booking',
    amount: 4000,
    paidBy: 'Amit',
    splitAmong: ['Amit', 'Priya', 'Rahul', 'Sneha'], 
  },
  {
    expenseId: 'uuid-2',
    description: 'Beach Scuba Diving',
    amount: 3000,
    paidBy: 'Priya',
    splitAmong: ['Priya', 'Rahul', 'Sneha'], 
  },
  {
    expenseId: 'uuid-3',
    description: 'Roadside Cafe Tea & Snacks',
    amount: 400,
    paidBy: 'Rahul',
    splitAmong: ['Amit', 'Priya', 'Rahul', 'Sneha'],
  },
];

console.log('Running a algorithm test');
console.log('Calculating net balances and optimized transactions...\n');

const result = calculateMinSettlements(mockParticipants, mockExpenses);

console.log('OPTIMIZED SETTLEMENT TRANSACTIONS:');
console.table(result);
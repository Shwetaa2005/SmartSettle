import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    // High-precision client-side UUID generated on the phone
    // Critical for offline-first deduplication!
    expenseId: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: [true, 'Please provide an expense description'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide the total expense amount'],
      min: [0, 'Amount must be positive'],
    },
    // The user who paid for this item
    paidBy: {
      type: String, // Matches the user's name or userId in the trip
      required: true,
    },
    // Array of users included in this specific split
    splitAmong: [
      {
        type: String,
        required: true,
      }
    ],
    // High-precision timestamp logged when the user tapped "Submit" on their phone
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Inside backend/models/Expense.js
    isSettlement: {
    type: Boolean,
    default: false,
    }
  }
);

export default expenseSchema;
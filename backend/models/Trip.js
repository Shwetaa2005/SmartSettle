import mongoose from 'mongoose';
import expenseSchema from './Expense.js';

const participantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // UPI ID is optional! Allows nullable values for cash-only users.
  upiId: {
    type: String,
    default: null,
    trim: true,
  },
});

const settlementRequestSchema = new mongoose.Schema({
  settlementId: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['awaiting_confirmation', 'confirmed', 'rejected'], 
    default: 'awaiting_confirmation' 
  },
  createdAt: { type: Date, default: Date.now },
});

const tripSchema = new mongoose.Schema(
  {
    // trip code
    tripId: {
      type: String,
      required: true,
      unique: true,
      index: true, 
    },
    title: {
      type: String,
      required: [true, 'Please enter a trip title'],
      trim: true,
    },
    participants: [participantSchema],
    expenses: [expenseSchema],
    settlementRequests: [settlementRequestSchema],
    // State flag tracking whether the trip is actively running or finalized
    isSettled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt fields
  }
);

const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import tripRoutes from './routes/tripRoutes.js';
import Trip from './models/Trip.js';
import { calculateMinSettlements } from './utils/settlementEngine.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Dynamic allowed origins list
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL, // e.g. https://your-app.vercel.app
].filter(Boolean);

// 1. Express CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile native apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Fallback to allow for testing
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json());

// 2. Socket.io with explicit CORS Configuration
const io = new Server(server, {
  cors: {
    origin: '*', // Allows WebSocket connections from any frontend origin (Vercel/Localhost)
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Routes
app.use('/api/trips', tripRoutes);

// Server Health-Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'SmartSettle Engine Backend is fully operational!',
    timestamp: new Date().toISOString(),
  });
});

// Real-Time Socket.io Event Handlers
io.on('connection', (socket) => {
  console.log(`⚡ New WebSocket Client Connected: ${socket.id}`);

  // Event 1: User joins a specific trip room
  socket.on('join_trip', async ({ tripId, userName }) => {
    socket.join(tripId);
    console.log(`👤 User '${userName}' (${socket.id}) joined Room: [${tripId}]`);

    try {
      // Fetch fresh trip data to get the updated participants array
      const trip = await Trip.findOne({ tripId });
      if (trip) {
        // Broadcast updated participants to EVERYONE in the room (including the host)
        io.to(tripId).emit('participants_updated', {
          participants: trip.participants,
        });
      }
    } catch (err) {
      console.error('Error fetching participants on join:', err.message);
    }
  });

  // Event 2: Real-time Expense Logging & Offline Sync Push
  socket.on('add_expense', async ({ tripId, expense }) => {
    try {
      console.log(`💸 New expense received for Trip [${tripId}]:`, expense.description);

      const trip = await Trip.findOne({ tripId });
      if (!trip) {
        return socket.emit('error', { message: 'Trip not found' });
      }

      // Deduplication Check using client-side generated UUID (expenseId)
      const isDuplicate = trip.expenses.some((e) => e.expenseId === expense.expenseId);

      if (!isDuplicate) {
        trip.expenses.push(expense);
        await trip.save();
      }

      // Calculate newly updated settlements matrix
      const updatedSettlements = calculateMinSettlements(trip.participants, trip.expenses);

      // Broadcast updated trip state and settlement matrix to all clients in the room
      io.to(tripId).emit('expense_updated', {
        expense,
        allExpenses: trip.expenses,
        settlements: updatedSettlements,
      });
    } catch (err) {
      console.error('Error saving real-time expense:', err.message);
      socket.emit('error', { message: 'Failed to process expense' });
    }
  });

  // Event 3: Initiate Payment Handshake (Debtor -> Creditor)
  socket.on('initiate_settlement', async ({ tripId, settlementId, from, to, amount }) => {
    try {
      const trip = await Trip.findOne({ tripId });
      if (!trip) return socket.emit('error', { message: 'Trip not found' });

      // Remove existing pending request between these users if any
      trip.settlementRequests = trip.settlementRequests.filter(
        (s) => !(s.from === from && s.to === to && s.status === 'pending')
      );

      trip.settlementRequests.push({
        settlementId,
        from,
        to,
        amount,
        status: 'pending',
      });

      await trip.save();

      // Broadcast updated requests to everyone in the room
      io.to(tripId).emit('settlement_requests_updated', {
        settlementRequests: trip.settlementRequests,
      });
    } catch (err) {
      console.error('Error initiating settlement:', err.message);
      socket.emit('error', { message: 'Failed to initiate settlement' });
    }
  });

  // Event 4: Confirm Payment Handshake (Creditor Confirms)
  socket.on('confirm_settlement', async ({ tripId, settlementId }) => {
    try {
      const trip = await Trip.findOne({ tripId });
      if (!trip) return socket.emit('error', { message: 'Trip not found' });

      const reqIndex = trip.settlementRequests.findIndex((s) => s.settlementId === settlementId);
      if (reqIndex === -1) return socket.emit('error', { message: 'Settlement request not found' });

      const request = trip.settlementRequests[reqIndex];
      request.status = 'confirmed';

      // 🏆 Option A: Log an automated settlement expense
      const settlementExpense = {
        expenseId: `settle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        description: `Payment Settlement: ${request.from} ➔ ${request.to}`,
        amount: request.amount,
        paidBy: request.from,
        splitAmong: [request.to], // Fully credits request.to and debits request.from
        isSettlement: true,
        createdAt: new Date(),
      };

      trip.expenses.push(settlementExpense);
      await trip.save();

      // Recalculate minimum settlements matrix
      const updatedSettlements = calculateMinSettlements(trip.participants, trip.expenses);

      // Broadcast new state to all room clients
      io.to(tripId).emit('settlement_confirmed_sync', {
        settlementId,
        allExpenses: trip.expenses,
        settlements: updatedSettlements,
        settlementRequests: trip.settlementRequests,
      });
    } catch (err) {
      console.error('Error confirming settlement:', err.message);
      socket.emit('error', { message: 'Failed to confirm settlement' });
    }
  });

  // Event 5: Reject Payment Handshake (Creditor Rejects)
  socket.on('reject_settlement', async ({ tripId, settlementId }) => {
    try {
      const trip = await Trip.findOne({ tripId });
      if (!trip) return socket.emit('error', { message: 'Trip not found' });

      const reqIndex = trip.settlementRequests.findIndex((s) => s.settlementId === settlementId);
      if (reqIndex !== -1) {
        trip.settlementRequests[reqIndex].status = 'rejected';
        await trip.save();
      }

      io.to(tripId).emit('settlement_rejected_sync', {
        settlementId,
        rejectedRequest: trip.settlementRequests[reqIndex],
        settlementRequests: trip.settlementRequests,
      });
    } catch (err) {
      console.error('Error rejecting settlement:', err.message);
      socket.emit('error', { message: 'Failed to reject settlement' });
    }
  });

  // Event 3: Client Disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Client Disconnected: ${socket.id}`);
  });
});

// MongoDB Connection & Server Launch
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    server.listen(PORT, () => {
      console.log(`SmartSettle Engine Real-Time Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Connection Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();
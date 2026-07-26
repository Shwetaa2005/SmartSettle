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

// Initialize Socket.io with CORS configured for our upcoming frontend
const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// real time socket io event habdlers

io.on('connection', (socket) => {
  console.log(`⚡ New WebSocket Client Connected: ${socket.id}`);

  // Event 1: User joins a specific trip room
  socket.on('join_trip', ({ tripId, userName }) => {
    socket.join(tripId);
    console.log(`👤 User '${userName}' (${socket.id}) joined Room: [${tripId}]`);

    // Broadcast to others in the same room that a new user joined
    socket.to(tripId).emit('user_joined_room', {
      message: `${userName} has joined the trip live!`,
      userName,
    });
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

  // Event 3: Client Disconnect
  socket.on('disconnect', () => {
    console.log(`Client Disconnected: ${socket.id}`);
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
    console.error(` Connection Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();
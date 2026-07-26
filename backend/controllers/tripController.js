import Trip from '../models/Trip.js';
import { calculateMinSettlements } from '../utils/settlementEngine.js';

// @desc    Create a new trip
// @route   POST /api/trips
export const createTrip = async (req, res) => {
  try {
    const { tripId, title, hostName, hostUpiId } = req.body;

    if (!tripId || !title || !hostName) {
      return res.status(400).json({ error: 'Please provide tripId, title, and hostName' });
    }

    // Check if tripId already exists
    const existingTrip = await Trip.findOne({ tripId });
    if (existingTrip) {
      return res.status(400).json({ error: 'Trip ID already exists. Try another.' });
    }

    const newTrip = new Trip({
      tripId,
      title,
      participants: [{ name: hostName, upiId: hostUpiId || null }],
      expenses: [],
    });

    await newTrip.save();

    res.status(201).json({
      success: true,
      message: 'Trip created successfully!',
      trip: newTrip,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get trip details by tripId
// @route   GET /api/trips/:tripId
export const getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ tripId });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Calculate current optimized settlements on the fly
    const optimizedSettlements = calculateMinSettlements(trip.participants, trip.expenses);

    res.status(200).json({
      success: true,
      trip,
      optimizedSettlements,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Join an existing trip
// @route   POST /api/trips/:tripId/join
export const joinTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { name, upiId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required to join trip' });
    }

    const trip = await Trip.findOne({ tripId });
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if participant already exists by name
    const exists = trip.participants.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );

    if (!exists) {
      trip.participants.push({ name, upiId: upiId || null });
      await trip.save();
    }

    res.status(200).json({
      success: true,
      message: `${name} joined the trip!`,
      participants: trip.participants,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
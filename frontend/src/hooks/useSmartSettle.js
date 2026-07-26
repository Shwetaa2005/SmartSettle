import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  getOfflineQueue, 
  queueOfflineExpense, 
  clearOfflineQueue, 
  cacheTripLocally 
} from '../utils/offlineStorage';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export function useSmartSettle(initialTripData) {
  const [trip, setTrip] = useState(initialTripData);
  const [settlements, setSettlements] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const socketRef = useRef(null);

  // 1. Synchronize hook state whenever parent initialTripData changes (Fixes initial null issue)
  useEffect(() => {
    if (initialTripData) {
      setTrip(initialTripData);
    }
  }, [initialTripData]);

  // 2. Initialize Socket.io and Network Listeners
  useEffect(() => {
    if (!trip?.tripId) return;

    socketRef.current = io(BACKEND_URL);
    const socket = socketRef.current;

    // Join Socket Room
    socket.emit('join_trip', { 
      tripId: trip.tripId, 
      userName: trip.hostName || trip.name || 'User' 
    });

    // Listen for real-time expense updates broadcasted by server
    socket.on('expense_updated', ({ allExpenses, settlements: newSettlements }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, expenses: allExpenses };
        cacheTripLocally(updated);
        return updated;
      });
      if (newSettlements) setSettlements(newSettlements);
    });

    // Network Status Listeners
    const handleOnline = () => {
      console.log('📶 Back online! Initiating background sync...');
      setIsOnline(true);
      syncOfflineQueue(trip.tripId);
    };

    const handleOffline = () => {
      console.log('📡 Offline mode activated.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      syncOfflineQueue(trip.tripId);
    }

    return () => {
      socket.disconnect();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [trip?.tripId]);

  // 3. Sync Function: Empties localStorage queue to server
  const syncOfflineQueue = async (activeTripId) => {
    const queue = getOfflineQueue();
    if (!queue || queue.length === 0) return;

    setIsSyncing(true);

    for (const item of queue) {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('add_expense', {
          tripId: item.tripId || activeTripId,
          expense: item.expense,
        });
      }
    }

    clearOfflineQueue();
    setIsSyncing(false);
  };

  // 4. Add Expense Function (Optimistic Update + Socket/Offline routing)
  const addExpense = (expense) => {
    const targetTripId = trip?.tripId;
    if (!targetTripId) return;

    // Optimistically update local React UI immediately
    setTrip((prev) => {
      const updatedExpenses = [...(prev?.expenses || []), expense];
      const updatedTrip = { ...prev, expenses: updatedExpenses };
      cacheTripLocally(updatedTrip);
      return updatedTrip;
    });

    // Route to Socket or Offline Queue
    if (isOnline && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('add_expense', {
        tripId: targetTripId,
        expense,
      });
    } else {
      console.warn('Offline: Queuing expense locally.');
      queueOfflineExpense(targetTripId, expense);
    }
  };

  return {
    trip,
    settlements,
    isOnline,
    isSyncing,
    addExpense,
  };
}
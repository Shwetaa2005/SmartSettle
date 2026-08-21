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

  // 1. Synchronize hook state whenever parent initialTripData changes
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

    // 1. Listen for real-time expense updates
    socket.on('expense_updated', ({ allExpenses, settlements: newSettlements }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, expenses: allExpenses };
        cacheTripLocally(updated);
        return updated;
      });
      if (newSettlements) setSettlements(newSettlements);
    });

    // 2. Listen for participant list updates in real-time
    socket.on('participants_updated', ({ participants }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, participants };
        cacheTripLocally(updated);
        return updated;
      });
    });

    // 3. Listen for settlement handshake request updates
    socket.on('settlement_requests_updated', ({ settlementRequests }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, settlementRequests };
        cacheTripLocally(updated);
        return updated;
      });
    });

    // 4. Listen for confirmed payment settlement sync
    socket.on('settlement_confirmed_sync', ({ allExpenses, settlements: newSettlements, settlementRequests }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, expenses: allExpenses, settlementRequests };
        cacheTripLocally(updated);
        return updated;
      });
      if (newSettlements) setSettlements(newSettlements);
    });

    // 5. Listen for rejected settlement sync
    socket.on('settlement_rejected_sync', ({ settlementRequests }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, settlementRequests };
        cacheTripLocally(updated);
        return updated;
      });
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

    // Comprehensive Cleanup
    return () => {
      socket.off('expense_updated');
      socket.off('participants_updated');
      socket.off('settlement_requests_updated');
      socket.off('settlement_confirmed_sync');
      socket.off('settlement_rejected_sync');
      socket.disconnect();

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [trip?.tripId]);

  // 3. Handshake Trigger Functions (Placed safely outside useEffect)
  const initiateSettlement = (from, to, amount) => {
    if (!trip?.tripId || !socketRef.current) return;
    const settlementId = `req_${Date.now()}`;
    socketRef.current.emit('initiate_settlement', {
      tripId: trip.tripId,
      settlementId,
      from,
      to,
      amount,
    });
  };

  const confirmSettlement = (settlementId) => {
    if (!trip?.tripId || !socketRef.current) return;
    socketRef.current.emit('confirm_settlement', {
      tripId: trip.tripId,
      settlementId,
    });
  };

  const rejectSettlement = (settlementId) => {
    if (!trip?.tripId || !socketRef.current) return;
    socketRef.current.emit('reject_settlement', {
      tripId: trip.tripId,
      settlementId,
    });
  };

  // 4. Sync Function: Empties localStorage queue to server
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

  // 5. Add Expense Function
  const addExpense = (expense) => {
    const targetTripId = trip?.tripId;
    if (!targetTripId) return;

    setTrip((prev) => {
      const updatedExpenses = [...(prev?.expenses || []), expense];
      const updatedTrip = { ...prev, expenses: updatedExpenses };
      cacheTripLocally(updatedTrip);
      return updatedTrip;
    });

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
    initiateSettlement,
    confirmSettlement,
    rejectSettlement,
    isOnline,
    isSyncing,
    addExpense,
  };
}
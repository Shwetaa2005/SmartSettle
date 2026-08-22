import { useState, useEffect, useRef, useCallback } from 'react';
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

  // 1. Safe initial hydration (only runs when switching trips, prevents wiping real-time state)
  useEffect(() => {
    if (initialTripData?.tripId && (!trip?.tripId || trip.tripId !== initialTripData.tripId)) {
      setTrip(initialTripData);
    }
  }, [initialTripData, trip?.tripId]);

  // 2. Offline Queue Sync Handler
  const syncOfflineQueue = useCallback(async (activeTripId) => {
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
  }, []);

  // 3. Initialize Socket.io and Network Listeners
  useEffect(() => {
    if (!trip?.tripId) return;

    socketRef.current = io(BACKEND_URL);
    const socket = socketRef.current;

    // Join Socket Room
    socket.emit('join_trip', { 
      tripId: trip.tripId, 
      userName: trip.hostName || trip.name || 'User' 
    });

    // --- Socket Listeners ---
    socket.on('expense_updated', ({ allExpenses, settlements: newSettlements }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, expenses: allExpenses };
        cacheTripLocally(updated);
        return updated;
      });
      if (newSettlements) setSettlements(newSettlements);
    });

    socket.on('participants_updated', ({ participants }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, participants };
        cacheTripLocally(updated);
        return updated;
      });
    });

    socket.on('settlement_requests_updated', ({ settlementRequests }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, settlementRequests };
        cacheTripLocally(updated);
        return updated;
      });
    });

    socket.on('settlement_confirmed_sync', ({ allExpenses, settlements: newSettlements, settlementRequests }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, expenses: allExpenses, settlementRequests };
        cacheTripLocally(updated);
        return updated;
      });
      if (newSettlements) setSettlements(newSettlements);
    });

    socket.on('settlement_rejected_sync', ({ settlementRequests }) => {
      setTrip((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, settlementRequests };
        cacheTripLocally(updated);
        return updated;
      });
    });

    // Network Status Handlers
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

    // Cleanup
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
  }, [trip?.tripId, syncOfflineQueue]);

  // 4. Handshake Action Functions
  const initiateSettlement = (from, to, amount) => {
    if (!trip?.tripId) return;
    const settlementId = `req_${Date.now()}`;
    const payload = { 
      tripId: trip.tripId, 
      settlementId, 
      from, 
      to, 
      amount, 
      status: 'awaiting_confirmation' 
    };

    // Optimistic UI update
    setTrip((prev) => {
      if (!prev) return prev;
      const currentRequests = prev.settlementRequests || [];
      const updated = { ...prev, settlementRequests: [...currentRequests, payload] };
      cacheTripLocally(updated);
      return updated;
    });

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('initiate_settlement', payload);
    }
  };

  const confirmSettlement = (settlementId) => {
    if (!trip?.tripId) return;

    // Optimistic status update
    setTrip((prev) => {
      if (!prev) return prev;
      const updatedRequests = (prev.settlementRequests || []).map((req) =>
        req.settlementId === settlementId ? { ...req, status: 'confirmed' } : req
      );
      const updated = { ...prev, settlementRequests: updatedRequests };
      cacheTripLocally(updated);
      return updated;
    });

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('confirm_settlement', {
        tripId: trip.tripId,
        settlementId,
      });
    }
  };

  const rejectSettlement = (settlementId) => {
    if (!trip?.tripId) return;

    // Optimistic status update
    setTrip((prev) => {
      if (!prev) return prev;
      const updatedRequests = (prev.settlementRequests || []).map((req) =>
        req.settlementId === settlementId ? { ...req, status: 'rejected' } : req
      );
      const updated = { ...prev, settlementRequests: updatedRequests };
      cacheTripLocally(updated);
      return updated;
    });

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('reject_settlement', {
        tripId: trip.tripId,
        settlementId,
      });
    }
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
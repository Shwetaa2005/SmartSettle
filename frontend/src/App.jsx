import React, { useState } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Settlement from './components/Settlement';
import { useSmartSettle } from './hooks/useSmartSettle';

// Dynamic API URL: Uses VITE_BACKEND_URL when deployed, falls back to localhost for dev
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

function App() {
  const [initialTrip, setInitialTrip] = useState(null);
  const [currentView, setCurrentView] = useState('onboarding'); // 'onboarding' | 'dashboard' | 'settlement'

  const { trip, settlements, isOnline, isSyncing, addExpense } = useSmartSettle(initialTrip);

  const handleCreateTrip = async (tripData) => {
    try {
      const response = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData),
      });
      const data = await response.json();
      
      if (data.success && data.trip) {
        const safeTrip = {
          ...data.trip,
          hostName: tripData.hostName,
          participants: data.trip.participants || [],
          expenses: data.trip.expenses || []
        };
        setInitialTrip(safeTrip);
        setCurrentView('dashboard');
      } else {
        alert(data.error || 'Failed to create trip');
      }
    } catch (err) {
      console.error('Create Trip Error:', err);
      alert('Backend connection error. Please check your backend server status.');
    }
  };

  const handleJoinTrip = async ({ tripId, name, upiId }) => {
    try {
      const response = await fetch(`${API_URL}/api/trips/${tripId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, upiId }),
      });
      const data = await response.json();
      
      if (data.success) {
        const tripRes = await fetch(`${API_URL}/api/trips/${tripId}`);
        const tripData = await tripRes.json();
        
        if (tripData.success && tripData.trip) {
          const safeTrip = {
            ...tripData.trip,
            name,
            participants: tripData.trip.participants || [],
            expenses: tripData.trip.expenses || []
          };
          setInitialTrip(safeTrip);
          setCurrentView('dashboard');
        }
      } else {
        alert(data.error || 'Trip not found');
      }
    } catch (err) {
      console.error('Join Trip Error:', err);
      alert('Backend connection error.');
    }
  };

  const activeTrip = trip || initialTrip;

  return (
    <div className="min-h-screen bg-slate-50">
      {currentView === 'onboarding' && (
        <Onboarding onCreateTrip={handleCreateTrip} onJoinTrip={handleJoinTrip} />
      )}

      {currentView === 'dashboard' && activeTrip && (
        <Dashboard
          trip={activeTrip}
          settlements={settlements}
          isOnline={isOnline}
          isSyncing={isSyncing}
          onAddExpense={addExpense}
          onNavigateToSettlement={() => setCurrentView('settlement')}
          onLeaveTrip={() => {
            setInitialTrip(null);
            setCurrentView('onboarding');
          }}
        />
      )}

      {currentView === 'settlement' && activeTrip && (
        <Settlement
          trip={activeTrip}
          settlements={settlements}
          currentUser={activeTrip.hostName || activeTrip.name}
          onBack={() => setCurrentView('dashboard')}
        />
      )}
    </div>
  );
}

export default App;
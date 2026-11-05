const QUEUE_KEY = 'smartsettle_offline_queue';
const TRIP_CACHE_KEY = 'smartsettle_trip_cache';

// Clear any legacy localStorage entry from older versions to prevent leakage
try {
  localStorage.removeItem(TRIP_CACHE_KEY);
  localStorage.removeItem(QUEUE_KEY);
} catch (e) {}

/**
 * Get all queued offline expenses
 */
export const getOfflineQueue = () => {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading offline queue from sessionStorage:', err);
    return [];
  }
};

/**
 * Save an expense into the local offline sync queue
 */
export const queueOfflineExpense = (tripId, expense) => {
  try {
    const queue = getOfflineQueue();
    const newItem = { tripId, expense, queuedAt: new Date().toISOString() };
    queue.push(newItem);
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return queue;
  } catch (err) {
    console.error('Error queuing offline expense:', err);
    return [];
  }
};

/**
 * Clear the queue after successful server sync
 */
export const clearOfflineQueue = () => {
  sessionStorage.removeItem(QUEUE_KEY);
};

/**
 * Cache current active trip in session for instant offline loading and tab isolation
 */
export const cacheTripLocally = (tripData) => {
  try {
    sessionStorage.setItem(TRIP_CACHE_KEY, JSON.stringify(tripData));
  } catch (err) {
    console.error('Error caching trip in sessionStorage:', err);
  }
};

/**
 * Retrieve cached trip from session
 */
export const getCachedTrip = () => {
  try {
    const raw = sessionStorage.getItem(TRIP_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

/**
 * Clear cached trip from session (e.g. when exiting trip)
 */
export const clearCachedTrip = () => {
  try {
    sessionStorage.removeItem(TRIP_CACHE_KEY);
    // Also clean up any legacy localStorage entry
    localStorage.removeItem(TRIP_CACHE_KEY);
  } catch (err) {
    console.error('Error clearing trip session cache:', err);
  }
};
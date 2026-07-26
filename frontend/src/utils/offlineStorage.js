const QUEUE_KEY = 'smartsettle_offline_queue';
const TRIP_CACHE_KEY = 'smartsettle_trip_cache';

/**
 * Get all queued offline expenses
 */
export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading offline queue from localStorage:', err);
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
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
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
  localStorage.removeItem(QUEUE_KEY);
};

/**
 * Cache current active trip locally for instant offline loading
 */
export const cacheTripLocally = (tripData) => {
  try {
    localStorage.setItem(TRIP_CACHE_KEY, JSON.stringify(tripData));
  } catch (err) {
    console.error('Error caching trip locally:', err);
  }
};

/**
 * Retrieve cached trip when offline
 */
export const getCachedTrip = () => {
  try {
    const raw = localStorage.getItem(TRIP_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};
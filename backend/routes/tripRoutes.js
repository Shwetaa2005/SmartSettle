import express from 'express';
import { createTrip, getTripById, joinTrip } from '../controllers/tripController.js';

const router = express.Router();

router.post('/', createTrip);
router.get('/:tripId', getTripById);
router.post('/:tripId/join', joinTrip);

export default router;
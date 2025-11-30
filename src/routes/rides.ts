import { Router, Request, Response } from 'express';
import { dispatcherService } from '../services/dispatcher.service';
import {
  CreateRideRequest,
  CreateRideResponse,
  GetRideResponse,
  UpdateRideStatusRequest,
  UpdateRideStatusResponse,
  CancelRideRequest,
  CancelRideResponse,
  ErrorResponse,
} from '../types';

const router = Router();

/**
 * POST /api/rides
 * Create a new ride request
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: CreateRideRequest = req.body;

    // Validate request
    if (!request.customerDID || !request.pickup || !request.dropoff || !request.bookingType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerDID, pickup, dropoff, bookingType',
      } as ErrorResponse);
    }

    if (!request.pickup.latitude || !request.pickup.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Pickup location must include latitude and longitude',
      } as ErrorResponse);
    }

    if (!request.dropoff.latitude || !request.dropoff.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Dropoff location must include latitude and longitude',
      } as ErrorResponse);
    }

    // Create ride
    const ride = await dispatcherService.createRide(request);

    console.log(`Created ride ${ride.id} for customer ${request.customerDID}`);

    res.status(201).json({
      success: true,
      ride,
    } as CreateRideResponse);
  } catch (error) {
    console.error('Error creating ride:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ride',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * GET /api/rides/:rideId
 * Get ride details
 */
router.get('/:rideId', async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;

    const ride = await dispatcherService.getRideById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      } as ErrorResponse);
    }

    res.json({
      success: true,
      ride,
    } as GetRideResponse);
  } catch (error) {
    console.error('Error getting ride:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ride',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * PUT /api/rides/:rideId/status
 * Update ride status
 */
router.put('/:rideId/status', async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;
    const { status, notes }: UpdateRideStatusRequest = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: status',
      } as ErrorResponse);
    }

    const validStatuses = ['pending', 'offered', 'accepted', 'driver_arrived', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      } as ErrorResponse);
    }

    // Get current ride to determine who is updating
    const currentRide = await dispatcherService.getRideById(rideId);
    if (!currentRide) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      } as ErrorResponse);
    }

    // For simplicity, use driver or rider DID as updatedBy
    const updatedBy = currentRide.driverDid || currentRide.riderDid;

    const ride = await dispatcherService.updateRideStatus(rideId, status, updatedBy, notes);

    console.log(`Updated ride ${rideId} status to ${status}`);

    res.json({
      success: true,
      ride,
    } as UpdateRideStatusResponse);
  } catch (error) {
    console.error('Error updating ride status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ride status',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * DELETE /api/rides/:rideId
 * Cancel ride
 */
router.delete('/:rideId', async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;
    const { reason }: CancelRideRequest = req.body;

    const currentRide = await dispatcherService.getRideById(rideId);
    if (!currentRide) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      } as ErrorResponse);
    }

    const updatedBy = currentRide.driverDid || currentRide.riderDid;
    const ride = await dispatcherService.updateRideStatus(
      rideId,
      'cancelled',
      updatedBy,
      reason || 'Cancelled by user'
    );

    console.log(`Cancelled ride ${rideId}: ${reason || 'No reason provided'}`);

    res.json({
      success: true,
      ride,
    } as CancelRideResponse);
  } catch (error) {
    console.error('Error cancelling ride:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel ride',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

export default router;

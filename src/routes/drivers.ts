import { Router, Request, Response } from 'express';
import { dispatcherService } from '../services/dispatcher.service';
import {
  DriverAvailableRequest,
  DriverAvailableResponse,
  DriverOfferRequest,
  DriverOfferResponse,
  DriverAcceptRequest,
  DriverAcceptResponse,
  DriverActiveRidesResponse,
  ErrorResponse,
} from '../types';

const router = Router();

/**
 * POST /api/driver/available
 * Update driver availability and location
 */
router.post('/available', async (req: Request, res: Response) => {
  try {
    const request: DriverAvailableRequest = req.body;

    // Validate request
    if (!request.driverDID || !request.currentLocation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: driverDID, currentLocation',
      } as ErrorResponse);
    }

    // Check for undefined/null, not falsy (0 is a valid coordinate)
    if (request.currentLocation.latitude === undefined || request.currentLocation.latitude === null ||
        request.currentLocation.longitude === undefined || request.currentLocation.longitude === null) {
      return res.status(400).json({
        success: false,
        error: 'Current location must include latitude and longitude',
      } as ErrorResponse);
    }

    await dispatcherService.updateDriverAvailability(request);

    console.log(`Updated driver ${request.driverDID} availability: ${request.isAvailable}`);

    res.json({
      success: true,
      message: 'Driver availability updated successfully',
    } as DriverAvailableResponse);
  } catch (error) {
    console.error('Error updating driver availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update driver availability',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * POST /api/driver/offer
 * Driver offers to take a ride (not used in current flow, but available)
 */
router.post('/offer', async (req: Request, res: Response) => {
  try {
    const request: DriverOfferRequest = req.body;

    if (!request.rideId || !request.driverDid) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: rideId, driverDid',
      } as ErrorResponse);
    }

    // Get ride details
    const ride = await dispatcherService.getRideById(request.rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found',
      } as ErrorResponse);
    }

    if (ride.status !== 'pending' && ride.status !== 'offered') {
      return res.status(400).json({
        success: false,
        error: 'Ride is not available for offers',
      } as ErrorResponse);
    }

    console.log(`Driver ${request.driverDid} offered for ride ${request.rideId}`);

    res.json({
      success: true,
      ride,
    } as DriverOfferResponse);
  } catch (error) {
    console.error('Error processing driver offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process driver offer',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * POST /api/driver/accept
 * Driver accepts a ride
 */
router.post('/accept', async (req: Request, res: Response) => {
  try {
    const request: DriverAcceptRequest = req.body;

    if (!request.rideId || !request.driverDid) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: rideId, driverDid',
      } as ErrorResponse);
    }

    const ride = await dispatcherService.assignDriverToRide(request.rideId, request.driverDid);

    console.log(`Driver ${request.driverDid} accepted ride ${request.rideId}`);

    res.json({
      success: true,
      ride,
    } as DriverAcceptResponse);
  } catch (error) {
    console.error('Error accepting ride:', error);
    
    // Check if ride was already assigned
    if (error instanceof Error && error.message.includes('already assigned')) {
      return res.status(409).json({
        success: false,
        error: 'Ride has already been assigned to another driver',
      } as ErrorResponse);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to accept ride',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * GET /api/driver/:driverDid/active-rides
 * Get driver's active rides (array)
 */
router.get('/:driverDid/active-rides', async (req: Request, res: Response) => {
  try {
    const { driverDid } = req.params;

    const rides = await dispatcherService.getDriverActiveRides(driverDid);

    res.json({
      success: true,
      rides,
    } as DriverActiveRidesResponse);
  } catch (error) {
    console.error('Error getting driver active rides:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active rides',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * GET /api/driver/:driverDid/active-ride
 * Get driver's single active ride (returns one ride or 404)
 */
router.get('/:driverDid/active-ride', async (req: Request, res: Response) => {
  try {
    const { driverDid } = req.params;

    const rides = await dispatcherService.getDriverActiveRides(driverDid);

    if (rides.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active ride found',
      } as ErrorResponse);
    }

    // Return the first (most recent) active ride
    res.json({
      success: true,
      ride: rides[0],
    });
  } catch (error) {
    console.error('Error getting driver active ride:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active ride',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * GET /api/driver/:driverDid/pending-rides
 * Get pending rides available for driver to accept
 */
router.get('/:driverDid/pending-rides', async (req: Request, res: Response) => {
  try {
    const { driverDid } = req.params;

    console.log(`[API] Getting pending rides for driver: ${driverDid}`);

    const rides = await dispatcherService.getPendingRidesForDriver(driverDid);

    console.log(`[API] Found ${rides.length} pending rides for driver ${driverDid}`);

    res.json({
      success: true,
      rides,
      count: rides.length,
    });
  } catch (error) {
    console.error('Error getting pending rides for driver:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending rides',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * GET /api/driver/nearby
 * Find nearby available drivers (for testing/debugging)
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: lat, lng',
      } as ErrorResponse);
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusMeters = radius ? parseInt(radius as string) : 5000;

    const drivers = await dispatcherService.findNearbyDrivers(latitude, longitude, radiusMeters);

    res.json({
      success: true,
      drivers,
      count: drivers.length,
    });
  } catch (error) {
    console.error('Error finding nearby drivers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearby drivers',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

export default router;

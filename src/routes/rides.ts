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

// Pricing constants (in DH - Moroccan Dirham)
const PRICING = {
  baseFare: 10, // Base fare for any ride
  perKm: 3.5, // Price per kilometer
  perMinute: 0.5, // Price per minute (estimated)
  minimumFare: 15, // Minimum fare
  deliveryBaseFare: 15, // Higher base for delivery
  deliveryPerKm: 4, // Higher per km for delivery
  packageSizeMultiplier: {
    small: 1,
    medium: 1.2,
    large: 1.5,
    extra_large: 2,
  },
};

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Estimate trip duration based on distance (rough approximation)
 * Assumes average speed of 30 km/h in city traffic
 */
function estimateDuration(distanceKm: number): number {
  const avgSpeedKmh = 30;
  return Math.ceil((distanceKm / avgSpeedKmh) * 60); // Returns minutes
}

/**
 * GET /api/rides/estimate
 * Get fare estimation for a ride
 */
router.get('/estimate', async (req: Request, res: Response) => {
  try {
    const {
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      type = 'ride',
      packageSize = 'small',
    } = req.query;

    // Validate coordinates
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        error: 'Missing required coordinates: pickupLat, pickupLng, dropoffLat, dropoffLng',
      } as ErrorResponse);
    }

    const pickup = {
      lat: parseFloat(pickupLat as string),
      lng: parseFloat(pickupLng as string),
    };
    const dropoff = {
      lat: parseFloat(dropoffLat as string),
      lng: parseFloat(dropoffLng as string),
    };

    // Validate parsed coordinates
    if (isNaN(pickup.lat) || isNaN(pickup.lng) || isNaN(dropoff.lat) || isNaN(dropoff.lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided',
      } as ErrorResponse);
    }

    // Calculate distance
    const distanceKm = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const durationMinutes = estimateDuration(distanceKm);

    // Calculate fare based on type
    const isDelivery = type === 'delivery';
    const baseFare = isDelivery ? PRICING.deliveryBaseFare : PRICING.baseFare;
    const perKm = isDelivery ? PRICING.deliveryPerKm : PRICING.perKm;

    let fare = baseFare + distanceKm * perKm + durationMinutes * PRICING.perMinute;

    // Apply package size multiplier for deliveries
    if (isDelivery && packageSize) {
      const multiplier =
        PRICING.packageSizeMultiplier[packageSize as keyof typeof PRICING.packageSizeMultiplier] || 1;
      fare *= multiplier;
    }

    // Apply minimum fare
    fare = Math.max(fare, PRICING.minimumFare);

    // Round to nearest 0.5
    fare = Math.round(fare * 2) / 2;

    console.log(
      `[FareEstimate] ${type} - Distance: ${distanceKm.toFixed(2)}km, Duration: ${durationMinutes}min, Fare: ${fare} DH`
    );

    res.json({
      success: true,
      estimate: {
        fare,
        currency: 'DH',
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationMinutes,
        breakdown: {
          baseFare,
          distanceCharge: Math.round(distanceKm * perKm * 10) / 10,
          timeCharge: Math.round(durationMinutes * PRICING.perMinute * 10) / 10,
          packageMultiplier: isDelivery
            ? PRICING.packageSizeMultiplier[packageSize as keyof typeof PRICING.packageSizeMultiplier] || 1
            : undefined,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating fare estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate fare estimate',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

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

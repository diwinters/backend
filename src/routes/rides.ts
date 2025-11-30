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

// =============================================================================
// SCALABLE CITY-BASED PRICING SYSTEM
// =============================================================================
// This pricing system is designed to:
// 1. Start with Dakhla's local taxi pricing as baseline
// 2. Be competitive with existing taxis while providing value
// 3. Scale to other Moroccan cities and internationally
// =============================================================================

interface CityPricing {
  name: string;
  currency: string;
  timezone: string;
  // Day/Night hours (24h format)
  nightStartHour: number; // When night pricing starts (e.g., 20 = 8 PM)
  nightEndHour: number;   // When night pricing ends (e.g., 6 = 6 AM)
  
  // Ride pricing
  ride: {
    baseFareDay: number;      // Base fare during day
    baseFareNight: number;    // Base fare during night
    baseDistanceKm: number;   // Distance included in base fare
    perKmAfterBase: number;   // Price per km after base distance
    perKmInterval: number;    // How many km before adding perKm charge (e.g., 2 = every 2km)
    minimumFare: number;      // Minimum fare regardless of distance
    // Special zones (far places like ports, universities, airports)
    specialZones: Array<{
      name: string;
      coordinates: { lat: number; lng: number };
      radiusKm: number;
      fixedFare?: number;     // Optional fixed fare to/from this zone
      surcharge?: number;     // Or a surcharge on top of calculated fare
    }>;
  };
  
  // Delivery pricing
  delivery: {
    baseFare: number;
    perKm: number;
    packageMultiplier: {
      small: number;
      medium: number;
      large: number;
      extra_large: number;
    };
    minimumFare: number;
  };
  
  // Platform fee (our margin)
  platformFeePercent: number; // e.g., 10 = 10% platform fee
  
  // Surge pricing settings
  surge: {
    enabled: boolean;
    maxMultiplier: number;    // Max surge (e.g., 2.0 = 2x)
    // Surge triggers (to be implemented with demand tracking)
  };
}

// City pricing configurations
const CITY_PRICING: Record<string, CityPricing> = {
  // ===================
  // DAKHLA - Launch City
  // ===================
  // Based on local petit taxi pricing:
  // - Day: 5 DH for trips < 5km
  // - Night: 6 DH for trips < 5km  
  // - Each additional 2km: +1 DH
  // - Far zones (Port, Universities): 15-20 DH fixed
  // Our pricing: Slightly competitive, fair for drivers
  dakhla: {
    name: 'Dakhla',
    currency: 'DH',
    timezone: 'Africa/Casablanca',
    nightStartHour: 20,  // 8 PM
    nightEndHour: 6,     // 6 AM
    
    ride: {
      baseFareDay: 5,        // Match local taxi day fare
      baseFareNight: 6,      // Match local taxi night fare
      baseDistanceKm: 5,     // First 5km included in base
      perKmAfterBase: 0.5,   // 0.5 DH per km after base (1 DH per 2km)
      perKmInterval: 2,      // Charge applies every 2km
      minimumFare: 5,        // Minimum 5 DH
      specialZones: [
        {
          name: 'Port de Dakhla',
          coordinates: { lat: 23.6847, lng: -15.9580 },
          radiusKm: 2,
          fixedFare: 15,
        },
        {
          name: 'Université Ibn Zohr - Dakhla',
          coordinates: { lat: 23.7200, lng: -15.9400 },
          radiusKm: 1.5,
          fixedFare: 15,
        },
        {
          name: 'Aéroport Dakhla',
          coordinates: { lat: 23.7183, lng: -15.9322 },
          radiusKm: 2,
          fixedFare: 20,
        },
        {
          name: 'PK25 / Lassarga',
          coordinates: { lat: 23.5500, lng: -15.9000 },
          radiusKm: 3,
          fixedFare: 20,
        },
      ],
    },
    
    delivery: {
      baseFare: 8,           // Slightly higher for delivery
      perKm: 1,              // 1 DH per km
      packageMultiplier: {
        small: 1,
        medium: 1.2,
        large: 1.5,
        extra_large: 2,
      },
      minimumFare: 8,
    },
    
    platformFeePercent: 15,  // 15% platform fee
    
    surge: {
      enabled: false,        // No surge pricing initially
      maxMultiplier: 1.5,
    },
  },
  
  // ===================
  // CASABLANCA - Future
  // ===================
  casablanca: {
    name: 'Casablanca',
    currency: 'DH',
    timezone: 'Africa/Casablanca',
    nightStartHour: 20,
    nightEndHour: 6,
    
    ride: {
      baseFareDay: 7,
      baseFareNight: 8,
      baseDistanceKm: 3,
      perKmAfterBase: 2,
      perKmInterval: 1,
      minimumFare: 7,
      specialZones: [
        {
          name: 'Aéroport Mohammed V',
          coordinates: { lat: 33.3675, lng: -7.5898 },
          radiusKm: 3,
          fixedFare: 300, // Airport to city
        },
      ],
    },
    
    delivery: {
      baseFare: 15,
      perKm: 3,
      packageMultiplier: {
        small: 1,
        medium: 1.3,
        large: 1.6,
        extra_large: 2.2,
      },
      minimumFare: 15,
    },
    
    platformFeePercent: 18,
    
    surge: {
      enabled: true,
      maxMultiplier: 2.0,
    },
  },
  
  // Default fallback
  default: {
    name: 'Default',
    currency: 'DH',
    timezone: 'Africa/Casablanca',
    nightStartHour: 20,
    nightEndHour: 6,
    
    ride: {
      baseFareDay: 6,
      baseFareNight: 7,
      baseDistanceKm: 4,
      perKmAfterBase: 1,
      perKmInterval: 1,
      minimumFare: 6,
      specialZones: [],
    },
    
    delivery: {
      baseFare: 10,
      perKm: 2,
      packageMultiplier: {
        small: 1,
        medium: 1.2,
        large: 1.5,
        extra_large: 2,
      },
      minimumFare: 10,
    },
    
    platformFeePercent: 15,
    
    surge: {
      enabled: false,
      maxMultiplier: 1.5,
    },
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
 * Determine which city the coordinates are in
 * For now, defaults to Dakhla. Later can use reverse geocoding or geofencing.
 */
function detectCity(lat: number, lng: number): string {
  // Dakhla approximate bounding box
  const DAKHLA_BOUNDS = {
    minLat: 23.4,
    maxLat: 24.0,
    minLng: -16.2,
    maxLng: -15.7,
  };
  
  // Casablanca approximate bounding box
  const CASABLANCA_BOUNDS = {
    minLat: 33.4,
    maxLat: 33.7,
    minLng: -7.8,
    maxLng: -7.4,
  };
  
  if (
    lat >= DAKHLA_BOUNDS.minLat &&
    lat <= DAKHLA_BOUNDS.maxLat &&
    lng >= DAKHLA_BOUNDS.minLng &&
    lng <= DAKHLA_BOUNDS.maxLng
  ) {
    return 'dakhla';
  }
  
  if (
    lat >= CASABLANCA_BOUNDS.minLat &&
    lat <= CASABLANCA_BOUNDS.maxLat &&
    lng >= CASABLANCA_BOUNDS.minLng &&
    lng <= CASABLANCA_BOUNDS.maxLng
  ) {
    return 'casablanca';
  }
  
  // Default to Dakhla for now (launch city)
  return 'dakhla';
}

/**
 * Check if current time is during night hours
 */
function isNightTime(pricing: CityPricing): boolean {
  const now = new Date();
  const hour = now.getHours();
  
  // Night hours wrap around midnight
  if (pricing.nightStartHour > pricing.nightEndHour) {
    // e.g., 20:00 to 06:00
    return hour >= pricing.nightStartHour || hour < pricing.nightEndHour;
  } else {
    return hour >= pricing.nightStartHour && hour < pricing.nightEndHour;
  }
}

/**
 * Check if pickup or dropoff is in a special zone
 */
function checkSpecialZone(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  specialZones: CityPricing['ride']['specialZones']
): { zone: typeof specialZones[0]; isPickup: boolean } | null {
  for (const zone of specialZones) {
    const distanceToPickup = calculateDistance(
      pickup.lat,
      pickup.lng,
      zone.coordinates.lat,
      zone.coordinates.lng
    );
    
    const distanceToDropoff = calculateDistance(
      dropoff.lat,
      dropoff.lng,
      zone.coordinates.lat,
      zone.coordinates.lng
    );
    
    if (distanceToPickup <= zone.radiusKm) {
      return { zone, isPickup: true };
    }
    
    if (distanceToDropoff <= zone.radiusKm) {
      return { zone, isPickup: false };
    }
  }
  
  return null;
}

/**
 * Estimate trip duration based on distance
 */
function estimateDuration(distanceKm: number, city: string): number {
  // Different average speeds for different cities
  const avgSpeeds: Record<string, number> = {
    dakhla: 35,      // Smaller city, less traffic
    casablanca: 25,  // Larger city, more traffic
    default: 30,
  };
  
  const avgSpeedKmh = avgSpeeds[city] || avgSpeeds.default;
  return Math.ceil((distanceKm / avgSpeedKmh) * 60); // Returns minutes
}

/**
 * Calculate ride fare based on city pricing rules
 */
function calculateRideFare(
  distanceKm: number,
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  pricing: CityPricing
): {
  fare: number;
  baseFare: number;
  distanceCharge: number;
  isNight: boolean;
  specialZone?: string;
  breakdown: string;
} {
  const isNight = isNightTime(pricing);
  const baseFare = isNight ? pricing.ride.baseFareNight : pricing.ride.baseFareDay;
  
  // Check for special zones first
  const specialZoneMatch = checkSpecialZone(pickup, dropoff, pricing.ride.specialZones);
  
  if (specialZoneMatch && specialZoneMatch.zone.fixedFare) {
    return {
      fare: specialZoneMatch.zone.fixedFare,
      baseFare: specialZoneMatch.zone.fixedFare,
      distanceCharge: 0,
      isNight,
      specialZone: specialZoneMatch.zone.name,
      breakdown: `Fixed fare to/from ${specialZoneMatch.zone.name}`,
    };
  }
  
  // Calculate distance-based fare
  let fare = baseFare;
  let distanceCharge = 0;
  
  if (distanceKm > pricing.ride.baseDistanceKm) {
    const extraDistance = distanceKm - pricing.ride.baseDistanceKm;
    // Calculate how many "intervals" of extra distance
    const intervals = Math.ceil(extraDistance / pricing.ride.perKmInterval);
    distanceCharge = intervals * pricing.ride.perKmAfterBase * pricing.ride.perKmInterval;
    fare += distanceCharge;
  }
  
  // Apply special zone surcharge if exists
  if (specialZoneMatch && specialZoneMatch.zone.surcharge) {
    fare += specialZoneMatch.zone.surcharge;
  }
  
  // Apply minimum fare
  fare = Math.max(fare, pricing.ride.minimumFare);
  
  // Round to nearest integer (no decimals for simple pricing)
  fare = Math.round(fare);
  
  const timeLabel = isNight ? 'night' : 'day';
  const breakdown = distanceKm <= pricing.ride.baseDistanceKm
    ? `${baseFare} DH base (${timeLabel}, ≤${pricing.ride.baseDistanceKm}km)`
    : `${baseFare} DH base + ${distanceCharge} DH (${(distanceKm - pricing.ride.baseDistanceKm).toFixed(1)}km extra)`;
  
  return {
    fare,
    baseFare,
    distanceCharge,
    isNight,
    specialZone: specialZoneMatch?.zone.name,
    breakdown,
  };
}

/**
 * Calculate delivery fare
 */
function calculateDeliveryFare(
  distanceKm: number,
  packageSize: string,
  pricing: CityPricing
): {
  fare: number;
  baseFare: number;
  distanceCharge: number;
  packageMultiplier: number;
  breakdown: string;
} {
  const baseFare = pricing.delivery.baseFare;
  const distanceCharge = distanceKm * pricing.delivery.perKm;
  const packageMultiplier = 
    pricing.delivery.packageMultiplier[packageSize as keyof typeof pricing.delivery.packageMultiplier] || 1;
  
  let fare = (baseFare + distanceCharge) * packageMultiplier;
  fare = Math.max(fare, pricing.delivery.minimumFare);
  fare = Math.round(fare);
  
  const breakdown = `${baseFare} DH base + ${distanceCharge.toFixed(1)} DH distance × ${packageMultiplier} (${packageSize})`;
  
  return {
    fare,
    baseFare,
    distanceCharge,
    packageMultiplier,
    breakdown,
  };
}

/**
 * GET /api/rides/estimate
 * Get fare estimation for a ride or delivery
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
      city: requestedCity,
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

    // Detect city or use requested city
    const city = (requestedCity as string) || detectCity(pickup.lat, pickup.lng);
    const pricing = CITY_PRICING[city] || CITY_PRICING.default;

    // Calculate distance
    const distanceKm = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const durationMinutes = estimateDuration(distanceKm, city);

    // Calculate fare based on type
    const isDelivery = type === 'delivery';
    
    let response: any;
    
    if (isDelivery) {
      const deliveryFare = calculateDeliveryFare(distanceKm, packageSize as string, pricing);
      
      response = {
        success: true,
        estimate: {
          fare: deliveryFare.fare,
          currency: pricing.currency,
          distanceKm: Math.round(distanceKm * 10) / 10,
          durationMinutes,
          city: pricing.name,
          breakdown: {
            baseFare: deliveryFare.baseFare,
            distanceCharge: Math.round(deliveryFare.distanceCharge * 10) / 10,
            packageMultiplier: deliveryFare.packageMultiplier,
            description: deliveryFare.breakdown,
          },
          driverEarnings: Math.round(deliveryFare.fare * (100 - pricing.platformFeePercent) / 100),
          platformFee: Math.round(deliveryFare.fare * pricing.platformFeePercent / 100),
        },
      };
    } else {
      const rideFare = calculateRideFare(distanceKm, pickup, dropoff, pricing);
      
      response = {
        success: true,
        estimate: {
          fare: rideFare.fare,
          currency: pricing.currency,
          distanceKm: Math.round(distanceKm * 10) / 10,
          durationMinutes,
          city: pricing.name,
          isNight: rideFare.isNight,
          specialZone: rideFare.specialZone,
          breakdown: {
            baseFare: rideFare.baseFare,
            distanceCharge: rideFare.distanceCharge,
            description: rideFare.breakdown,
          },
          driverEarnings: Math.round(rideFare.fare * (100 - pricing.platformFeePercent) / 100),
          platformFee: Math.round(rideFare.fare * pricing.platformFeePercent / 100),
        },
      };
    }

    console.log(
      `[FareEstimate] ${pricing.name} ${type} - Distance: ${distanceKm.toFixed(2)}km, ` +
      `Duration: ${durationMinutes}min, Fare: ${response.estimate.fare} ${pricing.currency}`
    );

    res.json(response);
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

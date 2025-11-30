// Type definitions matching the React Native app's structure

export interface User {
  id: number;
  did: string; // AT Protocol DID (e.g., did:plc:...)
  displayName?: string;
  avatarUrl?: string;
  userType: 'rider' | 'driver' | 'both';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDevice {
  id: number;
  userId: number;
  deviceToken: string;
  platform: 'ios' | 'android';
  appId?: string;
  isActive: boolean;
  registeredAt: Date;
  lastSeen: Date;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RiderInfo {
  name: string;
  phone: string;
  notes?: string;
}

export interface DeliveryInfo {
  recipientName: string;
  recipientPhone: string;
  instructions?: string;
}

export interface RideBookingRequest {
  orderId?: string;
  customerDID: string;
  pickup: Location;
  dropoff: Location;
  bookingType: 'standard' | 'scheduled';
  scheduledTime?: string; // ISO 8601 format
  riderInfo?: RiderInfo;
  deliveryInfo?: DeliveryInfo;
}

export interface Ride {
  id: string; // UUID
  orderId?: string;
  riderDid: string;
  driverDid?: string;
  
  // Driver info (populated when assigned)
  driverName?: string;
  driverAvatar?: string;
  driverPhone?: string;
  
  // Pickup
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  
  // Dropoff
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
  
  // Booking details
  bookingType: 'standard' | 'scheduled';
  scheduledTime?: Date;
  
  // Rider info
  riderName?: string;
  riderPhone?: string;
  riderNotes?: string;
  
  // Delivery info
  deliveryRecipientName?: string;
  deliveryRecipientPhone?: string;
  deliveryInstructions?: string;
  
  // Status
  status: RideStatus;
  
  // Pricing
  estimatedPrice?: number;
  finalPrice?: number;
  
  // Timestamps
  createdAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Metadata
  cancellationReason?: string;
  rating?: number;
}

export type RideStatus = 
  | 'pending'
  | 'offered'
  | 'accepted'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface DriverLocation {
  id: number;
  driverDid: string;
  latitude: number;
  longitude: number;
  heading?: number; // Direction in degrees (0-360)
  speed?: number; // Speed in m/s
  isAvailable: boolean;
  updatedAt: Date;
}

export interface DriverAvailabilityUpdate {
  driverDID: string;
  isAvailable: boolean;
  currentLocation: Location;
  heading?: number;
  speed?: number;
}

export interface DriverOffer {
  rideId: string;
  driverDid: string;
  estimatedArrivalMinutes: number;
}

export interface RideStatusUpdate {
  rideId: string;
  status: RideStatus;
  updatedBy: string; // DID
  notes?: string;
}

export interface NearbyDriver {
  driverDid: string;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

// Push notification payload types (matching app's NotificationPayload)
export interface RideOfferNotificationPayload {
  reason: 'ride-offer';
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice?: number;
  recipientDid: string;
}

export interface RideAssignedNotificationPayload {
  reason: 'ride-assigned';
  rideId: string;
  driverName?: string;
  driverDid: string;
  driverAvatar?: string;
  driverPhone?: string;
  estimatedArrival: number;
  recipientDid: string;
}

export interface RideStatusUpdateNotificationPayload {
  reason: 'ride-status-update';
  rideId: string;
  status: RideStatus;
  recipientDid: string;
}

export type NotificationPayload = 
  | RideOfferNotificationPayload
  | RideAssignedNotificationPayload
  | RideStatusUpdateNotificationPayload;

// WebSocket message types
export interface WSMessage {
  type: string;
  payload: any;
}

export interface DriverLocationWSMessage extends WSMessage {
  type: 'driver:location';
  payload: {
    driverDid: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  };
}

export interface RideStatusWSMessage extends WSMessage {
  type: 'ride:status';
  payload: RideStatusUpdate;
}

// API Request/Response types
export interface RegisterDeviceRequest {
  did: string;
  platform: 'ios' | 'android';
  token: string;
  appId?: string;
}

export interface RegisterDeviceResponse {
  success: boolean;
  message: string;
}

export interface CreateRideRequest extends RideBookingRequest {}

export interface CreateRideResponse {
  success: boolean;
  ride: Ride;
}

export interface GetRideResponse {
  success: boolean;
  ride: Ride;
}

export interface UpdateRideStatusRequest {
  status: RideStatus;
  notes?: string;
}

export interface UpdateRideStatusResponse {
  success: boolean;
  ride: Ride;
}

export interface CancelRideRequest {
  reason: string;
}

export interface CancelRideResponse {
  success: boolean;
  ride: Ride;
}

export interface DriverAvailableRequest extends DriverAvailabilityUpdate {}

export interface DriverAvailableResponse {
  success: boolean;
  message: string;
}

export interface DriverOfferRequest extends DriverOffer {}

export interface DriverOfferResponse {
  success: boolean;
  ride: Ride;
}

export interface DriverAcceptRequest {
  rideId: string;
  driverDid: string;
}

export interface DriverAcceptResponse {
  success: boolean;
  ride: Ride;
}

export interface DriverActiveRidesResponse {
  success: boolean;
  rides: Ride[];
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

// Database query result types
export interface DBUser {
  id: number;
  did: string;
  display_name: string | null;
  avatar_url: string | null;
  user_type: 'rider' | 'driver' | 'both';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DBRide {
  id: string;
  order_id: string | null;
  rider_did: string;
  driver_did: string | null;
  // Driver info (populated via JOIN)
  driver_name?: string | null;
  driver_avatar?: string | null;
  driver_phone?: string | null;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  booking_type: 'standard' | 'scheduled';
  scheduled_time: Date | null;
  rider_name: string | null;
  rider_phone: string | null;
  rider_notes: string | null;
  delivery_recipient_name: string | null;
  delivery_recipient_phone: string | null;
  delivery_instructions: string | null;
  status: RideStatus;
  estimated_price: number | null;
  final_price: number | null;
  created_at: Date;
  accepted_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  rating: number | null;
}

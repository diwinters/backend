# Raceef Backend API

Production backend API for Raceef ride-hailing service, replacing Bluesky DM-based dispatcher.

## Features

- **REST API**: Express endpoints for ride booking, driver management, user operations
- **WebSocket**: Real-time updates for ride status, driver locations, offers
- **Push Notifications**: Expo Push API integration for mobile notifications
- **Geospatial Queries**: PostGIS for efficient driver-to-rider matching
- **AT Protocol DIDs**: Compatible with existing app authentication

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 14+ with PostGIS extension
- **WebSocket**: ws library
- **Push Notifications**: expo-server-sdk

## Setup

### Prerequisites

```bash
# Install PostgreSQL with PostGIS
sudo apt update
sudo apt install postgresql postgresql-contrib postgis

# Create database
sudo -u postgres createdb raceef
sudo -u postgres psql raceef -c "CREATE EXTENSION postgis;"
```

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/raceef-backend.git
cd raceef-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Update DB credentials

# Run migrations
npm run db:migrate

# Build TypeScript
npm run build

# Start server
npm start
```

### Development

```bash
# Run in development mode with hot reload
npm run dev
```

## API Endpoints

### Users
- `POST /api/users/register` - Register device token
- `POST /api/users/unregister` - Unregister device token

### Rides
- `POST /api/rides` - Create new ride request
- `GET /api/rides/:rideId` - Get ride status
- `PUT /api/rides/:rideId/status` - Update ride status
- `DELETE /api/rides/:rideId` - Cancel ride

### Drivers
- `POST /api/driver/available` - Update driver availability
- `POST /api/driver/offer` - Driver offers ride
- `POST /api/driver/accept` - Driver accepts ride
- `GET /api/driver/active-rides` - Get driver's active rides

## WebSocket Events

### Client → Server
- `driver:location` - Update driver location
- `ride:status` - Update ride status

### Server → Client
- `ride:offer` - New ride offer for driver
- `ride:assigned` - Ride assigned to driver
- `ride:status-update` - Ride status changed
- `driver:location-update` - Driver location updated

## Database Schema

Tables:
- `users` - User profiles with AT Protocol DIDs
- `user_devices` - Device tokens for push notifications
- `rides` - Ride requests and status
- `driver_locations` - Real-time driver GPS coordinates (PostGIS)
- `ride_history` - Historical ride data

## Deployment

### PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.js --name raceef-api

# View logs
pm2 logs raceef-api

# Restart
pm2 restart raceef-api
```

### Environment Variables

See `.env.example` for all configuration options.

## Integration with React Native App

### 1. Register Device Tokens

Modify `src/lib/notifications/notifications.ts`:

```typescript
// After registering with Bluesky, also register with backend
await fetch('https://your-server.com/api/users/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    did: userDid,
    platform: Platform.OS,
    token: deviceToken,
  }),
});
```

### 2. Replace Dispatcher Service

Update `src/lib/services/dispatcher-service.ts`:

```typescript
// Replace Bluesky DM with HTTP API call
export async function sendRideBookingRequest(request: RideBookingRequest) {
  const response = await fetch('https://your-server.com/api/rides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}
```

### 3. Add Custom Notification Types

Update `src/lib/hooks/useNotificationHandler.ts`:

```typescript
type NotificationReason = 
  | 'chat-message'
  | 'ride-offer'
  | 'ride-assigned'
  | 'ride-status-update'
  // ... existing types
```

## License

MIT

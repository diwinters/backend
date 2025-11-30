import WebSocket from 'ws';
import { WSMessage } from '../types';
import { dispatcherService } from './dispatcher.service';

// Store connected clients by DID
const clients = new Map<string, Set<WebSocket>>();

export function initializeWebSocketServer(server: any) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    let userDid: string | null = null;

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        await handleWebSocketMessage(ws, message, (did) => {
          userDid = did;
        });
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' },
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      if (userDid) {
        removeClient(userDid, ws);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('✓ WebSocket server initialized on /ws');
  return wss;
}

async function handleWebSocketMessage(
  ws: WebSocket,
  message: WSMessage,
  setUserDid: (did: string) => void
) {
  switch (message.type) {
    case 'auth':
      // Authenticate user and store connection
      const { did } = message.payload;
      if (!did) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Missing DID in auth message' },
        }));
        return;
      }

      addClient(did, ws);
      setUserDid(did);

      ws.send(JSON.stringify({
        type: 'auth:success',
        payload: { message: 'Authenticated successfully' },
      }));
      break;

    case 'driver:location':
      // Update driver location
      const { driverDid, latitude, longitude, heading, speed } = message.payload;
      
      await dispatcherService.updateDriverAvailability({
        driverDID: driverDid,
        isAvailable: true, // Assume available if sending location
        currentLocation: { latitude, longitude },
        heading,
        speed,
      });

      // Location update is broadcast by dispatcherService
      break;

    case 'ride:status':
      // Update ride status
      const { rideId, status, updatedBy, notes } = message.payload;
      
      await dispatcherService.updateRideStatus(rideId, status, updatedBy, notes);
      
      // Status update is broadcast by dispatcherService
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', payload: {} }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: `Unknown message type: ${message.type}` },
      }));
  }
}

function addClient(did: string, ws: WebSocket) {
  if (!clients.has(did)) {
    clients.set(did, new Set());
  }
  clients.get(did)!.add(ws);
  console.log(`Client ${did} connected. Total clients: ${clients.size}`);
}

function removeClient(did: string, ws: WebSocket) {
  const userClients = clients.get(did);
  if (userClients) {
    userClients.delete(ws);
    if (userClients.size === 0) {
      clients.delete(did);
    }
  }
  console.log(`Client ${did} disconnected. Total clients: ${clients.size}`);
}

/**
 * Broadcast message to all connected clients for a specific user (by DID)
 */
export function broadcastToUser(did: string, message: WSMessage) {
  const userClients = clients.get(did);
  if (!userClients || userClients.size === 0) {
    console.log(`No connected clients for user ${did}`);
    return;
  }

  const messageStr = JSON.stringify(message);
  userClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

/**
 * Broadcast message to all connected clients
 */
export function broadcastToAll(message: WSMessage) {
  const messageStr = JSON.stringify(message);
  clients.forEach(userClients => {
    userClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  });
}

/**
 * Get number of connected clients
 */
export function getConnectedClientsCount(): number {
  return clients.size;
}

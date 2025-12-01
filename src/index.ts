import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { initializeDatabase, closeDatabase } from './config/database';
import { initializeWebSocketServer } from './services/websocket.service';
import usersRouter from './routes/users';
import ridesRouter from './routes/rides';
import driversRouter from './routes/drivers';
import adminRouter from './routes/admin';
import pricingRouter from './routes/pricing';
import staysRouter from './routes/stays';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/users', usersRouter);
app.use('/api/rides', ridesRouter);
app.use('/api/driver', driversRouter);
app.use('/api/admin', adminRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/stays', staysRouter);

// Serve admin dashboard static files
const dashboardPath = path.join(__dirname, '../dashboard/dist');
app.use('/admin', express.static(dashboardPath));

// SPA fallback for admin dashboard - serve index.html for all non-API routes under /admin
app.get('/admin/*', (_req: Request, res: Response) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
initializeWebSocketServer(server);

// Start server
async function start() {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Start HTTP server
    server.listen(PORT, () => {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  🚗 Raceef Backend API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  HTTP Server:     http://localhost:${PORT}`);
      console.log(`  WebSocket:       ws://localhost:${PORT}/ws`);
      console.log(`  Health Check:    http://localhost:${PORT}/health`);
      console.log(`  Environment:     ${process.env.NODE_ENV || 'development'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('API Endpoints:');
      console.log('  POST   /api/users/register');
      console.log('  POST   /api/users/unregister');
      console.log('  GET    /api/users/:did');
      console.log('');
      console.log('  POST   /api/rides');
      console.log('  GET    /api/rides/:rideId');
      console.log('  PUT    /api/rides/:rideId/status');
      console.log('  DELETE /api/rides/:rideId');
      console.log('');
      console.log('  POST   /api/driver/available');
      console.log('  POST   /api/driver/accept');
      console.log('  GET    /api/driver/:driverDid/active-rides');
      console.log('  GET    /api/driver/nearby?lat=X&lng=Y');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down gracefully...');
  
  try {
    // Close server
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✓ HTTP server closed');

    // Close database connection
    await closeDatabase();

    console.log('✓ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the server
start();

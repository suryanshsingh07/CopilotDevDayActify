import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';
import authRouter from './routes/auth';
import deadlineRouter from './routes/deadlines';
import { connectDB } from './config/db';
import { seedDemoUserInMongo } from './controllers/authController';

const app = express();
const PORT = parseInt(process.env.PORT ?? '8000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// CORS configuration supporting Localhost, Vercel preview & production deployments
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Allow configured frontend URL
      if (origin === FRONTEND_URL) return callback(null, true);

      // Allow any vercel deployment (e.g. https://actify-alpha.vercel.app, *.vercel.app)
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);

      // Allow localhost dev servers
      if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        return callback(null, true);
      }

      // Permissive callback for other production domains
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// Health and Root probe
app.get('/', (_req, res) => {
  res.json({
    name: 'Actify API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      deadlines: '/api/deadlines',
      extract: '/api/extract',
      analyze: '/api/analyze',
    },
  });
});

// Routes
app.use('/api', apiRouter);
app.use('/api/auth', authRouter);
app.use('/api/deadlines', deadlineRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

async function startServer() {
  // Connect to MongoDB
  const connected = await connectDB();
  if (connected) {
    await seedDemoUserInMongo();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Actify backend running on port ${PORT}`);
    console.log(`   Frontend origin: ${FRONTEND_URL}`);
  });
}

startServer();

export default app;

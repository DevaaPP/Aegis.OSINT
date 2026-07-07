import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { CONFIG } from './config';
import { apiLimiter, authLimiter, scanLimiter } from './middleware/rateLimiter';
import { requireAuth, requireAdmin } from './middleware/auth';

// Import Controllers
import * as auth from './controllers/authController';
import * as scan from './controllers/scanController';
import * as clean from './controllers/cleanController';
import * as admin from './controllers/adminController';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: CONFIG.FRONTEND_URL,
    credentials: true,
  })
);

// Body Parser with 10MB limit to facilitate image and PDF uploads encoded in base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiter
app.use('/api', apiLimiter);

// --- Public Feedback Route ---
app.post('/api/feedback', admin.submitFeedback);

// --- Authentication Routes ---
app.post('/api/auth/register', authLimiter, auth.register);
app.post('/api/auth/login', authLimiter, auth.login);
app.post('/api/auth/forgot-password', auth.requestPasswordReset);
app.get('/api/auth/profile', requireAuth, auth.getProfile);
app.put('/api/auth/profile', requireAuth, auth.updateProfile);
app.get('/api/auth/export', requireAuth, auth.exportData);
app.delete('/api/auth/delete', requireAuth, auth.deleteAccount);

// --- Digital Footprint Scanner Routes ---
app.post('/api/scan/recursive', requireAuth, scanLimiter, scan.executeRecursiveScan);
app.get('/api/scan/history', requireAuth, scan.getScanHistory);
app.delete('/api/scan/history', requireAuth, scan.deleteScanHistory);
app.get('/api/scan/report/:id', requireAuth, scan.downloadReport);
app.get('/api/scan/advice/:id', requireAuth, scan.fetchScanAdvice);

// File Metadata Scanners
app.post('/api/scan/metadata/analyze', requireAuth, scan.analyzeFileMetadata);
app.post('/api/scan/metadata/clean', requireAuth, scan.cleanFileMetadata);

// --- Privacy Cleaner / Mitigation Routes ---
app.get('/api/clean/brokers', requireAuth, clean.getDataBrokersList);
app.post('/api/clean/letter', requireAuth, clean.generateOptOutLetter);
app.get('/api/clean/tasks', requireAuth, clean.getCleaningTasks);
app.post('/api/clean/tasks', requireAuth, clean.createCleaningTask);
app.put('/api/clean/tasks/:id', requireAuth, clean.updateCleaningTask);
app.delete('/api/clean/tasks/:id', requireAuth, clean.deleteCleaningTask);

// --- Admin Controls ---
app.get('/api/admin/stats', requireAdmin, admin.getSystemStats);
app.get('/api/admin/users', requireAdmin, admin.getUsers);
app.delete('/api/admin/users/:id', requireAdmin, admin.deleteUser);
app.get('/api/admin/logs', requireAdmin, admin.getAuditLogs);
app.get('/api/admin/feedback', requireAdmin, admin.getFeedback);
app.delete('/api/admin/feedback/:id', requireAdmin, admin.deleteFeedback);

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, status: 'API operational', timestamp: new Date() });
});

export default app;

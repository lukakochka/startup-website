import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';

import authRoutes from './src/routes/auth.routes.js';
import analyzeRoutes from './src/routes/analyze.routes.js';
import historyRoutes from './src/routes/history.routes.js';
import promptsRoutes from './src/routes/prompts.routes.js';
import preferencesRoutes from './src/routes/preferences.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
process.env.APP_URL = APP_URL; // inject for passport routes to use

const app = express();

// ─── Core middleware ──────────────────────────────────────────────────────────

app.use(cors({ origin: APP_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// ─── Static files ─────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded images (with direct URL access)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/preferences', preferencesRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ─── SPA fallback ─────────────────────────────────────────────────────────────

app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 FridgeAI server running at http://localhost:${PORT}`);
  console.log(`   Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ configured' : '⚠️  not configured'}`);
  console.log(`   GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? '✅ configured' : '⚠️  not configured'}`);
});

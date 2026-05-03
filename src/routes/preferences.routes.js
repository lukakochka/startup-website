import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

function parseList(raw) {
  try { return JSON.parse(raw); } catch { return []; }
}

/**
 * GET /api/preferences
 * Returns user's saved preferences. For anonymous users returns empty defaults.
 */
router.get('/', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.json({ allergens: [], dislikes: [] });
  }
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
    });
    res.json({
      allergens: parseList(prefs?.allergens ?? '[]'),
      dislikes:  parseList(prefs?.dislikes  ?? '[]'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/preferences
 * Creates or replaces the user's dietary preferences. Auth required.
 * Body: { allergens: string[], dislikes: string[] }
 */
router.put('/', requireAuth, async (req, res) => {
  const allergens = Array.isArray(req.body.allergens) ? req.body.allergens : [];
  const dislikes  = Array.isArray(req.body.dislikes)  ? req.body.dislikes  : [];

  // Sanitize: trim whitespace, remove empty strings, deduplicate, lowercase
  const clean = (arr) => [...new Set(arr.map((s) => String(s).trim().toLowerCase()).filter(Boolean))];

  try {
    const prefs = await prisma.userPreferences.upsert({
      where: { userId: req.user.id },
      update: {
        allergens: JSON.stringify(clean(allergens)),
        dislikes:  JSON.stringify(clean(dislikes)),
      },
      create: {
        userId:    req.user.id,
        allergens: JSON.stringify(clean(allergens)),
        dislikes:  JSON.stringify(clean(dislikes)),
      },
    });
    res.json({
      allergens: parseList(prefs.allergens),
      dislikes:  parseList(prefs.dislikes),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

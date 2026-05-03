import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * GET /api/history?limit=10&offset=0
 * Returns recent analyses. If authenticated, returns user's own history.
 * Without auth, returns last N global records (for demo purposes).
 */
router.get('/', optionalAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const isAdmin = req.user && (req.user.email === 'lyka212.212@gmail.com'); 
    const where = isAdmin ? {} : (req.user ? { userId: req.user.id } : { userId: 'anonymous_no_history' });

    const [records, total] = await Promise.all([
      prisma.recipeHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          photoPath: true,
          ingredients: true,
          aiResponse: true,
          createdAt: true,
        },
      }),
      prisma.recipeHistory.count({ where }),
    ]);

    const items = records.map((r) => ({
      ...r,
      aiResponse: JSON.parse(r.aiResponse),
    }));

    res.json({ items, total, limit, offset });
  } catch (err) {
    console.error('[history] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

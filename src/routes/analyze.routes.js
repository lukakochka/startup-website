import { Router } from 'express';
import path from 'path';
import { upload } from '../middleware/upload.js';
import { optionalAuth } from '../middleware/auth.js';
import { analyzeRefrigeratorPhoto } from '../services/ai.service.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * POST /api/analyze
 * Multipart fields:
 *   - photo        (File)   required
 *   - allergens    (string) optional JSON array  e.g. '["молоко","арахис"]'
 *   - dislikes     (string) optional JSON array  e.g. '["кинза"]'
 */
router.post('/', optionalAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded. Field name must be "photo".' });
  }

  const photoPath = req.file.path;
  const userId = req.user?.id ?? null;

  // Parse dietary preferences from request (client always sends latest)
  let allergens = [];
  let dislikes = [];
  try {
    allergens = JSON.parse(req.body.allergens || '[]');
    dislikes  = JSON.parse(req.body.dislikes  || '[]');
  } catch {
    // malformed JSON — ignore, use empty arrays
  }

  // If user is authenticated, also pull their saved preferences from DB
  // and merge with what the client sent (client state wins for this request)
  if (userId && !allergens.length && !dislikes.length) {
    const saved = await prisma.userPreferences.findUnique({ where: { userId } });
    if (saved) {
      try {
        allergens = JSON.parse(saved.allergens);
        dislikes  = JSON.parse(saved.dislikes);
      } catch { /* ignore */ }
    }
  }

  try {
    const promptTemplate = await prisma.promptTemplate.findFirst({ where: { isDefault: true } });
    if (!promptTemplate) {
      return res.status(500).json({ error: 'No default prompt found. Run: npm run db:seed' });
    }

    const aiResult = await analyzeRefrigeratorPhoto(
      photoPath,
      promptTemplate.content,
      { allergens, dislikes }
    );

    const record = await prisma.recipeHistory.create({
      data: {
        userId,
        photoPath: path.relative(process.cwd(), photoPath),
        photoStatus: 'stored',
        aiResponse: JSON.stringify(aiResult),
        ingredients: aiResult.ingredients?.join(', ') ?? '',
        allergens: JSON.stringify(allergens),
        dislikes:  JSON.stringify(dislikes),
      },
    });

    res.json({ id: record.id, ...aiResult });
  } catch (err) {
    console.error('[analyze] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

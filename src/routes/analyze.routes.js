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
  if (!req.file) return res.status(400).json({ error: 'Photo is required' });

  const userId = req.user?.id || null;
  const clientIp = req.ip || req.socket.remoteAddress;
  const clientAgent = req.headers['user-agent'] || 'Unknown';

  try {
    // 1. Fetch system prompt (Safe version)
    let promptTemplate = `Ты — шеф-повар Ai-Chef. Проанализируй фото и предложи рецепты в JSON.`;
    try {
      const activePrompt = await prisma.systemPrompt.findFirst({ where: { isActive: true } });
      if (activePrompt) promptTemplate = activePrompt.content;
    } catch (dbErr) {
      console.warn('DB not ready, using fallback prompt');
    }

    // 2. Resolve preferences (DB + Client inputs)
    let dbPrefs = null;
    if (userId) {
      dbPrefs = await prisma.userPreferences.findUnique({ where: { userId } });
    }
    const dbAllergens = dbPrefs ? JSON.parse(dbPrefs.allergens) : [];
    const dbDislikes = dbPrefs ? JSON.parse(dbPrefs.dislikes) : [];

    const clientAllergens = req.body.allergens ? JSON.parse(req.body.allergens) : [];
    const clientDislikes = req.body.dislikes ? JSON.parse(req.body.dislikes) : [];

    const finalAllergens = [...new Set([...dbAllergens, ...clientAllergens])];
    const finalDislikes = [...new Set([...dbDislikes, ...clientDislikes])];
    
    const vibe = req.body.vibe || null;
    
    // 3. Find expiring ingredients for inventory (if logged in)
    let expiring = [];
    if (userId) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const staleItems = await prisma.userInventory.findMany({
        where: { userId, firstSeenAt: { lt: threeDaysAgo } }
      });
      expiring = staleItems.map(item => item.ingredientName);
    }

    // 4. Call AI with new preferences and expiring items
    const prefsObj = { allergens: finalAllergens, dislikes: finalDislikes, vibe, expiring };
    const aiResponse = await analyzeRefrigeratorPhoto(req.file.path, promptTemplate, prefsObj);

    // 5. Update Inventory (if logged in)
    if (userId && aiResponse.ingredients && Array.isArray(aiResponse.ingredients)) {
      const now = new Date();
      // Execute sequentially to avoid SQLite locking issues with multiple concurrent queries
      for (const ingredient of aiResponse.ingredients) {
        const name = ingredient.toLowerCase().trim();
        await prisma.userInventory.upsert({
          where: { userId_ingredientName: { userId, ingredientName: name } },
          update: { lastSeenAt: now },
          create: { userId, ingredientName: name, firstSeenAt: now, lastSeenAt: now }
        });
      }
      
      // Update User metrics
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastIp: clientIp, 
          userAgent: clientAgent,
          totalScans: { increment: 1 }
        }
      });
    }

    // 6. Save History Record (Max Data)
    const dbPhotoPath = req.file.path.split(path.sep).join('/').replace(/.*\/public\//, '');
    
    await prisma.recipeHistory.create({
      data: {
        userId,
        photoPath: dbPhotoPath,
        photoStatus: 'stored',
        vibe,
        aiResponse: JSON.stringify(aiResponse),
        ingredients: (aiResponse.ingredients || []).join(', '),
        allergens: JSON.stringify(finalAllergens),
        dislikes: JSON.stringify(finalDislikes),
        clientIp,
        clientAgent
      },
    });

    res.json(aiResponse);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze photo' });
  }
});

export default router;

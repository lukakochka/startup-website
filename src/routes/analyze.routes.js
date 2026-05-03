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
    // 1. Get System Prompt (Directly from code for 100% reliability)
    const systemPrompt = `Ты — шеф-повар мишленовского уровня. Твоя задача: давать МАКСИМАЛЬНО ТОЧНЫЕ инструкции.

ТРЕБОВАНИЯ К РЕЦЕПТАМ:
1. ИНСТРУКЦИИ (steps): Описывай процесс детально. Не просто "нарежьте", а "нарежьте кубиками 1x1 см" или "нашинкуйте тонкой соломкой". Указывай время термической обработки ("обжаривайте 3-5 минут до золотистой корочки") и интенсивность огня.
2. ФОТО: Для каждого рецепта предложи ключевое слово для поиска идеального фото на английском языке (поле "imageSearchTerm").
3. ВАЙБЫ: СТРОГО соблюдай выбранный вайб.

ОТВЕЧАЙ ТОЛЬКО В JSON:
{
  "ingredients": ["продукт 1", "продукт 2"],
  "recipes": [
    {
      "name": "Название",
      "time": "Время",
      "difficulty": "Сложность",
      "imageSearchTerm": "food dish",
      "kbju": {"k": 0, "b": 0, "j": 0, "u": 0},
      "steps": ["Шаг 1: Детально про нарезку", "Шаг 2: Детально про готовку"],
      "bestTime": "Совет"
    }
  ]
}`;

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

import { Router } from 'express';
import path from 'path';
import { upload } from '../middleware/upload.js';
import { optionalAuth } from '../middleware/auth.js';
import { analyzeRefrigeratorPhoto } from '../services/ai.service.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.post('/', optionalAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Photo is required' });

  const userId = req.user?.id || null;
  const clientIp = req.ip || req.socket.remoteAddress;
  const clientAgent = req.headers['user-agent'] || 'Unknown';

  try {
    // 1. Surgical System Prompt
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

    // 2. Resolve preferences
    let dbPrefs = null;
    if (userId) {
      dbPrefs = await prisma.userPreferences.findUnique({ where: { userId } }).catch(() => null);
    }
    const dbAllergens = dbPrefs ? JSON.parse(dbPrefs.allergens) : [];
    const dbDislikes = dbPrefs ? JSON.parse(dbPrefs.dislikes) : [];
    const clientAllergens = req.body.allergens ? JSON.parse(req.body.allergens) : [];
    const clientDislikes = req.body.dislikes ? JSON.parse(req.body.dislikes) : [];

    const finalAllergens = [...new Set([...dbAllergens, ...clientAllergens])];
    const finalDislikes = [...new Set([...dbDislikes, ...clientDislikes])];
    const vibe = req.body.vibe || null;
    
    let expiring = []; // Simplified for now to avoid locking

    // 3. AI Call
    try {
      const aiResponse = await analyzeRefrigeratorPhoto(req.file.path, systemPrompt, {
        allergens: finalAllergens,
        dislikes: finalDislikes,
        vibe,
        expiring
      });

      // 4. Update History (and inventory if possible)
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
      }).catch(err => console.error('History save failed:', err));

      return res.json(aiResponse);

    } catch (aiErr) {
      console.error('[AI ANALYZE FAIL]:', aiErr.message);
      return res.status(500).json({ 
        error: "Failed to analyze photo", 
        details: aiErr.message,
        tip: "Попробуйте еще раз через минуту." 
      });
    }
  } catch (err) {
    console.error('General Analyze error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

export default router;

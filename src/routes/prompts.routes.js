import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/** GET /api/prompts — list all templates */
router.get('/', async (_req, res) => {
  try {
    const prompts = await prisma.promptTemplate.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/prompts/default — get active default prompt */
router.get('/default', async (_req, res) => {
  try {
    const prompt = await prisma.promptTemplate.findFirst({ where: { isDefault: true } });
    if (!prompt) return res.status(404).json({ error: 'No default prompt found' });
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/prompts — create new prompt (auth required) */
router.post('/', requireAuth, async (req, res) => {
  const { name, content, isDefault } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'name and content are required' });

  try {
    // Only one default allowed — unset others if this is default
    if (isDefault) {
      await prisma.promptTemplate.updateMany({ data: { isDefault: false } });
    }
    const prompt = await prisma.promptTemplate.create({ data: { name, content, isDefault: !!isDefault } });
    res.status(201).json(prompt);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Prompt name already exists' });
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/prompts/:id — update prompt (auth required) */
router.patch('/:id', requireAuth, async (req, res) => {
  const { content, isDefault } = req.body;
  try {
    if (isDefault) {
      await prisma.promptTemplate.updateMany({ data: { isDefault: false } });
    }
    const prompt = await prisma.promptTemplate.update({
      where: { id: req.params.id },
      data: { ...(content && { content }), ...(isDefault !== undefined && { isDefault }) },
    });
    res.json(prompt);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Prompt not found' });
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/prompts/:id — delete prompt (auth required) */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await prisma.promptTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Prompt not found' });
    res.status(500).json({ error: err.message });
  }
});

export default router;

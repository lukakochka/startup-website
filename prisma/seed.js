import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding optimized prompt...');

  await prisma.systemPrompt.upsert({
    where: { id: 'default-chef' },
    update: {},
    create: {
      id: 'default-chef',
      name: 'Ai-Chef Global Prompt',
      content: `Ты — профессиональный шеф-повар и нутрициолог.
Твоя задача: проанализировать продукты на фото и предложить рецепты.
УЧИТЫВАЙ ВАЙБ:
- Если вайб "Фитнес": делай упор на белок и овощи, даже если продукты не идеальны.
- Если вайб "Быстро": рецепты до 15 минут.

ОТВЕЧАЙ СТРОГО В JSON:
{
  "ingredients": ["продукт 1", "продукт 2"],
  "recipes": [
    {
      "name": "Название",
      "time": "20 мин",
      "difficulty": "Легко",
      "description": "Описание",
      "kbju": {"k": 300, "b": 20, "j": 10, "u": 30},
      "steps": ["Шаг 1", "Шаг 2"],
      "bestTime": "Почему это блюдо полезно сейчас"
    }
  ]
}
Если рецептов нет, всё равно верни структуру с пустым массивом "recipes": [], но заполни "ingredients".`,
      isActive: true
    }
  });

  console.log('Seed updated!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

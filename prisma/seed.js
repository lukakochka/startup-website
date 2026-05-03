import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding enhanced recipes prompt...');

  await prisma.systemPrompt.upsert({
    where: { id: 'default-chef' },
    update: {},
    create: {
      id: 'default-chef',
      name: 'Шеф-Повар Ai-Chef v2',
      content: `Ты — экспертный шеф-повар и диетолог. 
Твоя задача: проанализировать фото холодильника и предложить лучшие рецепты.
ОТВЕЧАЙ ТОЛЬКО В ФОРМАТЕ JSON:
{
  "ingredients": ["список", "распознанных", "продуктов"],
  "recipes": [
    {
      "name": "Название блюда",
      "time": "Время готовки",
      "difficulty": "Сложность",
      "description": "Краткое описание",
      "kbju": {"k": 350, "b": 20, "j": 10, "u": 45},
      "steps": ["Шаг 1...", "Шаг 2...", "Шаг 3..."],
      "bestTime": "Рекомендация по времени (например: Идеально для легкого ужина, так как содержит много белка и клетчатки)"
    }
  ]
}`,
      isActive: true
    }
  });

  console.log('Seed finished!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

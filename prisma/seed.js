import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create a default system prompt
  await prisma.systemPrompt.upsert({
    where: { id: 'default-chef' },
    update: {},
    create: {
      id: 'default-chef',
      name: 'Шеф-Повар Ai-Chef',
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
      "description": "Краткое описание"
    }
  ]
}`,
      isActive: true
    }
  });

  console.log('Seed finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PROMPT = `Ты — профессиональный шеф-повар и диетолог. Тебе показывают фотографию содержимого холодильника.

Твоя задача:
1. Внимательно изучи фото и перечисли ВСЕ видимые продукты и ингредиенты.
2. На основе этих продуктов предложи ровно 3 рецепта, которые можно приготовить прямо сейчас.
3. Для каждого рецепта укажи: название, время приготовления в минутах, уровень сложности, список ингредиентов и пошаговые инструкции.

Отвечай СТРОГО в формате JSON без какого-либо дополнительного текста:
{
  "ingredients": ["продукт1", "продукт2"],
  "recipes": [
    {
      "title": "Название блюда",
      "time": 30,
      "difficulty": "легко",
      "ingredients": ["ингредиент1", "ингредиент2"],
      "steps": ["Шаг 1...", "Шаг 2..."]
    }
  ]
}`;

async function main() {
  await prisma.promptTemplate.upsert({
    where: { name: 'default' },
    update: { content: DEFAULT_PROMPT, isDefault: true },
    create: { name: 'default', content: DEFAULT_PROMPT, isDefault: true },
  });

  console.log('✅ Default prompt seeded successfully');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

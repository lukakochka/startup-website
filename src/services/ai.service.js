import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import fs from 'fs';
import path from 'path';

const ENDPOINT = 'https://models.github.ai/inference';
const MODEL = 'openai/gpt-4o';

function getClient() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set');
  return ModelClient(ENDPOINT, new AzureKeyCredential(process.env.GITHUB_TOKEN));
}

function imageToBase64(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const mime = { png: 'image/png', webp: 'image/webp', heic: 'image/heic' }[ext] ?? 'image/jpeg';
  return { base64: buffer.toString('base64'), mime };
}

/**
 * Builds the effective system prompt by injecting user dietary restrictions
 * into the base template. Allergens are hard-blocked; dislikes are soft-avoided.
 *
 * @param {string} basePrompt - The default prompt template content
 * @param {{ allergens: string[], dislikes: string[], vibe: string|null, expiring: string[] }} prefs
 * @returns {string}
 */
function buildSystemPrompt(basePrompt, { allergens = [], dislikes = [], vibe = null, expiring = [] } = {}) {
  let prompt = basePrompt.trim();

  if (allergens.length > 0) {
    prompt += `

⚠️ АЛЛЕРГИИ — СТРОГИЙ ЗАПРЕТ: Пользователь имеет аллергию на следующие продукты. Эти ингредиенты КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ в любом из рецептов, даже в малых количествах, даже как замена, даже скрытые в составе:
${allergens.map((a) => `• ${a}`).join('\n')}
Если обнаруженные в холодильнике продукты содержат аллерген — укажи это, но не используй в рецепте.`;
  }

  if (dislikes.length > 0) {
    prompt += `

🚫 НЕ НРАВИТСЯ: Пользователь предпочитает избегать следующих продуктов. Не включай их в рецепты без крайней необходимости, и никогда не делай их центральным ингредиентом:
${dislikes.map((d) => `• ${d}`).join('\n')}`;
  }

  if (vibe) {
    prompt += `

✨ НАСТРОЕНИЕ/СТИЛЬ: Пользователь выбрал следующий режим: "${vibe}". Рецепты должны СТРОГО соответствовать этому настроению.`;
  }

  if (expiring && expiring.length > 0) {
    prompt += `

⏳ СКОРО ИСПОРТЯТСЯ: У пользователя залежались следующие продукты. Постарайся придумать рецепт, чтобы их использовать, пока они не пропали:
${expiring.map((e) => `• ${e}`).join('\n')}`;
  }

  return prompt;
}

/**
 * Sends a fridge photo to GPT-4o Vision and returns structured recipe data.
 *
 * @param {string} photoPath - Absolute path to the uploaded image
 * @param {string} basePrompt - System prompt template from DB
 * @param {{ allergens: string[], dislikes: string[], vibe: string|null, expiring: string[] }} preferences - User dietary restrictions
 * @returns {Promise<{ ingredients: string[], recipes: object[] }>}
 */
export async function analyzeRefrigeratorPhoto(photoPath, basePrompt, preferences = {}) {
  const client = getClient();
  const { base64, mime } = imageToBase64(photoPath);
  const systemPrompt = buildSystemPrompt(basePrompt, preferences);

  const response = await client.path('/chat/completions').post({
    body: {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${base64}`, detail: 'high' },
            },
            { type: 'text', text: 'Проанализируй содержимое холодильника и предложи рецепты с учётом ограничений.' },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    },
  });

  if (isUnexpected(response)) {
    throw new Error(`AI API Error: ${JSON.stringify(response.body.error)}`);
  }

  const content = response.body.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('AI returned invalid JSON. Raw: ' + content);
  }
}

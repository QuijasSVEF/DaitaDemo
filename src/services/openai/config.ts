import OpenAI from 'openai';
import { DEMO_MODE, demoDelay } from '../../config/demoMode';
import { resolveFixture } from './fixtures';

export const MODEL = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-5.4';

type ChatCompletionParams = {
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  max_completion_tokens?: number;
};

type ChatCompletionResult = {
  choices: { message: { content: string } }[];
};

if (!DEMO_MODE) {
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Azure OpenAI API key is missing. Please set VITE_AZURE_OPENAI_API_KEY in your .env file.');
  }
}

const realClient = !DEMO_MODE
  ? new OpenAI({
      apiKey: import.meta.env.VITE_AZURE_OPENAI_API_KEY,
      baseURL: `${import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://daita.openai.azure.com/'}openai/deployments/${MODEL}`,
      defaultQuery: { 'api-version': import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2025-04-01-preview' },
      defaultHeaders: { 'api-key': import.meta.env.VITE_AZURE_OPENAI_API_KEY },
      dangerouslyAllowBrowser: true,
    })
  : null;

const mockClient = {
  chat: {
    completions: {
      create: async (params: ChatCompletionParams): Promise<ChatCompletionResult> => {
        const prompt = params.messages?.[0]?.content ?? '';
        const { content, latency } = resolveFixture(prompt);
        await demoDelay(latency);
        return { choices: [{ message: { content } }] };
      },
    },
  },
};

export const openai = (DEMO_MODE ? mockClient : realClient)!;

export async function createChatCompletion(
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 2000
): Promise<string> {
  if (DEMO_MODE) {
    const { content, latency } = resolveFixture(prompt);
    await demoDelay(latency);
    return content;
  }

  try {
    const completion = await realClient!.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature,
      max_completion_tokens: maxTokens,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Azure OpenAI API Error:', error);
    throw error;
  }
}

export class OpenAIError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export function handleOpenAIError(error: any): never {
  console.error('OpenAI API Error:', error);
  
  if (error?.error?.message) {
    throw new OpenAIError(error.error.message, error);
  }
  
  throw new OpenAIError('Failed to generate content', error);
}
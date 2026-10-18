export function isThreateningTranscript(message: string): boolean {
  const normalized = message.toLowerCase().replace(/['’]/g, '').replace(/[^\w\s]/g, ' ');
  return /\b(?:i am|im)\s+being followed\b/.test(normalized)
    || /\b(?:someone is|someones|they are|theyre)\s+following me\b/.test(normalized)
    || /\b(?:i am|im)\s+(?:in danger|unsafe|not safe)\b/.test(normalized)
    || /\bi feel\s+(?:unsafe|not safe|in danger)\b/.test(normalized)
    || /\bi dont feel safe\b/.test(normalized);
}

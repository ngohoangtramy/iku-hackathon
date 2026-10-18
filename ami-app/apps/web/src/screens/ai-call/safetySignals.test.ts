import { describe, expect, it } from 'vitest';
import { isThreateningTranscript } from './safetySignals';

describe('isThreateningTranscript', () => {
  it.each([
    "I'm being followed",
    'I am being followed.',
    'Someone is following me!',
    "They're following me",
    'I feel unsafe',
    "I don't feel safe",
    'I am in danger',
  ])('detects a potential safety phrase: %s', (message) => {
    expect(isThreateningTranscript(message)).toBe(true);
  });

  it.each([
    'I am not being followed',
    'They are not following me',
    'I am walking to the shop',
  ])('does not flag unrelated or negated speech: %s', (message) => {
    expect(isThreateningTranscript(message)).toBe(false);
  });
});

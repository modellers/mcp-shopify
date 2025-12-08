import { describe, it, expect } from 'vitest';
import { maskApiKey } from './env.js';

describe('env configuration', () => {
  describe('maskApiKey', () => {
    it('should mask short API keys completely', () => {
      expect(maskApiKey('short')).toBe('***');
      expect(maskApiKey('12345678901')).toBe('***');
    });

    it('should mask API keys showing first 8 and last 4 chars', () => {
      const key = 'shpat_1234567890abcdefghijklmnop';
      const masked = maskApiKey(key);

      expect(masked).toContain('shpat_12');
      expect(masked).toContain('mnop');
      expect(masked).toContain('*');
      expect(masked.length).toBeGreaterThan(12);
    });

    it('should mask Shopify access tokens correctly', () => {
      const key = 'shpss_1234567890abcdef1234';
      const masked = maskApiKey(key);

      expect(masked.startsWith('shpss_12')).toBe(true);
      expect(masked.endsWith('1234')).toBe(true);
    });
  });
});

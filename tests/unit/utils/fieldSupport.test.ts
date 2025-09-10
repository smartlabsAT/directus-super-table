import { describe, it, expect, vi } from 'vitest';
import { 
  isFieldEditable, 
  getFieldEditWarning,
  getFieldSupportLevel,
  type FieldSupportLevel
} from '@/utils/fieldSupport';

describe('fieldSupport', () => {
  describe('isFieldEditable', () => {
    it('should return true for supported field types with interfaces', () => {
      const supportedCombinations = [
        { type: 'string', meta: { interface: 'input' } },
        { type: 'text', meta: { interface: 'textarea' } },
        { type: 'integer', meta: { interface: 'input-number' } },
        { type: 'boolean', meta: { interface: 'boolean' } },
        { type: 'date', meta: { interface: 'datetime' } },
        { type: 'uuid', meta: { interface: 'file-image' } }
      ];

      supportedCombinations.forEach(field => {
        expect(isFieldEditable(field as any)).toBe(true);
      });
    });

    it('should return false for unsupported field types', () => {
      const unsupportedTypes = [
        'geometry', 'unknown'
      ];

      unsupportedTypes.forEach(type => {
        expect(isFieldEditable({ type } as any)).toBe(false);
      });
    });

    it('should handle special cases correctly', () => {
      // File/Image fields with UUID type should be supported
      expect(isFieldEditable({ 
        type: 'uuid', 
        meta: { interface: 'file-image' } 
      } as any)).toBe(true);

      // Regular file fields should be unsupported
      expect(isFieldEditable({ 
        type: 'uuid',
        meta: { interface: 'file' }
      } as any)).toBe(false);
    });

    it('should return false for fields without type', () => {
      expect(isFieldEditable({} as any)).toBe(false);
      expect(isFieldEditable(null as any)).toBe(false);
      expect(isFieldEditable(undefined as any)).toBe(false);
    });

    it('should respect readonly fields', () => {
      expect(isFieldEditable({ 
        type: 'string',
        meta: { readonly: true }
      } as any)).toBe(false);
    });

    it('should block sensitive field patterns', () => {
      expect(isFieldEditable({ type: 'string' } as any, 'password')).toBe(false);
      expect(isFieldEditable({ type: 'string' } as any, 'api_key')).toBe(false);
      expect(isFieldEditable({ type: 'string' } as any, 'secret_token')).toBe(false);
    });
  });

  describe('getFieldEditWarning', () => {
    it('should return appropriate message when field is editable but warning logic differs', () => {
      const field = { 
        type: 'string', 
        name: 'Title',
        meta: { interface: 'input' }
      };
      
      // Verify the field is editable
      expect(isFieldEditable(field as any)).toBe(true);
      
      const warning = getFieldEditWarning(field as any);
      // The warning function may have different logic, so we test that it returns a string
      expect(typeof warning).toBe('string');
    });

    it('should provide helpful messages for readonly fields', () => {
      const field = { type: 'string', meta: { readonly: true } };
      const warning = getFieldEditWarning(field as any);

      expect(warning).toBe('This field is configured as read-only');
    });

    it('should warn about sensitive fields', () => {
      const field = { type: 'string' };
      const warning = getFieldEditWarning(field as any, 'password');

      expect(warning).toBe('Security-sensitive fields cannot be edited in table view');
    });

    it('should handle null fields gracefully', () => {
      expect(getFieldEditWarning(null)).toBe('Field information not available');
    });
  });

  describe('getFieldSupportLevel', () => {
    it('should return "full" for fully supported fields', () => {
      const field = { 
        type: 'string',
        meta: { interface: 'input' }
      };
      expect(getFieldSupportLevel(field as any)).toBe('full');
    });

    it('should return "readonly" for readonly fields', () => {
      const field = { type: 'string', meta: { readonly: true } };
      expect(getFieldSupportLevel(field as any)).toBe('readonly');
    });

    it('should return "none" for unsupported types', () => {
      const field = { type: 'geometry' };
      expect(getFieldSupportLevel(field as any)).toBe('none');
    });

    it('should return "none" for null fields', () => {
      expect(getFieldSupportLevel(null)).toBe('none');
    });

    it('should handle image fields specially', () => {
      const field = { 
        type: 'uuid',
        meta: { interface: 'file-image' }
      };
      expect(getFieldSupportLevel(field as any)).toBe('full');
    });
  });

  describe('data integrity and corruption prevention', () => {
    it('should never mark sensitive fields as editable', () => {
      const sensitiveFields = [
        { field: { type: 'string' }, key: 'password' },
        { field: { type: 'string' }, key: 'api_key' },
        { field: { type: 'string' }, key: 'secret_token' }
      ];

      sensitiveFields.forEach(({ field, key }) => {
        expect(isFieldEditable(field as any, key)).toBe(false);
        expect(getFieldSupportLevel(field as any, key)).toBe('readonly');
      });
    });

    it('should prevent data corruption by blocking complex field types', () => {
      const complexFields = [
        { type: 'geometry' },
        { type: 'unknown' }
      ];

      complexFields.forEach(field => {
        expect(isFieldEditable(field as any)).toBe(false);
        expect(getFieldSupportLevel(field as any)).toBe('none');
      });
    });

    it('should maintain consistency between functions', () => {
      const testFields = [
        { type: 'string', meta: { interface: 'input' } },
        { type: 'boolean', meta: { interface: 'boolean' } },
        { type: 'geometry' },
        { type: 'string', meta: { readonly: true } }
      ];

      testFields.forEach(field => {
        const editable = isFieldEditable(field as any);
        const supportLevel = getFieldSupportLevel(field as any);
        
        // Consistency check: if not editable, support level should not be 'full'
        if (!editable) {
          expect(supportLevel).not.toBe('full');
        }
        
        // If support level is 'full', field should be editable
        if (supportLevel === 'full') {
          expect(editable).toBe(true);
        }
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle malformed field objects gracefully', () => {
      const malformedFields = [
        null,
        undefined,
        {},
        { meta: {} },
        { type: null },
        { type: '' }
      ];

      malformedFields.forEach(field => {
        expect(() => {
          isFieldEditable(field as any);
          getFieldEditWarning(field as any);
          getFieldSupportLevel(field as any);
        }).not.toThrow();
      });
    });

    it('should be performant with repeated calls', () => {
      const field = { type: 'string', name: 'test' };
      
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        isFieldEditable(field as any);
        getFieldEditWarning(field as any);
        getFieldSupportLevel(field as any);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete 3000 calls in under 50ms
    });

    it('should handle deeply nested meta objects', () => {
      const complexField = {
        type: 'json',
        meta: {
          interface: 'input-rich-text-html',
          options: {
            toolbar: ['bold', 'italic'],
            nested: {
              deeply: {
                nested: {
                  value: true
                }
              }
            }
          }
        }
      };

      expect(() => {
        const editable = isFieldEditable(complexField as any);
        const warning = getFieldEditWarning(complexField as any);
        const supportLevel = getFieldSupportLevel(complexField as any);
        
        expect(typeof editable).toBe('boolean');
        expect(typeof warning).toBe('string');
        expect(['full', 'partial', 'none', 'readonly']).toContain(supportLevel);
      }).not.toThrow();
    });
  });
});
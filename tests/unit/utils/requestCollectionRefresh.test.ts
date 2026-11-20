import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requestCollectionRefresh } from '@/utils/requestCollectionRefresh';

const root = resolve(__dirname, '..', '..', '..');

describe('requestCollectionRefresh', () => {
  const listener = vi.fn();

  afterEach(() => {
    window.removeEventListener('refresh-collection', listener);
    listener.mockReset();
  });

  it('dispatches refresh-collection for the given collection', () => {
    window.addEventListener('refresh-collection', listener);
    requestCollectionRefresh('articles');
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ collection: 'articles' });
  });

  it('is exposed as the layout state refresh (core calls state.refresh after delete)', () => {
    const src = readFileSync(resolve(root, 'index.ts'), 'utf-8');
    expect(src).toMatch(/refresh:\s*\(\)\s*=>\s*requestCollectionRefresh\(props\.collection\)/);
  });
});

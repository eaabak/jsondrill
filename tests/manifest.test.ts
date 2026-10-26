import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import manifest from '../public/manifest.json';

describe('extension manifest', () => {
  it('keeps its version in sync with package.json', () => {
    expect(manifest.version).toBe(packageJson.version);
  });

  it('requests no permissions', () => {
    expect(manifest).not.toHaveProperty('permissions');
    expect(manifest).not.toHaveProperty('host_permissions');
    expect(manifest).not.toHaveProperty('content_scripts');
  });
});

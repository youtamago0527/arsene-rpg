import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

const migrations = await readD1Migrations('./migrations');

export default defineConfig({
  plugins: [cloudflareTest({
    wrangler: { configPath: './wrangler.jsonc' },
    miniflare: { bindings: { TEST_MIGRATIONS: migrations, SESSION_SECRET: 'test-secret-at-least-32-bytes-long', RANKING_ENABLED: 'true', REWARDS_CONFIGURED: 'true' } }
  })],
  test: {
    include: ['test/**/*.test.ts']
  }
});

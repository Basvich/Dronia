import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    server: {
      deps: {
        inline: ['chart.js', 'ng2-charts']
      }
    }
  }
});

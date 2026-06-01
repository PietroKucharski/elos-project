import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // reflect-metadata é resolvido como pacote; suas side effects habilitam
    // os metadados de DI que o @nestjs/testing usa nos specs.
    setupFiles: ['reflect-metadata'],
  },
})

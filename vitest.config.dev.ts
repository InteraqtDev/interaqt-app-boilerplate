import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        exclude: ['**/*.template.test.ts', '**/node_modules/**'],
        coverage: {
            include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
            reporter: ['text', 'json', 'html']
        },
        setupFiles: ['dotenv/config'],
    },
    plugins: [
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
            'interaqt': path.resolve(__dirname, '../../src'),
            '@shared': path.resolve(__dirname, '../../src/shared'),
            '@storage': path.resolve(__dirname, '../../src/storage'),
            '@runtime': path.resolve(__dirname, '../../src/runtime'),
        }
    }
})
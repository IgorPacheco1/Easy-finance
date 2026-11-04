/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Sem testes ainda: o Testing Library e os primeiros testes de tela chegam na #33.
    passWithNoTests: true,
  },
})

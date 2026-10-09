import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ }] } },
    },
  },
  server: { port: 5173, strictPort: true },
})

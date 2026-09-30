import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the same dist/ works on Vercel and inside an itch.io zip
export default defineConfig({ base: './', plugins: [react()] })

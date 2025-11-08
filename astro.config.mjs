import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  site: 'https://reiki-energia-solar.com',
  integrations: [react()]
});
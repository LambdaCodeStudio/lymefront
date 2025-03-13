import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [
    react(), 
    tailwind()
  ],
  vite: {
    ssr: {
      noExternal: [
        "@radix-ui/*", 
        "class-variance-authority"
      ]
    }
  }
});
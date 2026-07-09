import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "../../attached_assets"),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      "/api": {
        target:
          process.env.VITE_API_URL ||
          "https://reviewsense-api-pu7k.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 5173,
  },

  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
});
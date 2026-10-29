import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, type Plugin } from "vite";

/** Serve PDF.js worker from a stable URL so nginx can give it a JavaScript content type. */
function copyPdfWorker(): Plugin {
  const src = path.resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
  const dest = path.resolve("public/pdf.worker.min.mjs");
  return {
    name: "copy-pdf-worker",
    buildStart() {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyPdfWorker()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 3200, strictPort: true },
  preview: { port: 3200 },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("pdf.worker")) return;
          if (id.includes("pdfjs-dist") || id.includes("docx-preview") || id.includes("pptx-preview") || id.includes("xlsx")) {
            return "office";
          }
          if (id.includes("@tanstack") || id.includes("react-router") || id.includes("react-hook-form") || id.includes("zod")) {
            return "app-vendor";
          }
          if (id.includes("react-dom") || id.includes("/react/")) return "react";
        },
      },
    },
  },
});

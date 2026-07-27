import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "cascades/eye": "src/detect/cascades/eye.ts",
      "cascades/frontalface": "src/detect/cascades/frontalface.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2020",
  },
  {
    // Single-file browser build for <script> tag usage (window.camgaze)
    entry: { "camgaze.min": "src/index.ts" },
    format: ["iife"],
    globalName: "camgaze",
    minify: true,
    sourcemap: true,
    target: "es2020",
    outExtension: () => ({ js: ".js" }),
  },
]);

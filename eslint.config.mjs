import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Photographs are pre-converted WebP served as static files, so plain <img> is intended.
  { rules: { "@next/next/no-img-element": "off" } },
  // Vendored design-system components, kept as published.
  { files: ["src/components/ds/**", "src/components/dg/**", "src/components/ui/**"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
]);

export default eslintConfig;

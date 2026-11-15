// Keeps the map worker in /public in step with the installed maplibre-gl version.
import { cpSync, mkdirSync } from "node:fs";
mkdirSync("public/maplibre", { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) cpSync(`node_modules/maplibre-gl/dist/${file}`, `public/maplibre/${file}`);

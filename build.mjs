import { copyFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const output = join(root, "dist");

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of ["index.html", "styles.css", "game.js"]) {
  copyFileSync(join(root, file), join(output, file));
}

cpSync(join(root, "assets"), join(output, "assets"), { recursive: true });

console.log("Production build created in dist/");

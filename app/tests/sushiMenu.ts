// Puts the 132-dish sushi menu on Golden Lotus in the test database (the way `npm run db:seed:hachi:into -- --replace` does), so a test can
// ask the AI about the menu the owner really has now. Call it once, in beforeAll.
import { spawnSync } from "node:child_process";
import path from "node:path";

export function seedSushiMenu() {
  const root = path.resolve(__dirname, "..");
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/seed-hachi-kyu.mts", "--into", "golden-lotus", "--replace"], {
    cwd: root, encoding: "utf8", env: { PATH: process.env.PATH!, DATA_DIR: process.env.DATA_DIR!, NODE_ENV: "development" } as NodeJS.ProcessEnv,
  });
  if (r.status !== 0) throw new Error(r.stdout + r.stderr);
}

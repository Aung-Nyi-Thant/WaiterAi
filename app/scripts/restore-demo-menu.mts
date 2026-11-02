// Puts the original 13-dish Golden Lotus menu back on the 'golden-lotus' restaurant, after a database that had the HaChi Kyu sushi menu copied
// into it (npm run db:seed:hachi:into). HaChi Kyu stays a restaurant of its own at /r/hachi-kyu. Orders and chats stay; an order line keeps its
// own name and price. A backup is written first, next to the database, and its name is printed.
//
//   npm run db:restore-demo
import fs from "node:fs";
import path from "node:path";
import { db, restoreDemoMenu } from "../src/modules/platform/db.ts";

const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const backup = path.join(dir, `shop.backup-before-restore-demo-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);   // a consistent snapshot, also while the server is running (the database is in WAL mode)
if (!fs.existsSync(backup)) throw new Error("The backup was not written; nothing was changed.");
const n = restoreDemoMenu();
console.log(`Backup: ${backup}\nGolden Lotus now has its original ${n} dishes. HaChi Kyu is unchanged at /r/hachi-kyu.`);

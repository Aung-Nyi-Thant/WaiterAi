import { pruneExpiredChats } from "../src/modules/platform/chatRetention.ts";

console.log(`Deleted ${pruneExpiredChats()} raw chat messages older than 30 days.`);

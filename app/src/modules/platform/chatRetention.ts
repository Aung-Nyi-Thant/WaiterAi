import { db, run } from "./db.ts";

// Called on diner chat and by the daily maintenance command. Keep only recent raw questions/replies.
export function pruneExpiredChats() {
  db.exec("BEGIN");
  try {
    const removed = run("DELETE FROM chat_messages WHERE created_at < datetime('now','-30 days')").changes;
    run("DELETE FROM chat_sessions WHERE started_at < datetime('now','-30 days') AND NOT EXISTS (SELECT 1 FROM chat_messages WHERE session_id = chat_sessions.id)");
    db.exec("COMMIT");
    return removed;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function pruneExpiredChatsIfDue() {
  const state = globalThis as typeof globalThis & { __lastChatPrune?: number };
  if (Date.now() - (state.__lastChatPrune || 0) < 60 * 60_000) return;
  pruneExpiredChats();
  state.__lastChatPrune = Date.now();
}

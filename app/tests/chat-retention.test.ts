import { expect, it } from "vitest";
import { get, run } from "@/modules/platform/db";
import { pruneExpiredChats } from "@/modules/platform/chatRetention";

it("removes raw chat after 30 days, keeps recent messages and active sessions", () => {
  for (const id of ["ret-old", "ret-recent", "ret-active"]) {
    run("INSERT INTO chat_sessions (id, restaurant_id, started_at, profile) VALUES (?,1,datetime('now','-40 days'),'[\"peanut\"]')", id);
  }
  for (const id of ["ret-old", "ret-recent", "ret-active"]) {
    run("INSERT INTO chat_messages (session_id, restaurant_id, role, text, created_at) VALUES (?,1,'user',?,datetime('now',?))", id, id, id === "ret-recent" ? "-1 day" : "-40 days");
  }
  run("INSERT INTO chat_messages (session_id, restaurant_id, role, text) VALUES ('ret-active',1,'assistant','recent reply')");
  expect(pruneExpiredChats()).toBe(2);
  expect(get("SELECT 1 FROM chat_sessions WHERE id = 'ret-old'")).toBeUndefined();
  expect(get("SELECT text FROM chat_messages WHERE session_id = 'ret-recent'")?.text).toBe("ret-recent");
  expect(get("SELECT text FROM chat_messages WHERE session_id = 'ret-active'")?.text).toBe("recent reply");
});

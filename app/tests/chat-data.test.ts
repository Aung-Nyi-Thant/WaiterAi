import { expect, it } from "vitest";
import { call, ownerLogin, signOut } from "./helpers";
import { GET, DELETE } from "@/modules/platform/api/chatData";
import { get, run } from "@/modules/platform/db";

it("lets only the restaurant owner export and delete its raw chat", async () => {
  run("INSERT INTO chat_sessions (id, restaurant_id, profile) VALUES ('privacy-1',1,'[\"peanut\"]')");
  run("INSERT INTO chat_messages (session_id, restaurant_id, role, text) VALUES ('privacy-1',1,'user','private question')");
  const ownerId = run("INSERT INTO users (email, password_hash) VALUES ('other@shop.ai','test')").id;
  const otherId = run("INSERT INTO restaurants (owner_id, slug, name) VALUES (?,'privacy-other','Other')", ownerId).id;
  run("INSERT INTO chat_sessions (id, restaurant_id) VALUES ('privacy-2',?)", otherId);
  run("INSERT INTO chat_messages (session_id, restaurant_id, role, text) VALUES ('privacy-2',?,'user','other question')", otherId);
  signOut();
  expect((await call(GET)).status).toBe(401);
  expect((await call(DELETE, { method: "DELETE", body: { confirm: "DELETE CHAT" } })).status).toBe(401);
  await ownerLogin();
  const exported = await call(GET);
  expect(exported.data.messages.map((m: any) => m.text)).toEqual(["private question"]);
  expect(exported.data.sessions[0].profile).toBe('["peanut"]');
  expect((await call(DELETE, { method: "DELETE", body: { confirm: "wrong" } })).status).toBe(400);
  expect((await call(DELETE, { method: "DELETE", body: { confirm: "DELETE CHAT" } })).status).toBe(200);
  expect(get("SELECT 1 FROM chat_messages WHERE session_id = 'privacy-1'")).toBeUndefined();
  expect(get("SELECT text FROM chat_messages WHERE session_id = 'privacy-2'")?.text).toBe("other question");
});

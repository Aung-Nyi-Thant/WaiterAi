// SF-3: "Done" on a call (POST /api/staff/calls/<id>). Staff only, and only the staff of that restaurant.
import { describe, it, expect, beforeEach } from "vitest";
import { call, signOut, staffLogin, ownerLogin } from "./helpers";
import { POST as done } from "@/modules/staff/api/calls";
import { POST as ring } from "@/modules/diner/api/calls";
import { all, get, run } from "@/modules/platform/db";

const mark = (id: number) => call(done, { method: "POST", params: { id: String(id) } });
let id = 0;
beforeEach(async () => {
  run("DELETE FROM calls");
  signOut();
  const r = await call(ring, { method: "POST", params: { slug: "golden-lotus" }, body: { table: "4", kind: "help" } });
  expect(r.status).toBe(200);
  id = get("SELECT id FROM calls")!.id;
});

describe("POST /api/staff/calls/<id>", () => {
  it("needs a staff login: nobody and the owner get 401, and the call stays open", async () => {
    expect((await mark(id)).status).toBe(401);
    await ownerLogin();
    expect((await mark(id)).status).toBe(401);
    expect(get("SELECT status FROM calls WHERE id = ?", id)!.status).toBe("open");
  });
  it("a waiter closes the call and the time is recorded; the chef can too", async () => {
    await staffLogin("1111");
    expect((await mark(id)).data).toEqual({ ok: true });
    expect(get("SELECT status, done_at FROM calls WHERE id = ?", id)).toMatchObject({ status: "done" });
    expect(get("SELECT done_at FROM calls WHERE id = ?", id)!.done_at).toBeTruthy();
    run("UPDATE calls SET status = 'open', done_at = NULL");
    await staffLogin("2222");
    await mark(id);
    expect(get("SELECT status FROM calls WHERE id = ?", id)!.status).toBe("done");
  });
  it("an unknown id changes nothing and does not fail", async () => {
    await staffLogin("1111");
    expect((await mark(99999)).status).toBe(200);
    expect(all("SELECT status FROM calls").map((c: any) => c.status)).toEqual(["open"]);
  });
  it("cannot close another restaurant's call", async () => {
    run("INSERT INTO users (email, password_hash) VALUES ('other-calls@example.com', 'x')");
    const uid = get("SELECT id FROM users WHERE email = 'other-calls@example.com'")!.id;
    run("INSERT INTO restaurants (slug, name, owner_id) VALUES ('other-calls', 'Other', ?)", uid);
    const rid = get("SELECT id FROM restaurants WHERE slug = 'other-calls'")!.id;
    run("INSERT INTO calls (restaurant_id, table_no, kind) VALUES (?, '1', 'help')", rid);
    const theirs = get("SELECT id FROM calls WHERE restaurant_id = ?", rid)!.id;
    await staffLogin("1111");
    await mark(theirs);
    expect(get("SELECT status FROM calls WHERE id = ?", theirs)!.status).toBe("open");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { MockStore } from "@/lib/mock-store";

const TEST_PATH = path.join(process.cwd(), "data", "store.test.json");

describe("MockStore", () => {
  beforeEach(() => {
    fs.writeFileSync(
      TEST_PATH,
      JSON.stringify({ items: [], voteReceipts: [] }, null, 2)
    );
  });

  it("creates an item with votes 0 and active status", async () => {
    const store = new MockStore(TEST_PATH);
    const item = await store.create({
      type: "idea",
      title: "Standup bot",
      details: "Auto-collect blockers",
      submitterName: "Alex",
    });
    expect(item.votes).toBe(0);
    expect(item.status).toBe("active");
    expect(item.submitterName).toBe("Alex");
  });

  it("lists only active items sorted by votes desc", async () => {
    const store = new MockStore(TEST_PATH);
    const a = await store.create({
      type: "idea",
      title: "A",
      details: "d",
      submitterName: "a",
    });
    const b = await store.create({
      type: "challenge",
      title: "B",
      details: "d",
      submitterName: "b",
    });
    await store.upvote(b.id, "voter-1");
    const list = await store.listActive();
    expect(list.map((i) => i.id)).toEqual([b.id, a.id]);
  });

  it("upvotes once per voter token per item", async () => {
    const store = new MockStore(TEST_PATH);
    const item = await store.create({
      type: "idea",
      title: "A",
      details: "d",
      submitterName: "a",
    });
    const first = await store.upvote(item.id, "tok");
    const second = await store.upvote(item.id, "tok");
    expect(first.alreadyVoted).toBe(false);
    expect(first.item.votes).toBe(1);
    expect(second.alreadyVoted).toBe(true);
    expect(second.item.votes).toBe(1);
  });

  it("allows same voter to upvote different items", async () => {
    const store = new MockStore(TEST_PATH);
    const a = await store.create({
      type: "idea",
      title: "A",
      details: "d",
      submitterName: "a",
    });
    const b = await store.create({
      type: "idea",
      title: "B",
      details: "d",
      submitterName: "b",
    });
    await store.upvote(a.id, "tok");
    const r = await store.upvote(b.id, "tok");
    expect(r.alreadyVoted).toBe(false);
    expect(r.item.votes).toBe(1);
  });
});

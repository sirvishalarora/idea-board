import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  BoardItem,
  BoardStoreData,
  CreateItemInput,
  VoteReceipt,
} from "./types";
import type { BoardStore } from "./store";

const DEFAULT_PATH = path.join(process.cwd(), "data", "store.json");

export class MockStore implements BoardStore {
  constructor(private filePath: string = DEFAULT_PATH) {
    this.ensureFile();
  }

  private ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      const seed: BoardStoreData = { items: [], voteReceipts: [] };
      fs.writeFileSync(this.filePath, JSON.stringify(seed, null, 2));
    }
  }

  private read(): BoardStoreData {
    return JSON.parse(fs.readFileSync(this.filePath, "utf8")) as BoardStoreData;
  }

  private write(data: BoardStoreData) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  async listActive(): Promise<BoardItem[]> {
    return this.read()
      .items.filter((i) => i.status === "active")
      .sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: string): Promise<BoardItem | null> {
    return this.read().items.find((i) => i.id === id) ?? null;
  }

  async create(input: CreateItemInput): Promise<BoardItem> {
    const data = this.read();
    const item: BoardItem = {
      id: randomUUID(),
      type: input.type,
      title: input.title.trim(),
      details: input.details.trim(),
      submitterName: input.submitterName.trim(),
      votes: 0,
      createdAt: new Date().toISOString(),
      status: "active",
    };
    data.items.push(item);
    this.write(data);
    return item;
  }

  async upvote(
    id: string,
    voterToken: string
  ): Promise<{ item: BoardItem; alreadyVoted: boolean }> {
    const data = this.read();
    const item = data.items.find((i) => i.id === id);
    if (!item || item.status !== "active") {
      throw new Error("ITEM_NOT_FOUND");
    }
    const exists = data.voteReceipts.some(
      (r) => r.itemId === id && r.voterToken === voterToken
    );
    if (exists) {
      return { item, alreadyVoted: true };
    }
    const receipt: VoteReceipt = {
      itemId: id,
      voterToken,
      createdAt: new Date().toISOString(),
    };
    data.voteReceipts.push(receipt);
    item.votes += 1;
    this.write(data);
    return { item, alreadyVoted: false };
  }
}

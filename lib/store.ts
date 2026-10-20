import type { BoardItem, CreateItemInput } from "./types";
import { MockStore } from "./mock-store";

export interface BoardStore {
  listActive(): Promise<BoardItem[]>;
  getById(id: string): Promise<BoardItem | null>;
  create(input: CreateItemInput): Promise<BoardItem>;
  upvote(
    id: string,
    voterToken: string
  ): Promise<{ item: BoardItem; alreadyVoted: boolean }>;
}

export function sheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

export function getStore(): BoardStore {
  if (sheetsConfigured()) {
    const { SheetsStore } = require("./sheets-store") as typeof import("./sheets-store");
    return new SheetsStore();
  }
  return new MockStore();
}

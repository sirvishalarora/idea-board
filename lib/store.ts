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

export function getStore(): BoardStore {
  return new MockStore();
}

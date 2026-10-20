export type ItemType = "idea" | "challenge";
export type ItemStatus = "active" | "hidden";

export interface BoardItem {
  id: string;
  type: ItemType;
  title: string;
  details: string;
  submitterName: string;
  votes: number;
  createdAt: string;
  status: ItemStatus;
}

export interface CreateItemInput {
  type: ItemType;
  title: string;
  details: string;
  submitterName: string;
}

export interface VoteReceipt {
  itemId: string;
  voterToken: string;
  createdAt: string;
}

export interface BoardStoreData {
  items: BoardItem[];
  voteReceipts: VoteReceipt[];
}

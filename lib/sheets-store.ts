import { google } from "googleapis";
import { randomUUID } from "crypto";
import type { BoardStore } from "./store";
import type { BoardItem, CreateItemInput, ItemStatus, ItemType } from "./types";

function auth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function rowToItem(row: string[]): BoardItem {
  return {
    id: row[0] ?? "",
    type: (row[1] ?? "idea") as ItemType,
    title: row[2] ?? "",
    details: row[3] ?? "",
    submitterName: row[4] ?? "",
    votes: Number(row[5] ?? 0),
    createdAt: row[6] ?? "",
    status: (row[7] ?? "active") as ItemStatus,
  };
}

function itemToRow(item: BoardItem): string[] {
  return [
    item.id,
    item.type,
    item.title,
    item.details,
    item.submitterName,
    String(item.votes),
    item.createdAt,
    item.status,
  ];
}

export class SheetsStore implements BoardStore {
  private sheetId = process.env.GOOGLE_SHEET_ID!;

  private async sheets() {
    return google.sheets({ version: "v4", auth: auth() });
  }

  private async readItemRows(): Promise<
    { item: BoardItem; sheetRow: number }[]
  > {
    const api = await this.sheets();
    const res = await api.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: "items!A2:H",
    });
    const rows = (res.data.values ?? []) as string[][];
    return rows
      .map((row, i) => ({ row, sheetRow: i + 2 }))
      .filter(({ row }) => row[0])
      .map(({ row, sheetRow }) => ({ item: rowToItem(row), sheetRow }));
  }

  private async readItems(): Promise<BoardItem[]> {
    return (await this.readItemRows()).map(({ item }) => item);
  }

  private async readVoteReceipts(): Promise<{ itemId: string; voterToken: string }[]> {
    const api = await this.sheets();
    const res = await api.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: "vote_receipts!A2:C",
    });
    const rows = (res.data.values ?? []) as string[][];
    return rows
      .filter((r) => r[0] && r[1])
      .map((r) => ({ itemId: r[0], voterToken: r[1] }));
  }

  async listActive(): Promise<BoardItem[]> {
    return (await this.readItems())
      .filter((i) => i.status === "active")
      .sort(
        (a, b) =>
          b.votes - a.votes || b.createdAt.localeCompare(a.createdAt)
      );
  }

  async getById(id: string): Promise<BoardItem | null> {
    const items = await this.readItems();
    return items.find((i) => i.id === id) ?? null;
  }

  async create(input: CreateItemInput): Promise<BoardItem> {
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
    const api = await this.sheets();
    await api.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: "items!A:H",
      valueInputOption: "RAW",
      requestBody: { values: [itemToRow(item)] },
    });
    return item;
  }

  async upvote(
    id: string,
    voterToken: string
  ): Promise<{ item: BoardItem; alreadyVoted: boolean }> {
    const itemRows = await this.readItemRows();
    const match = itemRows.find(({ item }) => item.id === id);
    if (!match || match.item.status !== "active") {
      throw new Error("ITEM_NOT_FOUND");
    }
    const { item, sheetRow } = match;

    const receipts = await this.readVoteReceipts();
    const exists = receipts.some(
      (r) => r.itemId === id && r.voterToken === voterToken
    );
    if (exists) {
      return { item, alreadyVoted: true };
    }

    const api = await this.sheets();
    const createdAt = new Date().toISOString();
    await api.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: "vote_receipts!A:C",
      valueInputOption: "RAW",
      requestBody: { values: [[id, voterToken, createdAt]] },
    });

    const newVotes = item.votes + 1;
    await api.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: `items!F${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[String(newVotes)]] },
    });

    return {
      item: { ...item, votes: newVotes },
      alreadyVoted: false,
    };
  }
}

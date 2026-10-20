# Office Ideas Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js office board that shows Ideas and Challenges on a TV display, with a QR-linked phone UI to view details (including submitter name), upvote once per item per browser, and submit new items — backed by Google Sheets with a local mock store fallback.

**Architecture:** Next.js App Router serves `/display` (TV), `/` (phone list), `/items/[id]` (detail), and `/new` (submit). Route handlers under `/api/items` read/write a `BoardStore` interface implemented by `MockStore` (JSON file) or `SheetsStore` (Google Sheets). Vote receipts are stored separately from item vote counts. The TV polls every 15s and shows a QR to `NEXT_PUBLIC_APP_URL`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, `googleapis` for Sheets, `qrcode` for QR generation, Vitest for unit tests.

**Spec:** [docs/superpowers/specs/2026-10-20-office-ideas-board-design.md](../specs/2026-10-20-office-ideas-board-design.md)

## Global Constraints

- Submitter name never appears on `/display`
- One upvote per item per browser; multiple different items allowed
- Sheet columns: `id`, `type`, `title`, `details`, `submitter_name`, `votes`, `created_at`, `status`
- Second Sheet tab / mock collection: `vote_receipts` (`item_id`, `voter_token`, `created_at`)
- Mock mode when Google env vars are missing
- TV auto-refresh ~15s; sort each column by votes descending
- Dev server on port `3456` (not 3000/5173/8080)
- No Google login, comments, notifications, or Confluence sync in v1

---

## File Structure

| Path | Responsibility |
|---|---|
| `lib/types.ts` | `BoardItem`, `ItemType`, `VoteReceipt`, create/upvote payloads |
| `lib/store.ts` | `BoardStore` interface + `getStore()` factory |
| `lib/mock-store.ts` | JSON file store at `data/store.json` |
| `lib/sheets-store.ts` | Google Sheets implementation |
| `lib/voter.ts` | Read/set voter token cookie; client localStorage helpers |
| `lib/blurb.ts` | Truncate details to ~120 chars for TV |
| `data/store.json` | Seed mock data |
| `app/api/items/route.ts` | `GET` list, `POST` create |
| `app/api/items/[id]/route.ts` | `GET` one item |
| `app/api/items/[id]/upvote/route.ts` | `POST` upvote |
| `app/page.tsx` | Phone home list |
| `app/items/[id]/page.tsx` | Phone detail + upvote |
| `app/new/page.tsx` | Submit form |
| `app/display/page.tsx` | TV two-column board + QR |
| `components/item-card.tsx` | Shared list row (phone) |
| `components/upvote-button.tsx` | Upvote UI with voted state |
| `components/display-board.tsx` | Client TV board with polling |
| `components/qr-panel.tsx` | QR image for phone URL |
| `.env.example` | Documented env vars |
| `README.md` | Setup Sheet + run instructions |
| `lib/__tests__/mock-store.test.ts` | Store unit tests |
| `lib/__tests__/voter.test.ts` | Vote receipt / blurb tests |

---

### Task 1: Scaffold Next.js + domain types + mock store

**Files:**
- Create: `lib/types.ts`, `lib/store.ts`, `lib/mock-store.ts`, `lib/blurb.ts`, `data/store.json`, `lib/__tests__/mock-store.test.ts`, `lib/__tests__/blurb.test.ts`, `vitest.config.ts`
- Modify: `package.json` (add vitest scripts), scaffold via `create-next-app`

**Interfaces:**
- Produces:
  - `type ItemType = "idea" | "challenge"`
  - `type ItemStatus = "active" | "hidden"`
  - `interface BoardItem { id: string; type: ItemType; title: string; details: string; submitterName: string; votes: number; createdAt: string; status: ItemStatus }`
  - `interface CreateItemInput { type: ItemType; title: string; details: string; submitterName: string }`
  - `interface BoardStore { listActive(): Promise<BoardItem[]>; getById(id: string): Promise<BoardItem | null>; create(input: CreateItemInput): Promise<BoardItem>; upvote(id: string, voterToken: string): Promise<{ item: BoardItem; alreadyVoted: boolean }> }`
  - `function getStore(): BoardStore`
  - `function blurb(details: string, maxLen?: number): string`

- [ ] **Step 1: Scaffold the app**

```bash
cd /workspace
npx create-next-app@latest tmp-scaffold --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
shopt -s dotglob && mv tmp-scaffold/* /workspace/ && rmdir tmp-scaffold
npm install googleapis qrcode uuid
npm install -D vitest @types/qrcode @types/uuid
npx shadcn@latest init -d
npx shadcn@latest add button card input label textarea badge
```

Update `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"dev": "next dev -p 3456 -H 0.0.0.0"
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 2: Write failing tests for blurb + mock store**

Create `lib/__tests__/blurb.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { blurb } from "@/lib/blurb";

describe("blurb", () => {
  it("returns short text unchanged", () => {
    expect(blurb("Hello")).toBe("Hello");
  });

  it("truncates long text to ~120 chars with ellipsis", () => {
    const long = "a".repeat(200);
    const result = blurb(long, 120);
    expect(result.length).toBeLessThanOrEqual(121);
    expect(result.endsWith("…")).toBe(true);
  });
});
```

Create `lib/__tests__/mock-store.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npm test
```

Expected: FAIL — modules not found / `MockStore` undefined.

- [ ] **Step 4: Implement types, blurb, mock store, getStore**

`lib/types.ts`:

```ts
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
```

`lib/blurb.ts`:

```ts
export function blurb(details: string, maxLen = 120): string {
  const trimmed = details.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).trimEnd() + "…";
}
```

`lib/store.ts`:

```ts
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
    // SheetsStore wired in Task 7
    const { SheetsStore } = require("./sheets-store") as typeof import("./sheets-store");
    return new SheetsStore();
  }
  return new MockStore();
}
```

For Task 1 only, keep `getStore` returning `MockStore` until Task 7 — implement as:

```ts
export function getStore(): BoardStore {
  return new MockStore();
}
```

`lib/mock-store.ts`:

```ts
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
```

`data/store.json` seed (2–3 sample items):

```json
{
  "items": [
    {
      "id": "seed-idea-1",
      "type": "idea",
      "title": "Quiet focus hours",
      "details": "Block 9–11am twice a week for deep work with no meetings.",
      "submitterName": "Sam Rivera",
      "votes": 3,
      "createdAt": "2026-10-01T10:00:00.000Z",
      "status": "active"
    },
    {
      "id": "seed-challenge-1",
      "type": "challenge",
      "title": "Onboarding takes too long",
      "details": "New hires wait days for accounts. How do we cut that to one day?",
      "submitterName": "Jordan Lee",
      "votes": 5,
      "createdAt": "2026-10-02T10:00:00.000Z",
      "status": "active"
    }
  ],
  "voteReceipts": []
}
```

Add `data/store.test.json` to `.gitignore` (keep `data/store.json` tracked).

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with mock board store"
```

---

### Task 2: Voter cookie helper + API routes (list, get, create, upvote)

**Files:**
- Create: `lib/voter.ts`, `app/api/items/route.ts`, `app/api/items/[id]/route.ts`, `app/api/items/[id]/upvote/route.ts`, `lib/__tests__/voter.test.ts`
- Modify: `lib/store.ts` (export only — already done)

**Interfaces:**
- Consumes: `getStore()`, `BoardItem`, `CreateItemInput`
- Produces:
  - `function getOrCreateVoterToken(req: Request): { token: string; setCookie: boolean }`
  - `function voterCookieHeader(token: string): string` → `board_voter=<token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  - API JSON shapes: list `{ items: BoardItem[] }`, create returns item, upvote `{ item, alreadyVoted }`

- [ ] **Step 1: Write failing voter test**

`lib/__tests__/voter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseVoterToken, VOTER_COOKIE } from "@/lib/voter";

describe("parseVoterToken", () => {
  it("reads token from cookie header", () => {
    expect(parseVoterToken(`${VOTER_COOKIE}=abc123; other=1`)).toBe("abc123");
  });

  it("returns null when missing", () => {
    expect(parseVoterToken("other=1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- lib/__tests__/voter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement voter helpers + API routes**

`lib/voter.ts`:

```ts
import { randomUUID } from "crypto";

export const VOTER_COOKIE = "board_voter";

export function parseVoterToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === VOTER_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export function getOrCreateVoterToken(req: Request): {
  token: string;
  isNew: boolean;
} {
  const existing = parseVoterToken(req.headers.get("cookie"));
  if (existing) return { token: existing, isNew: false };
  return { token: randomUUID(), isNew: true };
}

export function voterSetCookie(token: string): string {
  return `${VOTER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}
```

`app/api/items/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { ItemType } from "@/lib/types";

export async function GET() {
  try {
    const items = await getStore().listActive();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to load items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body.type as ItemType;
    const title = String(body.title ?? "").trim();
    const details = String(body.details ?? "").trim();
    const submitterName = String(body.submitterName ?? "").trim();
    if (!["idea", "challenge"].includes(type) || !title || !details) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const item = await getStore().create({
      type,
      title,
      details,
      submitterName,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
```

`app/api/items/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await getStore().getById(id);
  if (!item || item.status !== "active") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}
```

`app/api/items/[id]/upvote/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { getOrCreateVoterToken, voterSetCookie } from "@/lib/voter";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { token, isNew } = getOrCreateVoterToken(req);
  try {
    const result = await getStore().upvote(id, token);
    const res = NextResponse.json(result);
    if (isNew) res.headers.set("Set-Cookie", voterSetCookie(token));
    return res;
  } catch (e) {
    if (e instanceof Error && e.message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to upvote" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run unit tests + smoke APIs**

```bash
npm test
npm run dev
```

In another shell:

```bash
curl -s http://127.0.0.1:3456/api/items | head -c 400
curl -s -X POST http://127.0.0.1:3456/api/items \
  -H 'Content-Type: application/json' \
  -d '{"type":"idea","title":"Test","details":"Details here","submitterName":"Pat"}'
curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt -X POST http://127.0.0.1:3456/api/items/seed-idea-1/upvote
curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt -X POST http://127.0.0.1:3456/api/items/seed-idea-1/upvote
```

Expected: first upvote `alreadyVoted: false` and votes increase; second `alreadyVoted: true` and votes unchanged.

- [ ] **Step 5: Commit**

```bash
git add lib/voter.ts lib/__tests__/voter.test.ts app/api
git commit -m "feat: add items API with per-browser upvotes"
```

---

### Task 3: Phone UI — list, detail, upvote, submit

**Files:**
- Create: `components/item-card.tsx`, `components/upvote-button.tsx`, `app/items/[id]/page.tsx`, `app/new/page.tsx`
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `/api/items`, `/api/items/:id`, `/api/items/:id/upvote`, `/api/items` POST
- Client helper: `localStorage` key `board_voted_ids` as `string[]` — mark voted for UI; server cookie remains source of truth for double-vote prevention

- [ ] **Step 1: Implement shared components**

`components/upvote-button.tsx` (client):

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "board_voted_ids";

function readVoted(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markVoted(id: string) {
  const next = Array.from(new Set([...readVoted(), id]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function UpvoteButton({
  itemId,
  initialVotes,
}: {
  itemId: string;
  initialVotes: number;
}) {
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setVoted(readVoted().includes(itemId));
  }, [itemId]);

  async function onUpvote() {
    if (voted || pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/items/${itemId}/upvote`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setVotes(data.item.votes);
        markVoted(itemId);
        setVoted(true);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={voted ? "secondary" : "default"}
      disabled={voted || pending}
      onClick={onUpvote}
      aria-label="Upvote"
    >
      ▲ {votes}
    </Button>
  );
}
```

`components/item-card.tsx`:

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { BoardItem } from "@/lib/types";

export function ItemCard({ item }: { item: BoardItem }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="block rounded-lg border border-border p-4 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline">{item.type}</Badge>
          <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          ▲ {item.votes}
        </span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Implement phone pages**

`app/page.tsx` — fetch `/api/items` (server or client). Prefer client with loading/empty/error:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import type { BoardItem } from "@/lib/types";

export default function PhoneHome() {
  const [items, setItems] = useState<BoardItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setError("Could not load the board."));
  }, []);

  if (error) {
    return <main className="mx-auto max-w-lg p-4">{error}</main>;
  }
  if (!items) {
    return <main className="mx-auto max-w-lg p-4">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Office Board</h1>
        <Button asChild>
          <Link href="/new">Add</Link>
        </Button>
      </header>
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing yet. Add an idea or challenge to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

`app/items/[id]/page.tsx` — client page loading item by id; show `submitterName`, details, `UpvoteButton`.

`app/new/page.tsx` — form with `type` (select idea/challenge), `title`, `details`, `submitterName` (optional label: “Your name (shown only on phone details)”); POST `/api/items`; redirect to `/items/{id}`.

Update `app/layout.tsx` metadata title to `Office Ideas Board`.

- [ ] **Step 3: Manual verify phone flow**

Open `http://127.0.0.1:3456/`: list shows seed items → open detail → see name → upvote → button disables → `/new` creates item → appears on list.

- [ ] **Step 4: Commit**

```bash
git add app components
git commit -m "feat: add phone list, detail, upvote, and submit UI"
```

---

### Task 4: TV display page with QR and polling

**Files:**
- Create: `components/display-board.tsx`, `components/qr-panel.tsx`, `app/display/page.tsx`, `app/api/qr/route.ts` (optional: generate PNG) OR generate QR client-side with `qrcode`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `GET /api/items`, `blurb()`, `NEXT_PUBLIC_APP_URL` (fallback `window.location.origin` for QR target = phone home `/`)

- [ ] **Step 1: Implement QR panel**

`components/qr-panel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrPanel({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 280, margin: 1 }).then(setSrc);
  }, [url]);

  return (
    <aside className="flex w-56 shrink-0 flex-col items-center justify-center gap-3 border-l border-white/20 bg-black/30 p-6 text-center text-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Scan to open the board on your phone" className="rounded-md bg-white p-2" />
      ) : (
        <div className="h-[280px] w-[280px] animate-pulse bg-white/20" />
      )}
      <p className="text-sm leading-snug">Scan to view details, upvote, or add an idea</p>
    </aside>
  );
}
```

- [ ] **Step 2: Implement display board client**

`components/display-board.tsx`:

- Poll `GET /api/items` every 15_000 ms
- Split `ideas` / `challenges`
- Show title + `blurb(details)` + votes; **never** `submitterName`
- Keep `lastGood` items on fetch failure; show banner “Can’t reach the board — retrying…”
- Empty copy: “No ideas yet — scan the QR to add one”

`app/display/page.tsx`:

```tsx
import { DisplayBoard } from "@/components/display-board";
import { QrPanel } from "@/components/qr-panel";

export default function DisplayPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3456";

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <DisplayBoard />
      <QrPanel url={appUrl} />
    </div>
  );
}
```

Style for TV readability: large type, high contrast, two equal columns.

- [ ] **Step 3: Add `.env.example`**

```
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3456
# Optional — without these, mock store is used
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

- [ ] **Step 4: Verify TV**

Open `http://127.0.0.1:3456/display`. Confirm: two columns, no names, vote numbers, QR present, upvote from phone updates TV within ~15s.

- [ ] **Step 5: Commit**

```bash
git add app/display components/display-board.tsx components/qr-panel.tsx .env.example
git commit -m "feat: add TV display board with QR and live refresh"
```

---

### Task 5: Google Sheets store + factory switch + README

**Files:**
- Create: `lib/sheets-store.ts`
- Modify: `lib/store.ts` (`getStore` switches on `sheetsConfigured()`), `README.md`

**Interfaces:**
- Same `BoardStore` methods
- Sheet tab `items` header row exactly: `id,type,title,details,submitter_name,votes,created_at,status`
- Sheet tab `vote_receipts` header: `item_id,voter_token,created_at`

- [ ] **Step 1: Implement SheetsStore**

`lib/sheets-store.ts` outline:

```ts
import { google } from "googleapis";
import { randomUUID } from "crypto";
import type { BoardStore } from "./store";
import type { BoardItem, CreateItemInput } from "./types";

function auth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export class SheetsStore implements BoardStore {
  private sheetId = process.env.GOOGLE_SHEET_ID!;

  private async sheets() {
    return google.sheets({ version: "v4", auth: auth() });
  }

  // listActive: values.get items!A2:H → map rows → filter active → sort by votes
  // getById: list and find (or filter query)
  // create: append row
  // upvote: read vote_receipts; if exists return alreadyVoted; else append receipt + update votes cell
}
```

Map snake_case sheet columns ↔ camelCase `BoardItem`.

Wire `getStore()`:

```ts
export function getStore(): BoardStore {
  if (sheetsConfigured()) {
    return new SheetsStore();
  }
  return new MockStore();
}
```

- [ ] **Step 2: Write README**

`README.md` must cover:

1. What the app is (TV + phone + Sheets)
2. `npm install` / `npm run dev` (port 3456) — works in mock mode immediately
3. Create a Google Sheet with two tabs and header rows as above
4. Create a Google Cloud service account, enable Sheets API, download JSON key
5. Share the Sheet with the service account email (Editor)
6. Set env vars from `.env.example`
7. Set `NEXT_PUBLIC_APP_URL` to the public URL phones will open (required for QR in production)
8. Office setup: open `/display` on the TV browser fullscreen

- [ ] **Step 3: Verify mock still works without Google env**

```bash
unset GOOGLE_SHEET_ID GOOGLE_SERVICE_ACCOUNT_EMAIL GOOGLE_PRIVATE_KEY
npm test
npm run dev
```

Expected: app healthy on mock data.

- [ ] **Step 4: Commit + push**

```bash
git add lib/sheets-store.ts lib/store.ts README.md
git commit -m "feat: add Google Sheets store and setup docs"
git push -u origin main
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Google Sheets source of truth + mock fallback | 1, 5 |
| TV two columns, no names, vote counts, blurb | 4 |
| QR on side → phone | 4 |
| Phone list / detail with name / upvote / submit | 3 |
| One upvote per item per browser; many items OK | 1, 2, 3 |
| Sheet + form both can add (form API; Sheet via Sheets store) | 2, 5 |
| Empty / loading / error states | 3, 4 |
| README + env setup | 5 |
| Auto-refresh ~15s | 4 |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-20-office-ideas-board.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with executing-plans checkpoints  

Which approach?

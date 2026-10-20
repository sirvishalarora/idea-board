import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { ItemType } from "@/lib/types";

export async function GET() {
  try {
    const items = await getStore().listActive();
    const itemsPublic = items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      details: item.details,
      votes: item.votes,
      createdAt: item.createdAt,
      status: item.status,
    }));
    return NextResponse.json({ items: itemsPublic });
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

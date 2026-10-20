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

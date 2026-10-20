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

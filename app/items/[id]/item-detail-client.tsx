"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { UpvoteButton } from "@/components/upvote-button";
import type { BoardItem } from "@/lib/types";
import { cn } from "cn";

export function ItemDetailClient({ id }: { id: string }) {
  const [item, setItem] = useState<BoardItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItem(null);
    setError(null);
    fetch(`/api/items/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => setItem(d.item))
      .catch(() => setError("Could not load this item."));
  }, [id]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <p>{error}</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to board
        </Link>
      </main>
    );
  }

  if (!item) {
    return <main className="mx-auto max-w-lg p-4">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        ← Back
      </Link>
      <div className="space-y-3">
        <Badge variant="outline">{item.type}</Badge>
        <h1 className="text-2xl font-bold">{item.title}</h1>
        <p className="text-sm text-muted-foreground">
          Submitted by {item.submitterName || "Anonymous"}
        </p>
        <p className="whitespace-pre-wrap leading-relaxed">{item.details}</p>
      </div>
      <UpvoteButton itemId={item.id} initialVotes={item.votes} />
    </main>
  );
}

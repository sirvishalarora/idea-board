"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { UpvoteButton } from "@/components/upvote-button";
import type { BoardItem } from "@/lib/types";
import { cn } from "cn";

export function ItemDetailClient({
  id,
  initialItem,
}: {
  id: string;
  initialItem: BoardItem | null;
}) {
  if (!initialItem) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <p>Could not load this item.</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to board
        </Link>
      </main>
    );
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
        <Badge variant="outline">{initialItem.type}</Badge>
        <h1 className="text-2xl font-bold">{initialItem.title}</h1>
        <p className="text-sm text-muted-foreground">
          Submitted by {initialItem.submitterName || "Anonymous"}
        </p>
        <p className="whitespace-pre-wrap leading-relaxed">
          {initialItem.details}
        </p>
      </div>
      <UpvoteButton itemId={id} initialVotes={initialItem.votes} />
    </main>
  );
}

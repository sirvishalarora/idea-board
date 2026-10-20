"use client";

import { useState } from "react";
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
  const [voted, setVoted] = useState(() => readVoted().includes(itemId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpvote() {
    if (voted || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/upvote`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setVotes(data.item.votes);
        markVoted(itemId);
        setVoted(true);
      } else {
        setError("Could not upvote. Try again.");
      }
    } catch {
      setError("Could not upvote. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
    <Button
      type="button"
      variant={voted ? "secondary" : "default"}
      disabled={voted || pending}
      onClick={onUpvote}
      aria-label="Upvote"
    >
      ▲ {votes}
    </Button>
    {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

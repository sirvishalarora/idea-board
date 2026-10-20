"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ItemCard } from "@/components/item-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import type { BoardItem } from "@/lib/types";

export default function PhoneHome() {
  const [items, setItems] = useState<BoardItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
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
        <Link href="/new" className={cn(buttonVariants())}>
          Add
        </Link>
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

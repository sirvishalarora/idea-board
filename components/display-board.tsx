"use client";

import { useEffect, useRef, useState } from "react";
import { blurb } from "@/lib/blurb";
import type { BoardItem } from "@/lib/types";

const POLL_MS = 15_000;

function sortByVotes(items: BoardItem[]): BoardItem[] {
  return [...items].sort((a, b) => b.votes - a.votes);
}

function DisplayColumn({
  title,
  items,
  emptyCopy,
}: {
  title: string;
  items: BoardItem[];
  emptyCopy: string;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-4 border-b border-white/20 pb-3 text-3xl font-bold tracking-tight">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-xl text-slate-400">{emptyCopy}</p>
      ) : (
        <ul className="flex flex-col gap-4 overflow-y-auto pr-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-white/15 bg-white/5 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-2xl font-semibold leading-snug">
                  {item.title}
                </h3>
                <span
                  className="shrink-0 text-2xl font-bold tabular-nums text-amber-400"
                  aria-label={`${item.votes} votes`}
                >
                  ▲ {item.votes}
                </span>
              </div>
              <p className="mt-2 text-lg leading-relaxed text-slate-300">
                {blurb(item.details)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DisplayBoard() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const lastGoodRef = useRef<BoardItem[]>([]);
  const [offline, setOffline] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/items");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        const next: BoardItem[] = data.items ?? [];
        if (cancelled) return;
        setItems(next);
        lastGoodRef.current = next;
        setOffline(false);
      } catch {
        if (cancelled) return;
        setItems(lastGoodRef.current);
        setOffline(true);
      } finally {
        if (!cancelled) setInitialLoad(false);
      }
    }

    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const ideas = sortByVotes(items.filter((i) => i.type === "idea"));
  const challenges = sortByVotes(items.filter((i) => i.type === "challenge"));

  return (
    <main className="flex min-h-0 flex-1 flex-col p-8">
      <header className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight">Office Ideas Board</h1>
      </header>

      {offline && (
        <div
          role="status"
          className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/15 px-4 py-3 text-lg text-amber-100"
        >
          Can&apos;t reach the board — retrying…
        </div>
      )}

      {initialLoad && items.length === 0 && !offline ? (
        <p className="text-xl text-slate-400">Loading…</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-10">
          <DisplayColumn
            title="Ideas"
            items={ideas}
            emptyCopy="No ideas yet — scan the QR to add one"
          />
          <DisplayColumn
            title="Challenges"
            items={challenges}
            emptyCopy="No challenges yet — scan the QR to add one"
          />
        </div>
      )}
    </main>
  );
}

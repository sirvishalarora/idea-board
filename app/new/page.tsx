"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ItemType } from "@/lib/types";

export default function NewItemPage() {
  const router = useRouter();
  const [type, setType] = useState<ItemType>("idea");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, details, submitterName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create item.");
        return;
      }
      router.push(`/items/${data.item.id}`);
    } catch {
      setError("Could not create item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <header className="flex items-center gap-2">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2"
          )}
        >
          ← Back
        </Link>
        <h1 className="text-xl font-bold">Add to board</h1>
      </header>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as ItemType)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="idea">Idea</option>
            <option value="challenge">Challenge</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="details">Details</Label>
          <Textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
            rows={5}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="submitterName">
            Your name (shown only on phone details)
          </Label>
          <Input
            id="submitterName"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            maxLength={100}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting…" : "Submit"}
        </Button>
      </form>
    </main>
  );
}

import Link from "next/link";
import { ItemCard } from "@/components/item-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { getStore } from "@/lib/store";
import type { BoardItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PhoneHome() {
  let items: BoardItem[] = [];
  let error: string | null = null;
  try {
    items = await getStore().listActive();
  } catch {
    error = "Could not load the board.";
  }

  if (error) {
    return <main className="mx-auto max-w-lg p-4">{error}</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Office Ideas Board</h1>
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

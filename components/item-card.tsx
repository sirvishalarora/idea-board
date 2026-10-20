import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { BoardItem } from "@/lib/types";

export function ItemCard({ item }: { item: BoardItem }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="block rounded-lg border border-border p-4 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline">{item.type}</Badge>
          <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          ▲ {item.votes}
        </span>
      </div>
    </Link>
  );
}

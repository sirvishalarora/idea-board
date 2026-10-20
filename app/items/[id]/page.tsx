import { getStore } from "@/lib/store";
import { ItemDetailClient } from "./item-detail-client";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getStore().getById(id);
  const active = item && item.status === "active" ? item : null;

  return <ItemDetailClient id={id} initialItem={active} />;
}

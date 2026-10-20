import { ItemDetailClient } from "./item-detail-client";

export const instant = false;

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ItemDetailClient key={id} id={id} />;
}

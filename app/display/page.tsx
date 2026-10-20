import QRCode from "qrcode";
import { DisplayBoard } from "@/components/display-board";
import { QrPanel } from "@/components/qr-panel";
import { getStore } from "@/lib/store";
import type { BoardItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  let initialItems: BoardItem[] = [];
  try {
    initialItems = await getStore().listActive();
  } catch {
    initialItems = [];
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const qrSrc = appUrl
    ? await QRCode.toDataURL(appUrl, { width: 280, margin: 1 })
    : null;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <DisplayBoard initialItems={initialItems} />
      <QrPanel initialSrc={qrSrc} url={appUrl} />
    </div>
  );
}

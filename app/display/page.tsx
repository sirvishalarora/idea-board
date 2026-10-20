import { DisplayBoard } from "@/components/display-board";
import { QrPanel } from "@/components/qr-panel";

export default function DisplayPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3456";

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <DisplayBoard />
      <QrPanel url={appUrl} />
    </div>
  );
}

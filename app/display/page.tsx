import { DisplayBoard } from "@/components/display-board";
import { QrPanel } from "@/components/qr-panel";

export default function DisplayPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <DisplayBoard />
      <QrPanel />
    </div>
  );
}

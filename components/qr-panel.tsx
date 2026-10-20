"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrPanel({
  url,
  initialSrc,
}: {
  url?: string;
  initialSrc?: string | null;
}) {
  const [src, setSrc] = useState<string | null>(initialSrc ?? null);

  useEffect(() => {
    if (initialSrc) return;
    const target =
      url ?? process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    QRCode.toDataURL(target, { width: 280, margin: 1 }).then(setSrc);
  }, [url, initialSrc]);

  return (
    <aside className="flex w-56 shrink-0 flex-col items-center justify-center gap-3 border-l border-white/20 bg-black/30 p-6 text-center text-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Scan to open the board on your phone"
          className="rounded-md bg-white p-2"
        />
      ) : (
        <div className="h-[176px] w-[176px] animate-pulse bg-white/20" />
      )}
      <p className="text-sm leading-snug">
        Scan to view details, upvote, or add an idea
      </p>
    </aside>
  );
}

"use client";

import { useRef } from "react";

export default function AdminFramePage() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const disableContextMenu = () => {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) {
      return;
    }

    frameWindow.document.oncontextmenu = () => false;
  };

  return (
    <main className="h-screen w-full bg-white">
      <iframe
        ref={frameRef}
        title="RMD Admin"
        src="/new_admin/pages/main_page"
        className="h-full w-full border-0"
        onLoad={disableContextMenu}
      />
    </main>
  );
}

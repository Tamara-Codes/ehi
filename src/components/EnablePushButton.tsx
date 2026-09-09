"use client";

import { useState } from "react";
import { subscribeToPushAction } from "@/app/actions";

// Push subscription relies on browser-only APIs (Notification,
// navigator.serviceWorker, PushManager) that don't exist on the server —
// this is why this one small piece needs "use client" while the rest of
// the app stays server-rendered.

// The browser's push API wants the VAPID public key as raw bytes, not the
// base64url string we store it as — this converts between the two.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function EnablePushButton() {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error" | "unsupported">(
    "idle",
  );

  async function handleEnable() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    setStatus("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("error");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      await subscribeToPushAction(subscription.toJSON());
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-accent">✓ Obavijesti uključene.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={handleEnable} className="btn-secondary text-sm">
        {status === "working" ? "..." : "Uključi obavijesti"}
      </button>
      {status === "unsupported" && (
        <p className="text-xs text-muted">Preglednik ne podržava obavijesti.</p>
      )}
      {status === "error" && (
        <p className="text-xs text-muted">Obavijesti nisu dopuštene.</p>
      )}
    </div>
  );
}

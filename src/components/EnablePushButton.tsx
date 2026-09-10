"use client";

import { useEffect, useState } from "react";
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

type Status = "idle" | "working" | "done" | "error" | "unsupported" | "ios-needs-install";

export function EnablePushButton() {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // iOS Safari refuses to grant notification permission to a plain
    // browser tab at all — push only works once the site has been "Added
    // to Home Screen" and is running as an installed app. Detecting this
    // upfront lets us show the actual required steps instead of a
    // permission prompt that iOS will silently never honor. This has to
    // run in an effect (not at render time): navigator/window don't exist
    // during this component's server-rendered pass.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // iPadOS 13+ reports as "MacIntel" in the user agent; touch support
      // is what actually distinguishes it from a real Mac.
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) {
      // This is a legitimate exception to "don't setState directly in an
      // effect": the value being computed (navigator/window feature
      // detection) is only available client-side, so it can't be a lazy
      // useState initializer either — that function runs during the
      // server-rendered pass too, where navigator/window don't exist.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("ios-needs-install");
    }
  }, []);

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

  if (status === "ios-needs-install") {
    return (
      <div className="card text-sm">
        <p className="font-medium">Za obavijesti na iPhoneu:</p>
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-muted">
          <li>
            Dodirnite gumb <strong className="text-foreground">Podijeli</strong> u Safariju
          </li>
          <li>
            Odaberite <strong className="text-foreground">&quot;Dodaj na Home Screen&quot;</strong>
          </li>
          <li>Otvorite aplikaciju s početnog zaslona i pokušajte ponovno</li>
        </ol>
      </div>
    );
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

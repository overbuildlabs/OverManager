import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface MutedDevice {
  mutedUntil: number | null; // epoch ms, or null = until re-enabled
}

/**
 * Mute / snooze alerts for a single device. `id` is the miner IP for ASICs or
 * the device_id for OverMobile devices — the same key the alert engine uses.
 * Renders a dropdown control and, when muted, doubles as the "Muted (until …)"
 * badge so it's obvious why a device is quiet.
 */
export default function MuteControl({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const [muted, setMuted] = useState<MutedDevice | null>(null);
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const map = await invoke<Record<string, MutedDevice>>("get_muted_devices");
      setMuted(map[id] ?? null);
    } catch (err) {
      console.error("Failed to load mute state:", err);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Close the menu on an outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustom(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function mute(mutedUntil: number | null) {
    try {
      await invoke("set_device_mute", { id, mutedUntil });
      setOpen(false);
      setShowCustom(false);
      await load();
    } catch (err) {
      console.error("Failed to mute device:", err);
    }
  }

  async function unmute() {
    try {
      await invoke("clear_device_mute", { id });
      setOpen(false);
      setShowCustom(false);
      await load();
    } catch (err) {
      console.error("Failed to unmute device:", err);
    }
  }

  function muteForHours(hours: number) {
    mute(Date.now() + hours * 3_600_000);
  }

  function applyCustom() {
    if (!customValue) return;
    const ts = new Date(customValue).getTime();
    if (!Number.isNaN(ts) && ts > Date.now()) mute(ts);
  }

  const isMuted = muted != null;
  const badgeText = !isMuted
    ? "Mute alerts"
    : muted!.mutedUntil == null
    ? "Muted (until re-enabled)"
    : `Muted until ${new Date(muted!.mutedUntil).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`;

  const options: { label: string; action: () => void }[] = [
    { label: "1 hour", action: () => muteForHours(1) },
    { label: "4 hours", action: () => muteForHours(4) },
    { label: "24 hours", action: () => muteForHours(24) },
    { label: "Until I re-enable", action: () => mute(null) },
  ];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-lg transition-colors ${
          isMuted
            ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
            : "bg-dark-800 border-slate-700/50 text-slate-300 hover:text-white hover:border-primary-500/50"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMuted ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          )}
        </svg>
        {badgeText}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 z-20 bg-dark-800 border border-slate-700/60 rounded-lg shadow-xl py-1 text-sm">
          <p className="px-3 py-1.5 text-xs text-slate-500 uppercase tracking-wider">
            Mute alerts for
          </p>
          {options.map((o) => (
            <button
              key={o.label}
              onClick={o.action}
              className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors"
            >
              {o.label}
            </button>
          ))}
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors"
            >
              Custom date/time…
            </button>
          ) : (
            <div className="px-3 py-2 space-y-2">
              <input
                type="datetime-local"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="w-full bg-dark-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={applyCustom}
                disabled={!customValue}
                className="w-full px-2 py-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs font-medium rounded transition-colors"
              >
                Mute until selected time
              </button>
            </div>
          )}
          {isMuted && (
            <>
              <div className="my-1 border-t border-slate-700/50" />
              <button
                onClick={unmute}
                className="w-full text-left px-3 py-1.5 text-emerald-400 hover:bg-slate-700/40 hover:text-emerald-300 transition-colors"
              >
                Re-enable alerts
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

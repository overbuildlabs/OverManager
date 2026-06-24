import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { NerdMinerInfo, SavedNerdMiner } from "../types/miner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHashrate(hs: number): string {
  if (hs >= 1e9) return `${(hs / 1e9).toFixed(2)} GH/s`;
  if (hs >= 1e6) return `${(hs / 1e6).toFixed(2)} MH/s`;
  if (hs >= 1e3) return `${(hs / 1e3).toFixed(2)} KH/s`;
  return `${hs.toFixed(0)} H/s`;
}

function formatLastShare(unixSecs: number): string {
  if (!unixSecs) return "never";
  const diffMs = Date.now() - unixSecs * 1000;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const mins = Math.floor(diffSecs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

function PickaxeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19l6-6m4-9c2 2 4 4 4 7s-5 8-8 8-7-5-7-8 5-9 7-7z" />
    </svg>
  );
}

// ─── Add panel ────────────────────────────────────────────────────────────────

function AddNerdMinerPanel({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [poolHost, setPoolHost] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const addr = address.trim();
    if (!addr) return;
    setAdding(true);
    setError(null);
    try {
      await invoke("add_nerdminer", {
        address: addr,
        label: label.trim() || null,
        poolHost: poolHost.trim() || null,
      });
      setAddress("");
      setLabel("");
      setPoolHost("");
      onAdded();
    } catch (err) {
      setError(String(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-dark-800 rounded-xl border border-slate-700/50 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Add NerdMiner by BTC Address</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Stock NerdMiner_v2 firmware has no local API — this monitors your
            solo pool's per-account stats instead of the device directly.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-slate-400 mb-1">BTC Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-full bg-dark-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
            placeholder="bc1q..."
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Label <span className="text-slate-500">(optional)</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-full bg-dark-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            placeholder="Garage NerdMiner"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Pool host <span className="text-slate-500">(optional)</span>
          </label>
          <input
            type="text"
            value={poolHost}
            onChange={(e) => setPoolHost(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-full bg-dark-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            placeholder="pool.nerdminers.org"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !address.trim()}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditNerdMinerModal({
  saved,
  onClose,
  onSaved,
}: {
  saved: SavedNerdMiner;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(saved.label);
  const [address, setAddress] = useState(saved.address);
  const [poolHost, setPoolHost] = useState(saved.pool_host);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!address.trim()) {
      setError("BTC address is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await invoke("update_nerdminer", {
        id: saved.id,
        label: label.trim() || saved.label,
        address: address.trim(),
        poolHost: poolHost.trim(),
      });
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-dark-800 border border-slate-700/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Edit NerdMiner</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-dark-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              placeholder="Garage NerdMiner"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">BTC Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-dark-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
              placeholder="bc1q..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Pool host</label>
            <input
              type="text"
              value={poolHost}
              onChange={(e) => setPoolHost(e.target.value)}
              className="w-full bg-dark-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              placeholder="pool.nerdminers.org"
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function NerdMinerCard({
  saved,
  info,
  onRemove,
  onEdit,
}: {
  saved: SavedNerdMiner;
  info: NerdMinerInfo | undefined;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const online = info?.online ?? false;
  const statusColor = online ? "bg-emerald-500" : "bg-slate-500";
  const statusText = online ? "online" : "offline";

  return (
    <div className="bg-dark-800 rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <PickaxeIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="truncate">{saved.label}</span>
          </h3>
          <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{saved.address}</p>
          <p className="text-xs text-slate-500 mt-0.5">{saved.pool_host}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${statusColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
            {statusText}
          </span>
          <button
            onClick={onEdit}
            title="Edit"
            className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={onRemove}
            title="Remove"
            className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {info?.error ? (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {info.error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-dark-900 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">1m Hashrate</p>
              <p className="text-sm font-bold text-white">{formatHashrate(info?.hashrate1mHs ?? 0)}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Shares</p>
              <p className="text-sm font-bold text-white">{info?.shares ?? 0}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Best Share</p>
              <p className="text-sm font-bold text-white">{(info?.bestShareDiff ?? 0).toFixed(0)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Last share: {formatLastShare(info?.lastShareUnix ?? 0)}</p>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NerdMinerList() {
  const [saved, setSaved] = useState<SavedNerdMiner[]>([]);
  const [infos, setInfos] = useState<Map<string, NerdMinerInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SavedNerdMiner | null>(null);
  const [editTarget, setEditTarget] = useState<SavedNerdMiner | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [savedList, infoList] = await Promise.all([
        invoke<SavedNerdMiner[]>("get_saved_nerdminers"),
        invoke<NerdMinerInfo[]>("get_cached_nerdminers"),
      ]);
      setSaved(savedList);
      const map = new Map<string, NerdMinerInfo>();
      for (const i of infoList) map.set(i.id, i);
      setInfos(map);
    } catch (err) {
      console.error("Failed to load NerdMiners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unlisten = listen("farm-state-updated", refresh);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refresh]);

  async function handleConfirmRemove() {
    if (!removeTarget) return;
    try {
      await invoke("remove_nerdminer", { id: removeTarget.id });
      setRemoveTarget(null);
      await refresh();
    } catch (err) {
      console.error("Failed to remove NerdMiner:", err);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">NerdMiners</h2>
          <p className="text-slate-400 mt-1">
            Stock-firmware NerdMiner_v2 devices, monitored via your solo pool's
            account stats.
          </p>
        </div>
        <button
          onClick={() => setShowAddPanel((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showAddPanel ? "Hide" : "Add NerdMiner"}
        </button>
      </div>

      {showAddPanel && (
        <AddNerdMinerPanel
          onClose={() => setShowAddPanel(false)}
          onAdded={() => { setShowAddPanel(false); refresh(); }}
        />
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-sm">Loading...</div>
      ) : saved.length === 0 ? (
        <div className="text-center py-20">
          <PickaxeIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-lg font-medium text-slate-300">No NerdMiners added</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Click "Add NerdMiner" above and enter the BTC address your device
            is solo mining to.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {saved.map((s) => (
            <NerdMinerCard
              key={s.id}
              saved={s}
              info={infos.get(s.id)}
              onRemove={() => setRemoveTarget(s)}
              onEdit={() => setEditTarget(s)}
            />
          ))}
        </div>
      )}

      {editTarget && (
        <EditNerdMinerModal
          saved={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); refresh(); }}
        />
      )}

      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setRemoveTarget(null)}
          />
          <div className="relative z-10 bg-dark-800 border border-red-900/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-3">Remove {removeTarget.label}?</h3>
            <p className="text-sm text-slate-300 mb-5">
              This stops polling pool stats for this address. You can re-add it later.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRemoveTarget(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

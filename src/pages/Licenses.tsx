import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Licenses() {
  const navigate = useNavigate();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/legal/THIRD-PARTY-LICENSES.md")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(setText)
      .catch((err) => setError(String(err)));
  }, []);

  const filtered =
    text && filter.trim()
      ? text
          .split("\n\n")
          .filter((block) => block.toLowerCase().includes(filter.toLowerCase()))
          .join("\n\n")
      : text;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Third-Party Licenses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Open-source packages bundled into OverManager and their license terms.
          </p>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="px-4 py-2 rounded-lg bg-dark-800 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 transition-colors text-sm"
        >
          Back to Settings
        </button>
      </div>

      <div className="bg-dark-800 rounded-xl border border-slate-700/50 p-6">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by package or license name..."
          className="w-full mb-4 px-3 py-2 rounded-lg bg-dark-900 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
        />

        {error && (
          <p className="text-sm text-red-400">Failed to load license data: {error}</p>
        )}
        {!text && !error && (
          <p className="text-sm text-slate-500">Loading license data...</p>
        )}
        {filtered && (
          <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed max-h-[70vh] overflow-y-auto">
            {filtered}
          </pre>
        )}
      </div>
    </div>
  );
}

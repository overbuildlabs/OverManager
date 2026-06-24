import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getCoinIcon } from "../utils/coinIcon";
import { useProfitability } from "../context/ProfitabilityContext";
import { useFarmData } from "../hooks/useFarmData";

type ProfitRange = 1 | 6 | 24 | 168 | 720;
type ChartRange = 1 | 6 | 24 | 168 | 720;

function StatCard({
  label,
  value,
  unit,
  subline,
  valueClassName,
}: {
  label: string;
  value: string | number;
  unit?: string;
  subline?: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-dark-800 rounded-xl border border-slate-700/50 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueClassName ?? "text-white"}`}>
        {value}
        {unit && <span className="text-lg text-slate-400 ml-1">{unit}</span>}
      </p>
      {subline && <p className="text-xs text-emerald-400 mt-1">{subline}</p>}
    </div>
  );
}

/**
 * Per-coin dashboard — one reusable, parameterized view that fills in
 * dynamically for whichever coin is routed to (/coin/:coinId), rather than a
 * bespoke page per coin. Pulls from the same useFarmData() aggregation the
 * main Dashboard uses, just scoped to a single coinId.
 */
export default function CoinDashboard() {
  const { coinId = "" } = useParams<{ coinId: string }>();
  const navigate = useNavigate();
  const { currency, electricityCostPerKwh } = useProfitability();
  const currencyCode = currency.toUpperCase();
  const { coins, coinGroups, coinEarnings, farmHistory, initialLoaded } = useFarmData();

  const [chartRange, setChartRange] = useState<ChartRange>(24);
  const [profitRange, setProfitRange] = useState<ProfitRange>(24);

  const group = coinGroups.find((g) => g.coinId === coinId);
  const coin = group?.coin ?? coins.find((c) => c.id === coinId);
  const earnings = coinEarnings[coinId];
  const ticker = coin?.ticker ?? coinId.toUpperCase();
  const displayName = coin ? `${coin.name} (${coin.ticker})` : coinId;
  const color = coin?.color ?? "#6366f1";
  const coinDecimals = ticker === "BTC" ? 6 : 2;

  const dailyGross = earnings?.dailyFiat ?? 0;
  const dailyPowerKwh = (group?.wattage ?? 0) / 1000 * 24;
  const dailyPowerCost = dailyPowerKwh * electricityCostPerKwh;
  const dailyNet = dailyGross - dailyPowerCost;
  const windowScale = profitRange / 24;

  const profitRangeLabel = (r: ProfitRange) => (r === 168 ? "7d" : r === 720 ? "30d" : `${r}h`);
  const profitRangeUnitLabel = (r: ProfitRange) => {
    if (r === 1) return `${currencyCode}/hour`;
    if (r === 6) return `${currencyCode}/6h`;
    if (r === 24) return `${currencyCode}/day`;
    if (r === 168) return `${currencyCode}/week`;
    if (r === 720) return `${currencyCode}/month`;
    return currencyCode;
  };

  const cutoffSecs = Math.floor(Date.now() / 1000) - chartRange * 3600;
  const chartData = farmHistory
    .filter((s) => s.timestamp > cutoffSecs)
    .map((s) => ({
      time: new Date(s.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      hashrate: parseFloat((s.coinData[coinId]?.hashrate ?? 0).toFixed(2)),
    }));

  if (!initialLoaded) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </button>

      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {getCoinIcon(coinId) && (
            <img src={getCoinIcon(coinId)!} alt={ticker} className="w-10 h-10 rounded-full" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {displayName}
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {ticker}
              </span>
            </h2>
            <p className="text-slate-400 mt-1">
              {earnings ? `${earnings.coinPrice.toFixed(4)} ${currencyCode}` : "Coin-specific overview"}
            </p>
          </div>
        </div>
        {group && (
          <button
            onClick={() => navigate(`/miners?coin=${encodeURIComponent(coinId)}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 border border-slate-700/50 hover:border-primary-500/50 text-slate-300 text-xs font-medium rounded-lg transition-colors"
          >
            View ASIC miners →
          </button>
        )}
      </div>

      {!group ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-sm text-slate-500">No miners are currently mining {ticker}.</p>
        </div>
      ) : (
        <>
          {/* Miner breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Miners" value={group.count} subline={`${group.onlineCount} online`} />
            <StatCard label="ASIC" value={group.asicCount} />
            <StatCard label="Mobile" value={group.mobileCount} />
            <StatCard
              label="Offline"
              value={group.offlineCount}
              valueClassName={group.offlineCount > 0 ? "text-red-400" : "text-white"}
            />
          </div>

          {/* Profitability for this coin */}
          <div className="mb-6 bg-dark-800 rounded-xl border border-slate-700/50 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                {ticker} Profitability
              </h3>
              <div className="flex items-center gap-1">
                {([1, 6, 24, 168, 720] as ProfitRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setProfitRange(r)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      profitRange === r ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white bg-dark-900"
                    }`}
                  >
                    {profitRangeLabel(r)}
                  </button>
                ))}
              </div>
            </div>
            {earnings ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-dark-900 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Hashrate</p>
                  <p className="text-2xl font-bold text-white">
                    {group.totalHashrate.toFixed(1)}
                    <span className="text-sm text-slate-400 ml-1">{group.hashrateUnit}H/s</span>
                  </p>
                </div>
                <div className="bg-dark-900 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Gross Earnings</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {(dailyGross * windowScale).toFixed(2)}
                    <span className="text-sm text-slate-400 ml-1">{profitRangeUnitLabel(profitRange)}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {earnings.dailyCoins.toFixed(coinDecimals)} {ticker}/day
                  </p>
                </div>
                <div className="bg-dark-900 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">Power Cost</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {(dailyPowerCost * windowScale).toFixed(2)}
                    <span className="text-sm text-slate-400 ml-1">{profitRangeUnitLabel(profitRange)}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">{(dailyPowerKwh * windowScale).toFixed(1)} kWh</p>
                </div>
                <div className="bg-dark-900 rounded-lg p-4 col-span-2 sm:col-span-3">
                  <p className="text-xs text-slate-400 mb-1">Net Profit</p>
                  <p className={`text-2xl font-bold ${dailyNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {(dailyNet * windowScale).toFixed(2)}
                    <span className="text-sm text-slate-400 ml-1">{profitRangeUnitLabel(profitRange)}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {group.totalHashrate > 0 ? "Fetching profitability data..." : "No miners online"}
              </p>
            )}
          </div>

          {/* Hashrate history for this coin */}
          {chartData.length > 1 && (
            <div className="mb-6 bg-dark-800 rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  {ticker} Hashrate
                </h3>
                <div className="flex items-center gap-1">
                  {([1, 6, 24, 168, 720] as ChartRange[]).map((h) => (
                    <button
                      key={h}
                      onClick={() => setChartRange(h)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        chartRange === h ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white bg-dark-900"
                      }`}
                    >
                      {h === 168 ? "7d" : h === 720 ? "30d" : `${h}h`}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="coinHashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                    width={45}
                    tickFormatter={(v: number) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(148,163,184,0.15)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(v: number) => [`${v} ${group.hashrateUnit}H/s`, "Hashrate"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="hashrate"
                    stroke={color}
                    strokeWidth={2}
                    fill="url(#coinHashGrad)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

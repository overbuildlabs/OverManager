import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  MinerInfo,
  SavedMiner,
  CoinEarnings,
  CoinConfig,
  FarmSnapshot,
  UptimeStats,
  MobileMiner,
  PopMinerDevice,
  NerdMinerInfo,
} from "../types/miner";
import { getMinerCoinId } from "../utils/coinLookup";
import { hashrateUnitToHs } from "../utils/hashrate";
import { useProfitability } from "../context/ProfitabilityContext";

interface CachedFarmStateResponse {
  asicMiners: MinerInfo[];
  mobileMiners: MobileMiner[];
  popminerDevices: PopMinerDevice[];
  nerdminers: NerdMinerInfo[];
  farmSnapshot: FarmSnapshot | null;
  lastAsicPollMs: number;
  lastSnapshotMs: number;
}

export interface MinerWithSaved {
  info: MinerInfo;
  saved: SavedMiner | undefined;
}

export interface CoinGroup {
  coinId: string;
  coin: CoinConfig | undefined;
  count: number;
  onlineCount: number;
  offlineCount: number;
  totalHashrate: number;
  hashrateUnit: string;
  /** Total live hashrate for this coin, normalized to base H/s across ASIC,
   *  mobile, and NerdMiner sources. Use with formatHashrate() for display. */
  hashrateHs: number;
  asicCount: number;
  mobileCount: number;
  nerdminerCount: number;
  /** Sum of estimated wattage for this coin's online ASIC miners (mobile/NerdMiner power isn't modeled). */
  wattage: number;
}

const COIN_TICKER_TO_ID: Record<string, string> = { KAS: "kaspa", BTC: "bitcoin" };
function coinIdFromTicker(ticker: string): string {
  if (!ticker) return "kaspa";
  return COIN_TICKER_TO_ID[ticker.toUpperCase()] ?? ticker.toLowerCase();
}

/**
 * Shared farm-data layer: cached-state polling, per-coin aggregation, and
 * coin earnings estimates. Used by both the main Dashboard and the
 * per-coin CoinDashboard so neither duplicates this fetch/aggregation logic.
 */
export function useFarmData() {
  const { poolFeePercent, electricityCostPerKwh, minerWattage, poolProfiles, currency } = useProfitability();
  const [minerData, setMinerData] = useState<MinerWithSaved[]>([]);
  const [mobileMiners, setMobileMiners] = useState<MobileMiner[]>([]);
  const [popMinerDevices, setPopMinerDevices] = useState<PopMinerDevice[]>([]);
  const [nerdMiners, setNerdMiners] = useState<NerdMinerInfo[]>([]);
  const [savedMiners, setSavedMiners] = useState<SavedMiner[]>([]);
  const [coins, setCoins] = useState<CoinConfig[]>([]);
  const [lastPollMs, setLastPollMs] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [coinEarnings, setCoinEarnings] = useState<Record<string, CoinEarnings>>({});
  const [farmHistory, setFarmHistory] = useState<FarmSnapshot[]>([]);
  const [fleetUptime, setFleetUptime] = useState<number | null>(null);

  function getPoolFeeForMiner(info: MinerInfo): number {
    const activePool = info.pools.find((p) => p.connect || p.state === 1);
    if (activePool && activePool.addr) {
      for (const profile of poolProfiles) {
        if (
          profile.pool1addr === activePool.addr ||
          profile.pool2addr === activePool.addr ||
          profile.pool3addr === activePool.addr
        ) {
          return profile.fee_percent ?? poolFeePercent;
        }
      }
    }
    return poolFeePercent;
  }

  const loadFromCache = useCallback(
    async (saved: SavedMiner[]) => {
      try {
        const cached = await invoke<CachedFarmStateResponse>("get_cached_farm_state");

        const byIp = new Map(cached.asicMiners.map((m) => [m.ip, m]));
        const data: MinerWithSaved[] = saved.map((s) => {
          const info = byIp.get(s.ip);
          if (info) return { info, saved: s };
          return {
            info: {
              ip: s.ip,
              hostname: s.label,
              mac: "",
              model: "Unknown",
              status: "offline",
              firmware: "",
              software: "",
              online: false,
              rtHashrate: 0,
              avgHashrate: 0,
              hashrateUnit: "G",
              runtime: "--",
              runtimeSecs: 0,
              fans: [],
              boards: [],
              pools: [],
              hashrateHistory: [],
              health: { power: false, network: false, fan: false, temp: false },
              lastSeen: new Date().toISOString(),
              defaultWattage: s.wattage ?? 100,
            },
            saved: s,
          };
        });

        setMinerData(data);
        setMobileMiners(cached.mobileMiners);
        setPopMinerDevices(cached.popminerDevices);
        setNerdMiners(cached.nerdminers ?? []);
        setLastPollMs(cached.lastAsicPollMs);
      } catch (err) {
        console.error("Failed to load cached farm state:", err);
      }

      invoke<Record<string, UptimeStats>>("get_all_uptime_stats", { hours: 24 })
        .then((stats) => {
          const values = Object.values(stats);
          if (values.length > 0) {
            const avg = values.reduce((s, v) => s + v.uptime_percent, 0) / values.length;
            setFleetUptime(avg);
          }
        })
        .catch(console.error);

      invoke<FarmSnapshot[]>("get_farm_history", { hours: 720 })
        .then(setFarmHistory)
        .catch(console.error);
    },
    []
  );

  const fetchCoinEarnings = useCallback((groups: CoinGroup[], allMinerData: MinerWithSaved[]) => {
    groups.forEach(({ coinId, totalHashrate }) => {
      if (totalHashrate <= 0) return;
      const coinMiners = allMinerData.filter((d) => {
        if (!d.info.online) return false;
        const activePoolAddr = d.info.pools.find((p) => p.connect || p.state === 1)?.addr;
        return getMinerCoinId(activePoolAddr, poolProfiles, d.saved?.coin_id) === coinId;
      });
      let weightedFee = poolFeePercent;
      if (coinMiners.length > 0) {
        const totalH = coinMiners.reduce((s, d) => s + d.info.rtHashrate, 0);
        if (totalH > 0) {
          weightedFee = coinMiners.reduce((s, d) => {
            const fee = getPoolFeeForMiner(d.info);
            return s + fee * (d.info.rtHashrate / totalH);
          }, 0);
        }
      }
      invoke<CoinEarnings>("calculate_coin_earnings", {
        coinId,
        hashrateGhs: totalHashrate,
        poolFeePercent: weightedFee,
        currency,
      })
        .then((est) => setCoinEarnings((prev) => ({ ...prev, [coinId]: est })))
        .catch(console.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolFeePercent, currency, poolProfiles]);

  useEffect(() => {
    invoke<SavedMiner[]>("get_saved_miners")
      .then(async (saved) => {
        setSavedMiners(saved);
        await loadFromCache(saved);
        setInitialLoaded(true);
      })
      .catch(() => setInitialLoaded(true));
    invoke<CoinConfig[]>("get_coins").then(setCoins).catch(console.error);
  }, [loadFromCache]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    listen("farm-state-updated", () => {
      loadFromCache(savedMiners).catch(console.error);
    }).then((h) => {
      if (cancelled) h();
      else unlisten = h;
    });
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [savedMiners, loadFromCache]);

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      await invoke("force_poll_asic");
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (err) {
      console.error("Force poll failed:", err);
    } finally {
      setRefreshing(false);
    }
  }

  const miners = minerData.map((d) => d.info);
  const onlineMiners = minerData.filter((d) => d.info.online);
  const totalRtHashrate = miners.reduce((s, m) => s + m.rtHashrate, 0);
  const onlineCount = miners.filter((m) => m.online).length;
  const unit = miners.find((m) => m.online)?.hashrateUnit ?? "G";

  const asicCount = miners.length;
  const mobileCount = mobileMiners.length;
  const popMinerCount = popMinerDevices.length;
  const totalCount = asicCount + mobileCount + popMinerCount;
  const onlineAsicCount = onlineCount;
  const onlineMobileCount = mobileMiners.filter((m) => m.isOnline).length;
  const onlinePopMinerCount = popMinerDevices.filter((d) => d.online).length;
  const totalOnline = onlineAsicCount + onlineMobileCount + onlinePopMinerCount;

  const asicHashrateGhs = totalRtHashrate;
  // Normalize each ASIC by its own reported unit (most report "G", but
  // terahash-class miners report "T") so the farm total is correct regardless
  // of magnitude — not silently assumed to be GH/s.
  const asicHashrateHs = miners.reduce(
    (s, m) => s + m.rtHashrate * hashrateUnitToHs(m.hashrateUnit),
    0
  );
  const mobileHashrateHs = mobileMiners
    .filter((m) => m.isOnline)
    .reduce((s, m) => s + m.hashrateHs, 0);
  const mobileHashrateGhs = mobileHashrateHs / 1e9;
  const popMinerHashrateHs = popMinerDevices
    .filter((d) => d.online)
    .reduce((s, d) => s + d.hashrate, 0);
  const popMinerHashrateGhs = popMinerHashrateHs / 1e9;
  const totalHashrateGhs = asicHashrateGhs + mobileHashrateGhs + popMinerHashrateGhs;
  const totalHashrateHs = asicHashrateHs + mobileHashrateHs + popMinerHashrateHs;
  const totalFarmWattage = useMemo(() => {
    return onlineMiners.reduce((sum, { saved }) => sum + (saved?.wattage ?? minerWattage), 0);
  }, [onlineMiners, minerWattage]);

  const coinGroups = useMemo<CoinGroup[]>(() => {
    const asicByCoin = new Map<string, MinerWithSaved[]>();
    for (const saved of savedMiners) {
      const live = minerData.find((d) => d.info.ip === saved.ip);
      const activePoolAddr = live?.info.pools.find((p) => p.connect || p.state === 1)?.addr;
      const coinId = getMinerCoinId(activePoolAddr, poolProfiles, saved.coin_id);
      if (!asicByCoin.has(coinId)) asicByCoin.set(coinId, []);
      asicByCoin.get(coinId)!.push(
        live ?? {
          info: {
            ip: saved.ip,
            hostname: saved.label,
            mac: "",
            model: "Unknown",
            status: "offline",
            firmware: "",
            software: "",
            online: false,
            rtHashrate: 0,
            avgHashrate: 0,
            hashrateUnit: "G",
            runtime: "--",
            runtimeSecs: 0,
            fans: [],
            boards: [],
            pools: [],
            hashrateHistory: [],
            health: { power: false, network: false, fan: false, temp: false },
            lastSeen: new Date().toISOString(),
            defaultWattage: 100,
          },
          saved,
        }
      );
    }

    const mobileByCoin = new Map<string, MobileMiner[]>();
    for (const m of mobileMiners) {
      const coinId = coinIdFromTicker(m.coin);
      if (!mobileByCoin.has(coinId)) mobileByCoin.set(coinId, []);
      mobileByCoin.get(coinId)!.push(m);
    }

    const nerdminerByCoin = new Map<string, NerdMinerInfo[]>();
    for (const nm of nerdMiners) {
      const coinId = nm.coinId || "bitcoin";
      if (!nerdminerByCoin.has(coinId)) nerdminerByCoin.set(coinId, []);
      nerdminerByCoin.get(coinId)!.push(nm);
    }

    const allCoinIds = new Set([...asicByCoin.keys(), ...mobileByCoin.keys(), ...nerdminerByCoin.keys()]);

    return Array.from(allCoinIds).map((coinId) => {
      const coin = coins.find((c) => c.id === coinId);
      const asicGroup = asicByCoin.get(coinId) ?? [];
      const mobileGroup = mobileByCoin.get(coinId) ?? [];
      const nerdminerGroup = nerdminerByCoin.get(coinId) ?? [];

      const asicOnline = asicGroup.filter((g) => g.info.online);
      const mobileOnline = mobileGroup.filter((m) => m.isOnline);
      const nerdminerOnline = nerdminerGroup.filter((m) => m.online);

      const asicHashrate = asicGroup.reduce((s, g) => s + g.info.rtHashrate, 0);
      const hashrateUnit = asicOnline[0]?.info.hashrateUnit ?? "G";

      const mobileHashrateHsForCoin = mobileGroup.filter((m) => m.isOnline).reduce((s, m) => s + m.hashrateHs, 0);
      const nerdminerHashrateHsForCoin = nerdminerGroup.filter((m) => m.online).reduce((s, m) => s + m.hashrate1mHs, 0);
      // Normalize the whole group to base H/s (ASIC by its own unit, mobile &
      // NerdMiner are already H/s) so display can scale the unit dynamically.
      const asicHashrateHsForCoin = asicGroup.reduce(
        (s, g) => s + g.info.rtHashrate * hashrateUnitToHs(g.info.hashrateUnit),
        0
      );
      const hashrateHs = asicHashrateHsForCoin + mobileHashrateHsForCoin + nerdminerHashrateHsForCoin;

      // Legacy single-unit total, kept for callers that haven't moved to hashrateHs.
      const unitMultiplier: Record<string, number> = { K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15 };
      const mobileInUnit = mobileHashrateHsForCoin / (unitMultiplier[hashrateUnit] ?? 1e9);
      const nerdminerInUnit = nerdminerHashrateHsForCoin / (unitMultiplier[hashrateUnit] ?? 1e9);

      const totalHashrate = asicHashrate + mobileInUnit + nerdminerInUnit;
      const wattage = asicOnline.reduce((s, g) => s + (g.saved?.wattage ?? minerWattage), 0);

      return {
        coinId,
        coin,
        count: asicGroup.length + mobileGroup.length + nerdminerGroup.length,
        onlineCount: asicOnline.length + mobileOnline.length + nerdminerOnline.length,
        offlineCount:
          (asicGroup.length - asicOnline.length) +
          (mobileGroup.length - mobileOnline.length) +
          (nerdminerGroup.length - nerdminerOnline.length),
        totalHashrate,
        hashrateUnit,
        hashrateHs,
        asicCount: asicGroup.length,
        mobileCount: mobileGroup.length,
        nerdminerCount: nerdminerGroup.length,
        wattage,
      };
    });
  }, [savedMiners, minerData, coins, poolProfiles, mobileMiners, nerdMiners, minerWattage]);

  useEffect(() => {
    setCoinEarnings({});
  }, [currency]);

  useEffect(() => {
    fetchCoinEarnings(coinGroups, minerData);
  }, [totalRtHashrate, coinGroups, minerData, fetchCoinEarnings]);

  return {
    minerData,
    mobileMiners,
    popMinerDevices,
    nerdMiners,
    savedMiners,
    coins,
    lastPollMs,
    refreshing,
    initialLoaded,
    coinEarnings,
    farmHistory,
    fleetUptime,
    coinGroups,
    totalFarmWattage,
    miners,
    onlineMiners,
    totalRtHashrate,
    onlineCount,
    unit,
    asicCount,
    mobileCount,
    popMinerCount,
    totalCount,
    onlineAsicCount,
    onlineMobileCount,
    onlinePopMinerCount,
    totalOnline,
    asicHashrateGhs,
    asicHashrateHs,
    mobileHashrateHs,
    mobileHashrateGhs,
    popMinerHashrateHs,
    popMinerHashrateGhs,
    totalHashrateGhs,
    totalHashrateHs,
    handleManualRefresh,
    electricityCostPerKwh,
    currency,
  };
}

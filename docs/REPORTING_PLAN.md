# OverManager Cloud — Reporting Structure Plan

> Status: **Planning / working document.** This captures the full reporting
> surface we want OverManager Cloud to offer as a paid subscription value-add,
> what data we already have to build each report, and a suggested build order.
> Nothing here is implemented yet unless explicitly noted.

## 1. Why reporting matters

Buying OverManager Cloud is about three things: **multiple instances**,
**remote control**, and **reporting**. The first two are largely built. Reporting
is the differentiator that keeps a paying farm operator subscribed month over
month — it's what they open every morning, what they show a partner/investor,
and what they use to decide whether a rig earns its power bill.

The benchmark here is **Foreman**, **Hive OS**, and **Awesome Miner**. The bar
those tools set: per-coin and per-rig profitability, historical hashrate,
uptime/availability, efficiency (W per unit hashrate), pool share quality,
alert/incident history, and scheduled/exported reports. We should match that
and lean into our multi-instance rollup advantage.

## 2. Data we already have (foundation)

These are the building blocks already flowing through the desktop app → cloud
sync pipeline, so most reports are an aggregation/query problem, not a new
data-collection problem:

| Source | Field(s) | Notes |
| --- | --- | --- |
| `farm_snapshots` | `totalHashrate`, `coinData` (jsonb: per-coin hashrate, miner_count, daily earnings) | Per-coin split now populated for ASIC + mobile + **NerdMiner** (as of the coin-split fix). `totalHashrate` normalized to GH/s. |
| `minerStates` | `coin`, hashrate, online, state grab-bag | Per-miner current state. `coin` already present. |
| `minerSnapshots` | historical per-miner readings | History endpoint envelope `{ snapshots }`. |
| uptime tracking | `total_polls`, `online_polls`, `uptime_percent`, downtime, streak | Desktop computes this per-miner from `uptime.json`; fleet rollup available. |
| alerts | `timestamp`, `ruleName` (alert kind) | No severity column today; `ruleName` is the discriminator. |
| preferences | currency, pool fee %, electricity cost/kWh, per-miner wattage | Needed for profitability/efficiency math. |

**Known gaps to close before some reports are possible** (tracked separately):
- OverCloud device-type model is hardcoded to `'asic' | 'mobile' | 'popminer'`
  (3 Postgres CHECK constraints + a Zod enum). Ingesting **NerdMiner** as a
  first-class cloud device type needs that migration. Coin-data plumbing is
  already coin-agnostic.
- No historical **price** capture server-side — profitability history currently
  depends on live price at snapshot time. For accurate back-dated profit
  reports we need to store the coin price alongside each snapshot (or capture a
  daily price series).
- No per-miner **power telemetry** from most miners — wattage is an estimate
  (spec sheet / user override), not a measured value. Efficiency reports will be
  estimate-based unless a miner reports real watts.

## 3. Report catalog

Organized by category. Each entry notes **data readiness** (🟢 ready,
🟡 partial / needs work, 🔴 needs new data or migration).

### 3.1 Profitability

1. **Total profitability** 🟢 — gross revenue, power cost, net profit across the
   whole fleet, over a selectable window (24h / 7d / 30d / custom). Already
   computed live on the desktop dashboard; Cloud version needs historical
   persistence + price history (🟡) for accurate back-dated numbers.
2. **Profit by coin** 🟢 — same breakdown split per coin (Kaspa vs BTC vs
   future modular coins). Feeds directly from `coinData`.
3. **Profit by miner / rig** 🟡 — per-device revenue minus its own power cost.
   Needs per-miner earnings attribution (we have per-miner hashrate + coin, so
   this is derivable).
4. **Profit by site / instance** 🟡 — rollup across multiple OverManager
   instances for operators running several locations. This is our multi-instance
   advantage.
5. **Cost basis & tax export** 🔴 — CSV/PDF export of mined coin amounts with
   the price at time-of-receipt, for accounting/tax. Needs price-at-snapshot
   capture.
6. **Break-even / profitability threshold** 🟡 — at what electricity price does
   each rig/coin go negative; flag rigs that are underwater at current rates.

### 3.2 Hashrate

7. **Total hashrate (historical)** 🟢 — already charted; per-coin toggle added.
8. **Hashrate by coin (historical)** 🟢 — implemented locally; Cloud just needs
   to query `coinData` over time.
9. **Hashrate by miner (historical)** 🟡 — per-device trend line; data is in
   `minerSnapshots`, needs a per-miner history view.
10. **Hashrate by site / instance** 🟡 — multi-instance rollup.
11. **Effective vs reported hashrate** 🔴 — pool-side accepted-share hashrate vs
    device-reported hashrate (the "luck-adjusted" real number). Needs pool data
    correlation; partially available for NerdMiner (pool stats) and pool-push
    ASICs.

### 3.3 Uptime & availability

12. **Per-miner uptime %** 🟢 — already tracked (24h/7d/30d).
13. **Fleet availability %** 🟢 — averaged rollup exists on the dashboard.
14. **Downtime event log** 🟡 — timeline of when each miner dropped/recovered,
    with duration. We have last-downtime + streak; needs an event history table.
15. **MTBF / MTTR-style stats** 🟡 — mean time between failures, mean recovery
    time per miner. Derivable once the downtime event log exists.

### 3.4 Efficiency

16. **Efficiency (W per TH / W per MH)** 🟡 — by miner and fleet average.
    Wattage is estimated today (🔴 for measured), but estimate-based efficiency
    is still useful for relative comparison and aging detection.
17. **Efficiency trend over time** 🟡 — flag rigs whose efficiency degrades
    (aging chips, failing boards, throttling).

### 3.5 Pool performance

18. **Share quality** 🟡 — accepted / rejected / stale share rates per miner and
    per pool. Available for miners that expose pool stats (CGMiner pools,
    NerdMiner solo-pool, IceRiver).
19. **Pool switch history** 🟡 — log of which pool each miner was on and when it
    switched (manual or failover).

### 3.6 Alerts, incidents & health

20. **Alert / incident history** 🟢 — log of fired alerts by `timestamp` and
    `ruleName`, with resolution time. Data exists; needs a reporting view.
21. **Recurring-issue detection** 🟡 — surface repeat offenders (e.g. the same
    board flapping, the same miner repeatedly offline).
22. **Fleet health dashboard** 🟡 — temp/fan trend lines, board-failure history,
    firmware-version inventory across the fleet.
23. **Anomaly detection** 🔴 — flag a miner whose hashrate/efficiency deviates
    from its own baseline or from fleet peers, beyond simple online/offline.
    This is the "smart" tier — a differentiator vs. threshold-only alerting.

### 3.7 Delivery & multi-instance

24. **Multi-instance rollup dashboard** 🟡 — aggregate all of an operator's
    OverManager instances into one cross-site view. Core Cloud value.
25. **Scheduled / emailed reports** 🔴 — daily/weekly PDF or CSV digests pushed
    to the operator. Needs a scheduler + render/export pipeline.
26. **Shareable read-only report links** 🔴 — a link an operator can hand to a
    partner/investor without giving them account access.

## 4. Suggested build order

Sequenced by value-to-effort, leaning on data we already have first.

**Phase 1 — Surface what we already collect (low effort, high visibility):**
- Profit total + profit by coin (3.1 #1, #2)
- Hashrate total + by coin, historical (3.2 #7, #8)
- Per-miner & fleet uptime (3.3 #12, #13)
- Alert/incident history view (3.6 #20)

**Phase 2 — Per-miner depth + the multi-instance story:**
- Profit/hashrate by miner and by site/instance (3.1 #3/#4, 3.2 #9/#10)
- Downtime event log + MTBF/MTTR (3.3 #14/#15)
- Estimate-based efficiency (3.4 #16)

**Phase 3 — New data capture unlocks accuracy:**
- Price-at-snapshot capture → accurate back-dated profit + cost basis/tax export
  (3.1 #5)
- NerdMiner cloud device-type migration (unblocks NerdMiner in cloud reports)
- Pool share quality + effective vs reported hashrate (3.2 #11, 3.5 #18)

**Phase 4 — Delivery & intelligence (the "premium" tier):**
- Scheduled/emailed reports + shareable links (3.7 #25/#26)
- Recurring-issue + anomaly detection (3.6 #21/#23)
- Efficiency-degradation trending (3.4 #17)

## 5. Open questions to resolve

- **Price history:** capture price per-snapshot, or a separate daily price
  series keyed by coin? (Affects storage + back-date accuracy.)
- **Retention:** how far back do we keep per-miner snapshots at full resolution
  vs. downsampled? (Cost vs. report depth trade-off.)
- **Tiering:** which reports are included in the base Cloud subscription vs. a
  higher "pro/business" tier? (Scheduled reports, anomaly detection, and tax
  export are natural upsells.)
- **Export formats:** CSV is table-stakes; is PDF worth the render pipeline cost
  for v1, or defer to Phase 4?
- **Measured power:** is it worth integrating smart-plug / PDU telemetry for
  miners that don't self-report watts, to make efficiency reports real instead
  of estimated?

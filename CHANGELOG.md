# Changelog

## v1.8.3

### NerdMiner improvements

- **Pick your NerdMiner's solo pool from a list.** When you add a stock-firmware
  NerdMiner_v2 by BTC address, you now choose its pool from a dropdown of
  supported solo pools instead of typing a host by hand. Each supported pool has
  its own stats reader, so monitoring works correctly no matter which pool
  software it runs:
  - **ckpool-solo** pools — NerdMiners Pool (pool.nerdminers.org) and CKPool
    Solo (solo.ckpool.org)
  - **Public Pool** (public-pool.io)

  NerdMiners you added in an earlier version keep working unchanged.
  *The Public Pool stats reader follows that pool's documented API; verify on
  first poll — community testing welcome.*

## v1.8.2

### Cloud

- **NerdMiner_v2 units now sync to OverManager Cloud.** Stock-firmware
  NerdMiners (added by BTC address) join your ASIC, OverMiner, and mobile
  miners in the cloud — so they show up in the web portal and the OverManager
  mobile app with live hashrate, online status, and pool share stats, not just
  on the desktop. NerdMiners stay monitor-only everywhere they appear.

## v1.8.1

### Fixed

- **NerdMiner stats now display.** Stock-firmware NerdMiner_v2 devices added by
  BTC address were stuck showing "offline" with zero hashrate, shares, and best
  difficulty. The solo-pool stats response is now parsed correctly, so hashrate,
  shares, best difficulty, and last-share time populate as expected.

### New miner support

- **Antminer L7 / L9 (Scrypt)** — monitoring for Bitmain's Scrypt ASICs over the
  CGMiner API (TCP 4028), alongside the existing SHA-256 Antminer support.
  Hashrate, board temps, and fan speeds surface natively.
  *Validated against the CGMiner API shape; verify on first poll — community
  testing welcome.*

### Improvements

- **Third-party license screen** — review the open-source licenses of the
  libraries OverManager is built on, from within the app.

### Under the hood

- Internal rebrand from the legacy `com.proofofprints.popmanager` identifier to
  `com.overbuildlabs.overmanager`. Your saved miners, pools, alerts, preferences,
  history, and cloud-sync data migrate automatically and safely — **copied, not
  moved** — on first launch, so there's nothing to reconfigure.
- The updater signing key and endpoint are unchanged, so existing installs
  auto-update as usual.

## v1.7.0

### New miner support

- **Bitaxe / NerdQaxe++ (AxeOS firmware)** — discovered by the network scanner
  and monitored over the stock AxeOS HTTP API (`GET /api/system/info`).
  Hashrate, shares, best difficulty, temps, fans, power, and active/fallback
  pool all surface natively. No firmware flashing required.
  *Built against AxeOS's published OpenAPI spec; not yet verified on physical
  hardware — community testing welcome.*
- **NerdMiner_v2 (stock firmware)** — monitored via your solo pool's
  per-account stats (ckpool-style `/users/<btc-address>`), since stock
  NerdMiner firmware exposes no local API. Add a miner by BTC address from the
  new **NerdMiners** section. Reports hashrate, shares, best share, and
  last-share age.
  *Pool response shape follows standard ckpool-solo convention; verify against
  your pool on first poll — community testing welcome.*

### Supported miners (full list as of 1.7.0)

| Family | Discovery | Transport | Capability |
| --- | --- | --- | --- |
| IceRiver | Network scan / by IP | HTTP | Monitoring **+ pool reconfiguration** |
| Bitmain Antminer (and CGMiner-compatible firmwares) | Network scan / by IP | CGMiner API (TCP 4028) | Monitoring |
| Whatsminer (MicroBT) | Network scan / by IP | BTMiner API (TCP 4028) | Monitoring |
| Bitaxe / NerdQaxe++ (AxeOS) | Network scan / by IP | HTTP `/api/system/info` | Monitoring |
| NerdMiner_v2 | Add by BTC address | Solo-pool account stats | Monitoring |
| OverMiner / OverMiner Nano (ESP32) | mDNS auto-discovery | HTTP `/api/info` + `/api/stats` | Monitoring (real-time) |
| OverMobile (mobile app miners) | Reports to desktop server | HTTP push | Monitoring |

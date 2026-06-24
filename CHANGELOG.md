# Changelog

## v1.8.3

### Fixes

- **Mining by Coin** now includes NerdMiner hashrate — previously the poller
  never read the NerdMiner cache when building the per-coin snapshot, so BTC
  solo-mined by NerdMiners was invisible in the coin breakdown and historical
  charts.
- Adding an Antminer L7/L9 (or any ASIC) no longer silently hardcodes its
  `coinId` to `kaspa`; mistagged miners can now also be corrected after the
  fact.
- NerdMiner pool-stats polling no longer fails to parse a solo pool's response
  when the pool serves share/worker counters as floating-point numbers (e.g.
  `shares: 2320022.0`) instead of integers. The poller now also logs the HTTP
  status and a snippet of the raw response body when a parse does fail, so any
  remaining deployment quirks are diagnosable.

### New

- **Per-coin dashboards** — clicking a card or row in *Mining by Coin* now
  opens a dedicated dashboard for that coin (miner breakdown, coin-scoped
  profitability, and a per-coin hashrate history chart) instead of jumping
  straight to the filtered ASIC list. A "View ASIC miners" link on each coin
  dashboard still gets you to that list.
- The *Total Farm Hashrate* chart's coin selector now defaults to Kaspa and
  remembers your last selection between launches.

### Changed

- Removed the per-NerdMiner coin selector added during the coin-split work —
  NerdMiner_v2 stock firmware only solo-mines BTC, so the dropdown was dead
  weight. The underlying `coinId` field is still there for a future
  firmware/pool variant, it's just not user-facing on NerdMiners anymore.

## v1.8.0

### Licensing

- OverManager is now closed-source. Versions prior to v1.8.0 remain available
  under their original MIT License terms; v1.8.0 and later are licensed
  proprietary ("All Rights Reserved" — see [LICENSE](LICENSE)). This does not
  change anything about how the app works; bundled third-party open-source
  dependencies keep their own licenses (see the in-app Third-Party Licenses
  screen).

### App identifier change (Windows/macOS/Linux)

- The Tauri app identifier changed from `com.proofofprints.popmanager` to
  `com.overbuildlabs.overmanager`, and the log file was renamed from
  `popmanager.log` to `overmanager.log`. OverManager copies your existing
  preferences, farm history, and uptime data from the old identifier's data
  directory to the new one automatically and silently on first launch of
  v1.8.0 — no action needed. The old directory is left in place as a backup.
  *Windows: if you find the installer creates a second "Add or Remove
  Programs" entry instead of upgrading in place, please report it — this is
  the one case we couldn't fully verify in-house.*

### Cleanup

- Removed stale "PoPManager" branding and open-source claims from the README
  and project docs (the app was renamed to OverManager well before this
  release; some old text had been missed).

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
- **Antminer L7 / L9 (Scrypt — LTC/DOGE)** — these ship the same CGMiner
  TCP/4028 API as the SHA-256 Antminer S-series, so they connect through the
  existing Antminer integration with no new code. Added wattage estimates for
  both models (from Bitmain's published spec sheet).
  *The hashrate display assumes the same "MHS field reports GH/s" quirk
  observed on SHA-256 Antminers; this has not been confirmed against
  physical L7/L9 hardware — community testing welcome, especially on whether
  the displayed hashrate magnitude/unit looks correct.*

### Compliance

- Added a **Third-Party Licenses** screen (Settings → Legal & License
  Information → "View the full third-party license list", or `/licenses`)
  listing every bundled Rust crate and npm package with full license text.
  Generated via `npm run build:licenses` (`cargo-about` + `license-checker`);
  re-run before every release if dependencies changed.

### Supported miners (full list as of 1.7.0)

| Family | Discovery | Transport | Capability |
| --- | --- | --- | --- |
| IceRiver | Network scan / by IP | HTTP | Monitoring **+ pool reconfiguration** |
| Bitmain Antminer S-series (SHA-256) + L7/L9 (Scrypt), and CGMiner-compatible firmwares | Network scan / by IP | CGMiner API (TCP 4028) | Monitoring |
| Whatsminer (MicroBT) | Network scan / by IP | BTMiner API (TCP 4028) | Monitoring |
| Bitaxe / NerdQaxe++ (AxeOS) | Network scan / by IP | HTTP `/api/system/info` | Monitoring |
| NerdMiner_v2 | Add by BTC address | Solo-pool account stats | Monitoring |
| OverMiner / OverMiner Nano (ESP32) | mDNS auto-discovery | HTTP `/api/info` + `/api/stats` | Monitoring (real-time) |
| OverMobile (mobile app miners) | Reports to desktop server | HTTP push | Monitoring |

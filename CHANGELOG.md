# Changelog

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

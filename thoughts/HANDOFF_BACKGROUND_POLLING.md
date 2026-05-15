# Handoff: Background Polling Architecture

## Goal

Move ALL data polling from React frontend (on-navigate) to Rust background tasks (always-running). Pages load instantly from cached state. Cloud sync reads from the same cached state.

## Current architecture (broken)

- **ASIC miners**: polled from `Dashboard.tsx` and `MinerList.tsx` via `fetchAllStatuses()` — only runs when those pages are mounted
- **Mobile miners**: polled via `invoke("get_mobile_miners")` from each page's useEffect
- **PoPMiner devices**: discovered via mDNS + polled every 5s in Rust background task (already correct!)
- **Farm snapshots**: generated in `Dashboard.tsx` every 5th poll cycle — only when Dashboard is visible
- **Cloud sync**: pushes snapshots from a queue that only gets populated when Dashboard is active

## Target architecture

### Rust-side: one central polling orchestrator

Create `src-tauri/src/poller.rs` (or `src-tauri/src/background_poller.rs`):

```
Background Poller (spawned once in lib.rs setup hook)
├── Every 45s: poll all saved ASIC miners (get_miner_status for each IP)
├── Every 10s: read mobile miners from MobileMinersState (already in memory)
├── Every 5s: read PoPMiner devices from PopMinerDevicesState (already in memory)
├── Every 60s: generate FarmSnapshot from the above data
├── Every 60s: push snapshot + miner states to cloud (if enabled)
└── Store all results in a new CachedFarmState struct
```

### New shared state: `CachedFarmState`

```rust
pub struct CachedFarmState {
    pub asic_miners: Mutex<Vec<MinerInfo>>,       // latest poll results
    pub saved_miners: Mutex<Vec<SavedMiner>>,     // from storage
    pub mobile_miners: Mutex<Vec<MobileMiner>>,   // from MobileMinersState
    pub popminer_devices: Mutex<Vec<PopMinerDevice>>, // from PopMinerDevicesState
    pub farm_snapshot: Mutex<Option<FarmSnapshot>>,
    pub last_poll_timestamp: Mutex<i64>,          // unix ms
    pub poll_errors: Mutex<Vec<String>>,          // recent errors for UI
}
```

Managed as `Arc<CachedFarmState>` in Tauri state.

### New Tauri commands (replace existing per-page polls)

- `get_cached_farm_state()` → returns everything at once (for Dashboard)
- `get_cached_asic_miners()` → returns just ASIC data (for MinerList)
- `get_cached_mobile_miners()` → returns just mobile data (for MobileMinerList)
- `get_cached_popminer_devices()` → returns just PoPMiner data (for PopMinerList)
- `get_last_poll_time()` → returns timestamp for staleness check
- `force_poll()` → triggers an immediate poll cycle (for Refresh buttons)

### Tauri events emitted by the poller

- `farm-state-updated` — emitted after each poll cycle with the new state
- `poll-error` — emitted when polling fails repeatedly

### Frontend changes

Every page (Dashboard, MinerList, MobileMinerList, PopMinerList):

1. **On mount**: call `get_cached_*()` → instant render from cached data
2. **Subscribe to events**: `listen("farm-state-updated")` → update state
3. **Show "Last updated: Xs ago"** using `lastPollTimestamp`
4. **Show stale warning** if `Date.now() - lastPollTimestamp > 15 * 60 * 1000` (15 minutes)
5. **Refresh button**: calls `force_poll()` instead of running its own fetch loop
6. **Remove all `useEffect` polling loops** — no more `setInterval(fetchAllStatuses, 45000)`

### Cloud sync integration

The cloud sync loop (`cloud/sync.rs`) reads from `CachedFarmState` instead of waiting for `latest_snapshot` to be set by the Dashboard. This decouples cloud sync from which page the user is viewing.

### What NOT to change

- MobileMiner HTTP server (push-based from phones — independent of polling)
- PoPMiner mDNS discovery + per-device polling (already runs in background)
- Alert evaluation (still triggered after each poll cycle, just moved to the poller)
- Local JSON persistence (miners.json, history.json, etc.)

## Files to modify

### New files
- `src-tauri/src/poller.rs` — background polling orchestrator
- Maybe `src-tauri/src/cached_state.rs` — CachedFarmState struct + Tauri commands

### Modify (Rust)
- `src-tauri/src/lib.rs` — spawn poller, manage CachedFarmState
- `src-tauri/src/commands/history.rs` — snapshot generation moves to poller (or poller calls add_farm_snapshot)
- `src-tauri/src/cloud/sync.rs` — read from CachedFarmState instead of latest_snapshot
- `src-tauri/src/commands/alerts.rs` — alert evaluation called from poller after each cycle

### Modify (Frontend — major refactor)
- `src/pages/Dashboard.tsx` — remove fetchAllStatuses, read from cached state
- `src/pages/MinerList.tsx` — remove polling useEffect, read from cached state
- `src/pages/MobileMinerList.tsx` — remove polling useEffect, read from cached state
- `src/pages/PopMinerList.tsx` — already event-driven but should also use cached state for consistency
- `src/pages/Pools.tsx` — reads miner data, should use cached state
- `src/pages/MinerDetail.tsx` — currently polls individually, should read from cached state + optional per-miner detail fetch

## Implementation order

1. Create `CachedFarmState` struct and manage in Tauri state
2. Create background poller that populates it
3. Add Tauri commands to read cached state
4. Add event emission after each poll cycle
5. Refactor Dashboard to use cached state (biggest page)
6. Refactor MinerList, MobileMinerList, PopMinerList
7. Wire cloud sync to read from CachedFarmState
8. Wire alert evaluation into the poller
9. Add staleness indicator to all pages
10. Remove all frontend polling code
11. Test everything end-to-end

## Current state of the codebase

- PoPManager v1.2.0 released, cloud sync (Phase 2) implemented but only works when Dashboard is visible
- Cloud API at cloud.proofofprints.com is live and accepting data
- Cloud sync login works, WebSocket connects, but snapshot push depends on Dashboard being active
- All miner types (ASIC, Mobile, PoPMiner) work locally
- Alerts, pools, profitability all functional

## Key files to read first

- `src-tauri/src/lib.rs` — setup hook, all state management
- `src/pages/Dashboard.tsx` — the main polling loop that needs to move to Rust
- `src-tauri/src/commands/miner.rs` — `get_miner_status` function (ASIC polling)
- `src-tauri/src/commands/mobile_miner.rs` — MobileMinersState
- `src-tauri/src/popminer_device.rs` — PopMinerDevicesState
- `src-tauri/src/cloud/sync.rs` — cloud sync loop
- `src-tauri/src/commands/alerts.rs` — alert evaluation

## Build commands

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cd "L:/PoPManager/src-tauri" && cargo check
cd "L:/PoPManager" && npx tsc --noEmit
```

Do NOT run `npm run tauri dev` or `npm run tauri build` — only check compilation.

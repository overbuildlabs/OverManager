//! Per-device alert muting (snooze).
//!
//! Lets a user silence alerts for a device that is intentionally down (e.g. a
//! mobile miner turned off on purpose) without removing it. State is persisted
//! to `muted_devices.json` as a map keyed by device identifier — the miner IP
//! for ASICs, the `device_id` for OverMobile devices.
//!
//! `muted_until`:
//! - `None`  → muted until the user explicitly re-enables (permanent).
//! - `Some(epoch_ms)` → auto-expires once `now >= muted_until`.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MutedDevice {
    /// Epoch milliseconds at which the mute expires. `None` = until re-enabled.
    #[serde(default)]
    pub muted_until: Option<i64>,
}

fn mute_path() -> PathBuf {
    crate::paths::app_data_root().join("muted_devices.json")
}

fn load_muted() -> HashMap<String, MutedDevice> {
    let path = mute_path();
    if !path.exists() {
        return HashMap::new();
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

/// Persist the mute map with an atomic write (temp file + rename) so a crash
/// mid-write can never leave a truncated/corrupt `muted_devices.json`.
fn save_muted(map: &HashMap<String, MutedDevice>) -> Result<(), String> {
    let path = mute_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

/// Drop entries whose `muted_until` is in the past. Returns `true` if anything
/// was removed (so the caller can decide whether to persist). Idempotent.
fn prune_expired(map: &mut HashMap<String, MutedDevice>, now_ms: i64) -> bool {
    let before = map.len();
    map.retain(|_, m| match m.muted_until {
        Some(ts) => now_ms < ts,
        None => true,
    });
    map.len() != before
}

/// Set of device ids that are currently muted (expired entries excluded).
/// Called by the alert engine each evaluation cycle.
pub fn muted_ids(now_ms: i64) -> HashSet<String> {
    load_muted()
        .into_iter()
        .filter(|(_, m)| match m.muted_until {
            Some(ts) => now_ms < ts,
            None => true,
        })
        .map(|(id, _)| id)
        .collect()
}

// --- Tauri commands ----------------------------------------------------------

#[tauri::command]
pub fn get_muted_devices() -> Result<HashMap<String, MutedDevice>, String> {
    let mut map = load_muted();
    // Auto-clear expired entries so the UI never shows a stale "muted" badge.
    if prune_expired(&mut map, Utc::now().timestamp_millis()) {
        let _ = save_muted(&map);
    }
    Ok(map)
}

#[tauri::command]
pub fn set_device_mute(id: String, muted_until: Option<i64>) -> Result<(), String> {
    let mut map = load_muted();
    map.insert(id, MutedDevice { muted_until });
    save_muted(&map)
}

#[tauri::command]
pub fn clear_device_mute(id: String) -> Result<(), String> {
    let mut map = load_muted();
    map.remove(&id);
    save_muted(&map)
}

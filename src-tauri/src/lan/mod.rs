//! Phones as buzzers, and game files handed out, over the local network.
//!
//! Nothing listens until the app asks: the stage turns the buzzers on, the library shares
//! a game file. One server on all interfaces serves both and stops once neither needs it.
//! The room code in every URL keeps strangers on the same Wi-Fi out.

mod room;
mod server;

use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime, State};

use room::StageInfo;
use server::{LanServer, Notice, SharedFile};

const PORTS: std::ops::RangeInclusive<u16> = 47800..=47810;
/// The app hears about the room on these events.
const STATUS_EVENT: &str = "lan://status";
const JOIN_EVENT: &str = "lan://join";
const SHARE_NAME_HEADER: &str = "x-file-name";

/// Holds the server while anything uses it.
#[derive(Default)]
pub struct Lan(Mutex<Option<LanServer>>);

/// Where phones reach the server.
#[derive(Debug, Clone, Serialize)]
pub struct LanInfo {
    pub url: String,
    pub code: String,
}

/// Returns `bytes` random bytes as lowercase hex.
pub fn random_hex(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    getrandom::fill(&mut buf).expect("the OS random source is available");
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

fn room_code() -> String {
    let mut buf = [0u8; 4];
    getrandom::fill(&mut buf).expect("the OS random source is available");
    format!("{:04}", u32::from_le_bytes(buf) % 10_000)
}

// virtual adapters: VPN tunnels, containers, VMs and Apple's peer-to-peer links
const VIRTUAL_PREFIXES: [&str; 13] =
    ["utun", "tun", "tap", "wg", "ipsec", "ppp", "docker", "veth", "br-", "vboxnet", "vmnet", "awdl", "llw"];

/// Picks the address phones on the same Wi-Fi can reach: the one the default route leaves
/// from when it is a private address of a real adapter, else the likeliest home network.
pub fn pick_lan_ip(interfaces: &[(String, Ipv4Addr)], routed: Option<Ipv4Addr>) -> Option<Ipv4Addr> {
    let candidates: Vec<Ipv4Addr> = interfaces
        .iter()
        .filter(|(name, _)| !VIRTUAL_PREFIXES.iter().any(|p| name.to_lowercase().starts_with(p)))
        .map(|(_, ip)| *ip)
        .filter(|ip| ip.is_private())
        .collect();
    if let Some(ip) = routed.filter(|ip| candidates.contains(ip)) {
        return Some(ip);
    }
    let rank = |ip: &Ipv4Addr| match ip.octets() {
        [192, 168, ..] => 0,
        [172, ..] => 1,
        _ => 2,
    };
    candidates.into_iter().min_by_key(rank)
}

fn routed_ip() -> Option<Ipv4Addr> {
    // connecting a UDP socket only picks a route; no packet leaves the machine
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("192.0.2.1:9").ok()?;
    match socket.local_addr().ok()?.ip() {
        IpAddr::V4(ip) => Some(ip),
        IpAddr::V6(_) => None,
    }
}

fn lan_ip() -> Option<Ipv4Addr> {
    let interfaces: Vec<(String, Ipv4Addr)> = local_ip_address::list_afinet_netifas()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|(name, ip)| match ip {
            IpAddr::V4(v4) => Some((name, v4)),
            IpAddr::V6(_) => None,
        })
        .collect();
    pick_lan_ip(&interfaces, routed_ip())
}

fn base_url(port: u16) -> Result<String, String> {
    let ip = lan_ip().ok_or("no-network")?;
    Ok(format!("http://{ip}:{port}"))
}

fn ensure_started<'a, R: Runtime>(app: &AppHandle<R>, slot: &'a mut Option<LanServer>) -> Result<&'a LanServer, String> {
    if slot.is_none() {
        let mut addrs: Vec<SocketAddr> = PORTS.map(|p| SocketAddr::from((Ipv4Addr::UNSPECIFIED, p))).collect();
        addrs.push(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0)));
        let app = app.clone();
        let server = server::start(&addrs, room_code(), move |notice| {
            let _ = match notice {
                Notice::Status(status) => app.emit(STATUS_EVENT, status),
                Notice::Joined(player) => app.emit(JOIN_EVENT, player),
            };
        })
        .map_err(|e| e.to_string())?;
        *slot = Some(server);
    }
    Ok(slot.as_ref().expect("server was just started"))
}

fn lock(lan: &Lan) -> std::sync::MutexGuard<'_, Option<LanServer>> {
    lan.0.lock().unwrap_or_else(|e| e.into_inner())
}

fn with_server<T>(lan: &Lan, f: impl FnOnce(&LanServer) -> T) -> Option<T> {
    lock(lan).as_ref().map(f)
}

fn stop_if_idle(slot: &mut Option<LanServer>) {
    if slot.as_ref().is_some_and(|s| !s.buzzers_on() && !s.has_file()) {
        *slot = None;
    }
}

/// Turns the phone buzzers on, starting the server if needed.
#[tauri::command]
pub fn lan_start<R: Runtime>(app: AppHandle<R>, lan: State<'_, Lan>) -> Result<LanInfo, String> {
    let mut slot = lock(&lan);
    let port = ensure_started(&app, &mut slot)?.port;
    let url = base_url(port).inspect_err(|_| stop_if_idle(&mut slot))?;
    let server = slot.as_ref().expect("server is running");
    let code = server.code();
    if !server.buzzers_on() {
        server.update(|room| room.set_enabled(true));
    }
    Ok(LanInfo { url: format!("{url}/?r={code}"), code })
}

/// Turns the buzzers off and forgets every phone; the server stops unless it shares a file.
#[tauri::command]
pub fn lan_stop(lan: State<'_, Lan>) {
    let mut slot = lock(&lan);
    if let Some(server) = slot.as_ref() {
        server.update(|room| room.set_enabled(false));
    }
    stop_if_idle(&mut slot);
}

/// Tells the phones who plays and what the stage shows.
#[tauri::command]
pub fn lan_sync(lan: State<'_, Lan>, stage: StageInfo) {
    with_server(&lan, |s| s.update(|room| room.set_stage(stage)));
}

/// Opens the buttons for a question; a new `key` starts its order afresh.
#[tauri::command]
pub fn lan_buzz_arm(lan: State<'_, Lan>, key: String) {
    with_server(&lan, |s| s.update(|room| room.arm(&key)));
}

#[tauri::command]
pub fn lan_buzz_close(lan: State<'_, Lan>) {
    with_server(&lan, |s| s.update(|room| room.close_buzz()));
}

/// Opens the buttons again, shutting out whoever pressed first when `exclude` is set.
#[tauri::command]
pub fn lan_buzz_reopen(lan: State<'_, Lan>, exclude: bool) {
    with_server(&lan, |s| s.update(|room| room.reopen(exclude)));
}

/// Offers a game file for download. The body is the file; its name comes percent-encoded
/// in a header, since IPC headers are ASCII.
#[tauri::command]
pub fn lan_share_start<R: Runtime>(app: AppHandle<R>, lan: State<'_, Lan>, request: tauri::ipc::Request<'_>) -> Result<LanInfo, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected the file as a raw body".into());
    };
    let name = request
        .headers()
        .get(SHARE_NAME_HEADER)
        .and_then(|v| v.to_str().ok())
        .map(server::percent_decode)
        .filter(|n| !n.is_empty() && !n.contains(['/', '\\']))
        .unwrap_or_else(|| "game.gamezip".into());
    let mut slot = lock(&lan);
    let port = ensure_started(&app, &mut slot)?.port;
    let url = base_url(port).inspect_err(|_| stop_if_idle(&mut slot))?;
    let server = slot.as_ref().expect("server is running");
    server.set_file(Some(SharedFile { name, bytes: Arc::from(bytes.as_slice()) }));
    let code = server.code();
    Ok(LanInfo { url: format!("{url}/game.gamezip?r={code}"), code })
}

/// Stops offering the file; the server stops unless the buzzers are on.
#[tauri::command]
pub fn lan_share_stop(lan: State<'_, Lan>) {
    let mut slot = lock(&lan);
    if let Some(server) = slot.as_ref() {
        server.set_file(None);
    }
    stop_if_idle(&mut slot);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn nic(name: &str, ip: [u8; 4]) -> (String, Ipv4Addr) {
        (name.to_string(), Ipv4Addr::from(ip))
    }

    #[test]
    fn picks_the_routed_address_of_a_real_adapter() {
        let nics = [nic("lo0", [127, 0, 0, 1]), nic("en0", [192, 168, 1, 20]), nic("en5", [10, 0, 0, 7])];
        assert_eq!(pick_lan_ip(&nics, Some([10, 0, 0, 7].into())), Some([10, 0, 0, 7].into()));
        assert_eq!(pick_lan_ip(&nics, None), Some([192, 168, 1, 20].into()));
    }

    #[test]
    fn skips_vpn_tunnels_and_public_addresses() {
        let nics = [nic("utun3", [10, 8, 0, 2]), nic("en0", [172, 20, 10, 3]), nic("en1", [8, 8, 8, 8])];
        assert_eq!(pick_lan_ip(&nics, Some([10, 8, 0, 2].into())), Some([172, 20, 10, 3].into()));
        assert_eq!(pick_lan_ip(&[nic("en0", [8, 8, 8, 8])], Some([8, 8, 8, 8].into())), None);
    }

    #[test]
    fn room_codes_have_four_digits() {
        for _ in 0..100 {
            let code = room_code();
            assert_eq!(code.len(), 4);
            assert!(code.bytes().all(|b| b.is_ascii_digit()));
        }
        assert_eq!(random_hex(16).len(), 32);
    }
}

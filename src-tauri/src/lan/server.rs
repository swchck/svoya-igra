//! The HTTP side of the LAN room: one phone page, a small JSON API and a shared game file.
//!
//! Routes are fixed strings, so no request ever reaches the file system. Phones learn
//! about changes by long polling `/api/poll`, which parks on a condvar until the room's
//! version moves; tiny_http buffers chunked bodies, which rules out server-sent events.

use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::net::{IpAddr, SocketAddr};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};

use serde::Deserialize;
use serde_json::json;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

use super::room::{CodeGuard, LanStatus, NewPlayer, Reject, Room};

const PAGE: &str = include_str!("phone.html");
const MAX_BODY: usize = 2048;
const POLL_WAIT: Duration = Duration::from_secs(20);
/// Requests parked on their own thread at once: long polls and file downloads.
const MAX_WORKERS: usize = 64;
const STATUS_TICK: Duration = Duration::from_secs(2);

/// What the server tells the app about.
#[derive(Debug, Clone)]
pub enum Notice {
    Status(LanStatus),
    Joined(NewPlayer),
}

/// A game file offered for download.
pub struct SharedFile {
    pub name: String,
    pub bytes: Arc<[u8]>,
}

struct Shared {
    room: Mutex<Room>,
    changed: Condvar,
    stopped: AtomicBool,
    workers: AtomicUsize,
    guard: Mutex<CodeGuard>,
    file: Mutex<Option<SharedFile>>,
    last_status: Mutex<Option<LanStatus>>,
    notify: Box<dyn Fn(Notice) + Send + Sync>,
}

impl Shared {
    fn room(&self) -> MutexGuard<'_, Room> {
        self.room.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Wakes the long polls and tells the app, unless nothing it sees has changed.
    fn publish(&self, room: &Room) {
        self.changed.notify_all();
        self.report(room);
    }

    fn report(&self, room: &Room) {
        let status = room.status(Instant::now());
        let mut last = self.last_status.lock().unwrap_or_else(|e| e.into_inner());
        if last.as_ref() != Some(&status) {
            *last = Some(status.clone());
            (self.notify)(Notice::Status(status));
        }
    }
}

/// A running LAN server; stops when dropped.
pub struct LanServer {
    shared: Arc<Shared>,
    server: Arc<Server>,
    pub port: u16,
}

/// Binds the first free address of `addrs` and starts serving the room with this code.
pub fn start(addrs: &[SocketAddr], code: String, notify: impl Fn(Notice) + Send + Sync + 'static) -> std::io::Result<LanServer> {
    let server = addrs
        .iter()
        .find_map(|addr| Server::http(addr).ok())
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::AddrInUse, "no free port for the LAN server"))?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|a| a.port())
        .ok_or_else(|| std::io::Error::other("LAN server is not bound to an ip address"))?;
    let server = Arc::new(server);
    let shared = Arc::new(Shared {
        room: Mutex::new(Room::new(code)),
        changed: Condvar::new(),
        stopped: AtomicBool::new(false),
        workers: AtomicUsize::new(0),
        guard: Mutex::new(CodeGuard::default()),
        file: Mutex::new(None),
        last_status: Mutex::new(None),
        notify: Box::new(notify),
    });

    let (accept_server, accept_shared) = (server.clone(), shared.clone());
    thread::spawn(move || {
        for request in accept_server.incoming_requests() {
            if accept_shared.stopped.load(Ordering::SeqCst) {
                break;
            }
            handle(&accept_shared, request);
        }
    });

    // phones come and go without a request to say so; this notices them dropping off
    let ticker = shared.clone();
    thread::spawn(move || {
        while !ticker.stopped.load(Ordering::SeqCst) {
            thread::sleep(STATUS_TICK);
            let room = ticker.room();
            if room.enabled() {
                ticker.report(&room);
            }
        }
    });

    Ok(LanServer { shared, server, port })
}

impl LanServer {
    pub fn code(&self) -> String {
        self.shared.room().code().to_string()
    }

    /// Changes the room and tells long polls and the app about it.
    pub fn update<T>(&self, change: impl FnOnce(&mut Room) -> T) -> T {
        let mut room = self.shared.room();
        let result = change(&mut room);
        self.shared.publish(&room);
        result
    }

    pub fn buzzers_on(&self) -> bool {
        self.shared.room().enabled()
    }

    pub fn set_file(&self, file: Option<SharedFile>) {
        *self.shared.file.lock().unwrap_or_else(|e| e.into_inner()) = file;
    }

    pub fn has_file(&self) -> bool {
        self.shared.file.lock().unwrap_or_else(|e| e.into_inner()).is_some()
    }
}

impl Drop for LanServer {
    fn drop(&mut self) {
        self.shared.stopped.store(true, Ordering::SeqCst);
        self.shared.changed.notify_all();
        self.server.unblock();
    }
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("header is valid")
}

fn json_response(status: u16, body: &serde_json::Value) -> Response<Cursor<Vec<u8>>> {
    Response::from_string(body.to_string())
        .with_status_code(StatusCode(status))
        .with_header(header("Content-Type", "application/json; charset=utf-8"))
        .with_header(header("Cache-Control", "no-store"))
}

fn error(status: u16, code: &str) -> Response<Cursor<Vec<u8>>> {
    json_response(status, &json!({ "error": code }))
}

fn reject(r: Reject) -> Response<Cursor<Vec<u8>>> {
    error(r.status(), r.code())
}

fn page() -> Response<Cursor<Vec<u8>>> {
    Response::from_string(PAGE)
        .with_header(header("Content-Type", "text/html; charset=utf-8"))
        .with_header(header(
            "Content-Security-Policy",
            "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; \
             connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        ))
        .with_header(header("Cache-Control", "no-store"))
        .with_header(header("Referrer-Policy", "no-referrer"))
        .with_header(header("X-Content-Type-Options", "nosniff"))
}

/// Decodes `%XX` escapes and `+`; invalid escapes stay as they are.
pub fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let hex = |b: u8| (b as char).to_digit(16).map(|d| d as u8);
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        let escaped = (bytes[i] == b'%')
            .then(|| Some(hex(*bytes.get(i + 1)?)? << 4 | hex(*bytes.get(i + 2)?)?))
            .flatten();
        match (escaped, bytes[i]) {
            (Some(b), _) => {
                out.push(b);
                i += 3;
                continue;
            }
            (None, b'+') => out.push(b' '),
            (None, b) => out.push(b),
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn query(url: &str) -> HashMap<String, String> {
    url.split_once('?')
        .map(|(_, q)| q)
        .unwrap_or_default()
        .split('&')
        .filter_map(|pair| pair.split_once('=').or(Some((pair, ""))))
        .filter(|(k, _)| !k.is_empty())
        .map(|(k, v)| (percent_decode(k), percent_decode(v)))
        .collect()
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct Body {
    token: String,
    name: String,
    player_id: String,
    amount: i64,
    text: String,
}

fn read_body(request: &mut Request) -> Result<Body, Response<Cursor<Vec<u8>>>> {
    if request.body_length().is_some_and(|n| n > MAX_BODY) {
        return Err(error(413, "too-large"));
    }
    let mut raw = Vec::new();
    request
        .as_reader()
        .take(MAX_BODY as u64 + 1)
        .read_to_end(&mut raw)
        .map_err(|_| error(400, "bad-body"))?;
    if raw.len() > MAX_BODY {
        return Err(error(413, "too-large"));
    }
    serde_json::from_slice(&raw).map_err(|_| error(400, "bad-body"))
}

fn new_token() -> String {
    super::random_hex(16)
}

fn handle(shared: &Arc<Shared>, mut request: Request) {
    let url = request.url().to_string();
    let path = url.split('?').next().unwrap_or_default().to_string();
    let method = request.method().clone();

    if path == "/" {
        let response = if method == Method::Get || method == Method::Head { page() } else { error(405, "method") };
        let _ = request.respond(response);
        return;
    }

    let known = ["/api/poll", "/api/join", "/api/claim", "/api/leave", "/api/buzz", "/api/bet", "/api/answer", "/game.gamezip"];
    if !known.contains(&path.as_str()) {
        let _ = request.respond(Response::empty(404));
        return;
    }
    let expects_get = path == "/api/poll" || path == "/game.gamezip";
    if (method == Method::Get) != expects_get || (!expects_get && method != Method::Post) {
        let _ = request.respond(error(405, "method"));
        return;
    }

    let params = query(&url);
    let ip = request.remote_addr().map(|a| a.ip()).unwrap_or(IpAddr::from([0, 0, 0, 0]));
    {
        let mut guard = shared.guard.lock().unwrap_or_else(|e| e.into_inner());
        if !guard.allowed(ip) {
            let _ = request.respond(error(429, "too-many-codes"));
            return;
        }
        let code = params.get("r").map(String::as_str).unwrap_or_default();
        if !shared.room().check_code(code) {
            guard.fail(ip);
            let _ = request.respond(error(403, "bad-code"));
            return;
        }
    }

    match path.as_str() {
        "/api/poll" => spawn_worker(shared, request, move |shared, request| poll(shared, request, &params)),
        "/game.gamezip" => spawn_worker(shared, request, download),
        _ => {
            let response = match read_body(&mut request) {
                Ok(body) => act(shared, &path, body),
                Err(response) => response,
            };
            let _ = request.respond(response);
        }
    }
}

/// Runs a slow request on its own thread so the accept loop keeps serving buzzes.
fn spawn_worker(shared: &Arc<Shared>, request: Request, work: impl FnOnce(&Shared, Request) + Send + 'static) {
    if shared.workers.fetch_add(1, Ordering::SeqCst) >= MAX_WORKERS {
        shared.workers.fetch_sub(1, Ordering::SeqCst);
        let _ = request.respond(error(503, "busy"));
        return;
    }
    let shared = shared.clone();
    thread::spawn(move || {
        work(&shared, request);
        shared.workers.fetch_sub(1, Ordering::SeqCst);
    });
}

fn poll(shared: &Shared, request: Request, params: &HashMap<String, String>) {
    let token = params.get("t").map(String::as_str).filter(|t| !t.is_empty());
    let since: u64 = params.get("v").and_then(|v| v.parse().ok()).unwrap_or(0);
    let mut room = shared.room();
    let known = token.is_some_and(|t| room.touch(t, Instant::now()));
    if known {
        shared.publish(&room);
    }
    let (mut room, _) = shared
        .changed
        .wait_timeout_while(room, POLL_WAIT, |r| r.version() <= since && !shared.stopped.load(Ordering::SeqCst))
        .unwrap_or_else(|e| e.into_inner());
    if shared.stopped.load(Ordering::SeqCst) {
        drop(room);
        let _ = request.respond(error(503, "stopped"));
        return;
    }
    let now = Instant::now();
    if let Some(t) = token {
        room.touch(t, now);
    }
    let view = room.view(token, now);
    drop(room);
    let _ = request.respond(json_response(200, &serde_json::to_value(view).unwrap_or_default()));
}

fn act(shared: &Shared, path: &str, body: Body) -> Response<Cursor<Vec<u8>>> {
    let now = Instant::now();
    let mut room = shared.room();
    let result: Result<serde_json::Value, Reject> = match path {
        "/api/join" => {
            let token = if room.touch(&body.token, now) { body.token.clone() } else { new_token() };
            room.join(token.clone(), &body.name, format!("p_lan_{}", super::random_hex(5)), now).map(|joined| {
                if let Some(player) = joined {
                    (shared.notify)(Notice::Joined(player));
                }
                json!({ "token": token })
            })
        }
        "/api/claim" => {
            let token = if room.touch(&body.token, now) { body.token.clone() } else { new_token() };
            room.claim(token.clone(), &body.player_id, now).map(|_| json!({ "token": token }))
        }
        "/api/leave" => {
            room.leave(&body.token);
            Ok(json!({}))
        }
        "/api/buzz" => {
            room.touch(&body.token, now);
            room.buzz(&body.token).map(|position| json!({ "position": position }))
        }
        "/api/bet" => room.bet(&body.token, body.amount).map(|bet| json!({ "bet": bet })),
        "/api/answer" => room.answer(&body.token, &body.text).map(|_| json!({})),
        _ => Err(Reject::Disabled),
    };
    shared.publish(&room);
    let view_token = result.as_ref().ok().and_then(|v| v.get("token")).and_then(|t| t.as_str()).map(str::to_string);
    let view = room.view(Some(view_token.as_deref().unwrap_or(&body.token)), now);
    drop(room);
    match result {
        Ok(mut value) => {
            value["view"] = serde_json::to_value(view).unwrap_or_default();
            json_response(200, &value)
        }
        Err(r) => reject(r),
    }
}

/// `filename*` per RFC 6266 / RFC 5987, with a plain ASCII fallback for old clients.
pub fn content_disposition(name: &str) -> String {
    let ascii: String = name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || "-_.".contains(c) { c } else { '_' })
        .collect();
    let encoded: String = name
        .bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b"!#$&+-.^_`|~".contains(&b) {
                (b as char).to_string()
            } else {
                format!("%{b:02X}")
            }
        })
        .collect();
    format!("attachment; filename=\"{ascii}\"; filename*=UTF-8''{encoded}")
}

fn download(shared: &Shared, request: Request) {
    let file = shared
        .file
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .as_ref()
        .map(|f| (f.name.clone(), f.bytes.clone()));
    let Some((name, bytes)) = file else {
        let _ = request.respond(error(404, "no-file"));
        return;
    };
    let len = bytes.len();
    let response = Response::new(
        StatusCode(200),
        vec![
            header("Content-Type", "application/x-svoya-igra+zip"),
            header("Content-Disposition", &content_disposition(&name)),
            header("Cache-Control", "no-store"),
            header("X-Content-Type-Options", "nosniff"),
        ],
        Cursor::new(bytes),
        Some(len),
        None,
    );
    let _ = request.respond(response);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpStream;
    use std::sync::mpsc;

    use crate::lan::room::{RosterEntry, StageInfo};

    #[test]
    fn decodes_percent_escapes() {
        assert_eq!(percent_decode("a%20b+c"), "a b c");
        assert_eq!(percent_decode("%D0%90%D0%BD%D1%8F"), "Аня");
        assert_eq!(percent_decode("100%"), "100%");
        assert_eq!(percent_decode("%zz%4"), "%zz%4");
    }

    #[test]
    fn builds_content_disposition() {
        assert_eq!(
            content_disposition("моя игра.gamezip"),
            "attachment; filename=\"________.gamezip\"; filename*=UTF-8''%D0%BC%D0%BE%D1%8F%20%D0%B8%D0%B3%D1%80%D0%B0.gamezip"
        );
        assert!(content_disposition("a\"b.gamezip").starts_with("attachment; filename=\"a_b.gamezip\""));
    }

    struct Reply {
        status: u16,
        headers: String,
        body: String,
    }

    fn http(port: u16, method: &str, path: &str, body: &str) -> Reply {
        let mut stream = TcpStream::connect(("127.0.0.1", port)).unwrap();
        stream.set_read_timeout(Some(Duration::from_secs(30))).unwrap();
        write!(
            stream,
            "{method} {path} HTTP/1.1\r\nHost: test\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        )
        .unwrap();
        let mut reader = BufReader::new(stream);
        let mut status_line = String::new();
        reader.read_line(&mut status_line).unwrap();
        let status = status_line.split(' ').nth(1).unwrap().parse().unwrap();
        let mut headers = String::new();
        loop {
            let mut line = String::new();
            reader.read_line(&mut line).unwrap();
            if line == "\r\n" || line.is_empty() {
                break;
            }
            headers.push_str(&line);
        }
        let mut raw = Vec::new();
        reader.read_to_end(&mut raw).unwrap();
        Reply { status, headers, body: String::from_utf8_lossy(&raw).into_owned() }
    }

    fn json(reply: &Reply) -> serde_json::Value {
        serde_json::from_str(&reply.body).unwrap_or_else(|_| panic!("not json: {}", reply.body))
    }

    #[test]
    fn serves_phones_end_to_end() {
        let (tx, rx) = mpsc::channel();
        let tx = Mutex::new(tx);
        let server = start(&["127.0.0.1:0".parse().unwrap()], "4321".into(), move |n| {
            let _ = tx.lock().unwrap().send(n);
        })
        .unwrap();
        let port = server.port;
        server.update(|room| {
            room.set_enabled(true);
            room.set_stage(StageInfo {
                title: "Quiz".into(),
                roster: vec![
                    RosterEntry { id: "a".into(), name: "Аня".into(), score: 0 },
                    RosterEntry { id: "b".into(), name: "Боря".into(), score: 0 },
                ],
                allow_join: true,
                ..StageInfo::default()
            });
        });

        let page = http(port, "GET", "/", "");
        assert_eq!(page.status, 200);
        assert!(page.headers.to_lowercase().contains("content-security-policy"));
        assert!(page.body.contains("<html"));

        assert_eq!(http(port, "GET", "/etc/passwd", "").status, 404);
        assert_eq!(http(port, "GET", "/../Cargo.toml", "").status, 404);
        assert_eq!(http(port, "GET", "/api/poll?r=0000", "").status, 403);
        assert_eq!(http(port, "GET", "/api/buzz?r=4321", "").status, 405);
        let big = format!("{{\"name\":\"{}\"}}", "x".repeat(MAX_BODY));
        assert_eq!(http(port, "POST", "/api/join?r=4321", &big).status, 413);

        let anon = json(&http(port, "GET", "/api/poll?r=4321&v=0", ""));
        assert_eq!(anon["roster"].as_array().unwrap().len(), 2);
        assert_eq!(anon["me"], serde_json::Value::Null);

        let a = json(&http(port, "POST", "/api/claim?r=4321", r#"{"playerId":"a"}"#));
        let ta = a["token"].as_str().unwrap().to_string();
        assert_eq!(a["view"]["me"]["name"], "Аня");
        let g = json(&http(port, "POST", "/api/join?r=4321", r#"{"name":"  Гоша "}"#));
        let tg = g["token"].as_str().unwrap().to_string();
        assert_eq!(g["view"]["me"]["name"], "Гоша");
        let joined = rx.try_iter().find_map(|n| match n {
            Notice::Joined(p) => Some(p),
            Notice::Status(_) => None,
        });
        assert_eq!(joined.unwrap().name, "Гоша");

        let closed = http(port, "POST", "/api/buzz?r=4321", &format!(r#"{{"token":"{ta}"}}"#));
        assert_eq!((closed.status, json(&closed)["error"].as_str()), (409, Some("not-open")));

        // a poll parked on the current version wakes up when the buttons open
        let v = json(&http(port, "GET", &format!("/api/poll?r=4321&t={ta}&v=0"), ""))["v"].as_u64().unwrap();
        let waiting = thread::spawn(move || http(port, "GET", &format!("/api/poll?r=4321&t={ta}&v={v}"), ""));
        thread::sleep(Duration::from_millis(200));
        server.update(|room| room.arm("q1"));
        let woke = json(&waiting.join().unwrap());
        assert_eq!(woke["buzz"]["state"], "open");
        let ta = a["token"].as_str().unwrap();

        let first = json(&http(port, "POST", "/api/buzz?r=4321", &format!(r#"{{"token":"{tg}"}}"#)));
        let second = json(&http(port, "POST", "/api/buzz?r=4321", &format!(r#"{{"token":"{ta}"}}"#)));
        assert_eq!((first["position"].as_u64(), second["position"].as_u64()), (Some(1), Some(2)));
        assert_eq!(second["view"]["buzz"]["winner"], "Гоша");

        let status = rx
            .try_iter()
            .filter_map(|n| match n {
                Notice::Status(s) => Some(s),
                Notice::Joined(_) => None,
            })
            .last()
            .unwrap();
        assert_eq!(status.buzz.order.len(), 2);
        assert_eq!(status.buzz.order[1], "a");

        assert_eq!(http(port, "GET", "/game.gamezip?r=4321", "").status, 404);
        server.set_file(Some(SharedFile { name: "игра.gamezip".into(), bytes: Arc::from(&b"PK\x03\x04zip"[..]) }));
        let file = http(port, "GET", "/game.gamezip?r=4321", "");
        assert_eq!(file.status, 200);
        assert!(file.headers.contains("filename*=UTF-8''%D0%B8%D0%B3%D1%80%D0%B0.gamezip"));
        assert_eq!(file.body.as_bytes()[..4], *b"PK\x03\x04");
        assert_eq!(http(port, "GET", "/game.gamezip?r=1111", "").status, 403);
    }

    #[test]
    fn too_many_wrong_codes_lock_the_address_out() {
        let server = start(&["127.0.0.1:0".parse().unwrap()], "4321".into(), |_| {}).unwrap();
        for _ in 0..30 {
            assert_eq!(http(server.port, "GET", "/api/poll?r=0000", "").status, 403);
        }
        assert_eq!(http(server.port, "GET", "/api/poll?r=4321", "").status, 429);
    }

    #[test]
    fn stopping_releases_the_port_and_parked_polls() {
        let server = start(&["127.0.0.1:0".parse().unwrap()], "4321".into(), |_| {}).unwrap();
        let port = server.port;
        let v = server.update(|room| room.version());
        let waiting = thread::spawn(move || http(port, "GET", &format!("/api/poll?r=4321&v={v}"), ""));
        thread::sleep(Duration::from_millis(200));
        drop(server);
        assert_eq!(waiting.join().unwrap().status, 503);
        // tiny_http lets go of the listener on its own thread, a moment after the drop
        let rebound = (0..50).any(|_| {
            thread::sleep(Duration::from_millis(20));
            start(&[SocketAddr::from(([127, 0, 0, 1], port))], "1".into(), |_| {}).is_ok()
        });
        assert!(rebound, "the port is free again");
    }
}

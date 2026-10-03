//! Local http page that hosts YouTube embeds for the app.
//!
//! YouTube refuses to play (error 153) inside a page without an http(s) referrer, and
//! app pages are served from `tauri://`. The app frames this page instead, which frames
//! the player and relays the iframe API messages both ways. Only this one page is
//! served; the app's own assets and IPC stay on the custom protocol.

use std::thread;

use tiny_http::{Header, Response, Server};

const PAGE: &str = include_str!("youtube_bridge.html");
const PATH: &str = "/youtube";

pub struct YoutubeBridge {
    pub url: String,
}

/// Starts the server on a free loopback port and returns the page URL.
pub fn start() -> std::io::Result<YoutubeBridge> {
    let server = Server::http("127.0.0.1:0").map_err(std::io::Error::other)?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|addr| addr.port())
        .ok_or_else(|| std::io::Error::other("bridge is not bound to an ip address"))?;

    thread::spawn(move || {
        for request in server.incoming_requests() {
            let path = request.url().split('?').next().unwrap_or_default();
            let response = if path == PATH {
                Response::from_string(PAGE)
                    .with_header(header("Content-Type", "text/html; charset=utf-8"))
                    .with_header(header(
                        "Content-Security-Policy",
                        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; \
                         frame-src https://www.youtube-nocookie.com",
                    ))
                    .with_header(header("Cache-Control", "no-store"))
                    .boxed()
            } else {
                Response::empty(404).boxed()
            };
            let _ = request.respond(response);
        }
    });

    Ok(YoutubeBridge { url: format!("http://127.0.0.1:{port}{PATH}") })
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("static header is valid")
}

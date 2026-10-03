mod youtube_bridge;

use tauri::Manager;
use youtube_bridge::YoutubeBridge;

#[tauri::command]
fn youtube_bridge_url(bridge: tauri::State<'_, YoutubeBridge>) -> String {
    bridge.url.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            app.manage(youtube_bridge::start()?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![youtube_bridge_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

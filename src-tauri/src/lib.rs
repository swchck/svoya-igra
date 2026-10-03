mod lan;
mod opened_files;
mod youtube_bridge;

use tauri::Manager;
use youtube_bridge::YoutubeBridge;

#[tauri::command]
fn youtube_bridge_url(bridge: tauri::State<'_, YoutubeBridge>) -> String {
    bridge.url.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        // must come first: a second launch hands its files over and exits right here
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            opened_files::accept(app, opened_files::from_args(args, cwd.as_ref()));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(opened_files::OpenedFiles::default())
        .manage(lan::Lan::default())
        .setup(|app| {
            app.manage(youtube_bridge::start()?);
            let cwd = std::env::current_dir().unwrap_or_default();
            opened_files::accept(app.handle(), opened_files::from_args(std::env::args(), &cwd));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            youtube_bridge_url,
            opened_files::take_opened_files,
            lan::lan_start,
            lan::lan_stop,
            lan::lan_sync,
            lan::lan_buzz_arm,
            lan::lan_buzz_close,
            lan::lan_buzz_reopen,
            lan::lan_share_start,
            lan::lan_share_stop,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app, _event| {
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let tauri::RunEvent::Opened { urls } = _event {
            let paths = urls.into_iter().filter_map(|u| u.to_file_path().ok());
            opened_files::accept(_app, paths);
        }
    });
}

//! Game files handed to the app by the OS: double-click, "Open with", drag onto the icon.
//!
//! macOS delivers them as an `Opened` run event; Windows and Linux pass them as
//! command-line arguments, to this process or, when the app is already running, to the
//! second instance that forwards them here. Each accepted path is added to the fs scope,
//! so the frontend can read exactly these files and nothing else.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_fs::FsExt;

const EXTENSIONS: [&str; 3] = ["gamezip", "siq", "json"];

/// Event telling the frontend that new files are waiting.
pub const EVENT: &str = "files-opened";

#[derive(Default)]
pub struct OpenedFiles(Mutex<Vec<PathBuf>>);

fn is_game_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
        && path.is_file()
}

/// Queues the game files among `paths` and notifies the frontend.
pub fn accept<R: Runtime>(app: &AppHandle<R>, paths: impl IntoIterator<Item = PathBuf>) {
    let accepted: Vec<PathBuf> = paths
        .into_iter()
        .filter(|p| is_game_file(p))
        .filter(|p| app.fs_scope().allow_file(p).is_ok())
        .collect();
    if accepted.is_empty() {
        return;
    }
    app.state::<OpenedFiles>()
        .0
        .lock()
        .expect("opened files lock poisoned")
        .extend(accepted);
    let _ = app.emit(EVENT, ());
}

/// Turns command-line arguments into absolute paths; the first one is the executable.
pub fn from_args(args: impl IntoIterator<Item = String>, cwd: &Path) -> Vec<PathBuf> {
    args.into_iter()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .map(|a| file_url_path(&a).unwrap_or_else(|| cwd.join(a)))
        .collect()
}

// Linux file managers launch with %U and hand over file:// URLs instead of paths
fn file_url_path(arg: &str) -> Option<PathBuf> {
    let url = tauri::Url::parse(arg).ok()?;
    (url.scheme() == "file").then(|| url.to_file_path().ok()).flatten()
}

/// Hands the queued files to the frontend and forgets them.
#[tauri::command]
pub fn take_opened_files(files: tauri::State<'_, OpenedFiles>) -> Vec<String> {
    files
        .0
        .lock()
        .expect("opened files lock poisoned")
        .drain(..)
        .map(|p| p.to_string_lossy().into_owned())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_args_resolves_paths_and_file_urls() {
        let cwd = Path::new("/home/me");
        let args = ["svoya-igra", "--flag", "quiz.gamezip", "/tmp/a.json", "file:///tmp/My%20Quiz.gamezip"];
        let paths = from_args(args.map(String::from), cwd);
        assert_eq!(
            paths,
            [
                PathBuf::from("/home/me/quiz.gamezip"),
                PathBuf::from("/tmp/a.json"),
                PathBuf::from("/tmp/My Quiz.gamezip"),
            ]
        );
    }
}

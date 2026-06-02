use serde::Serialize;
use std::{
    env,
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::{Duration, Instant},
};
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, RunEvent, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};

const BACKEND_HOST: &str = "127.0.0.1";
const BACKEND_PORT: u16 = 8123;
const WINDOW_LABEL: &str = "main";

struct DesktopState {
    backend_process: Mutex<Option<Child>>,
    is_quitting: AtomicBool,
    pending_commands: Mutex<Vec<DesktopCommand>>,
}

#[derive(Clone, Serialize)]
struct DesktopCommand {
    command: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    screen: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    magnet: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    path: Option<String>,
}

impl DesktopCommand {
    fn screen(screen: impl Into<String>) -> Self {
        Self { command: "screen", screen: Some(screen.into()), magnet: None, path: None }
    }

    fn about() -> Self {
        Self { command: "about", screen: None, magnet: None, path: None }
    }

    fn magnet(magnet: impl Into<String>) -> Self {
        Self { command: "magnet", screen: None, magnet: Some(magnet.into()), path: None }
    }

    fn torrent_file(path: impl Into<String>) -> Self {
        Self { command: "torrent-file", screen: None, magnet: None, path: Some(path.into()) }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(DesktopState {
            backend_process: Mutex::new(None),
            is_quitting: AtomicBool::new(false),
            pending_commands: Mutex::new(Vec::new()),
        })
        .setup(|app| {
            start_bundled_backend(app.handle())?;
            create_main_window(app.handle())?;
            install_app_menu(app.handle())?;
            create_tray(app.handle())?;

            for command in parse_launch_commands(&env::args().collect::<Vec<_>>()) {
                queue_desktop_command(app.handle(), command);
            }

            schedule_pending_flush(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != WINDOW_LABEL {
                return;
            }
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<DesktopState>();
                if !state.is_quitting.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!("tauri.conf.json"))
        .expect("failed to build Tauri app")
        .run(|app, event| match event {
            RunEvent::Exit => terminate_backend(app),
            RunEvent::ExitRequested { .. } => {
                if let Some(state) = app.try_state::<DesktopState>() {
                    state.is_quitting.store(true, Ordering::Relaxed);
                }
            }
            _ => {}
        });
}

fn create_main_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let url = backend_url()
        .parse()
        .map(WebviewUrl::External)
        .map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;

    WebviewWindowBuilder::new(app, WINDOW_LABEL, url)
        .title("Riptide")
        .inner_size(1320.0, 860.0)
        .min_inner_size(1024.0, 720.0)
        .visible(true)
        .build()
}

fn install_app_menu(app: &AppHandle) -> tauri::Result<()> {
    let open_item = MenuItemBuilder::with_id("open", "Open Riptide").build(app)?;
    let exit_item = MenuItemBuilder::with_id("quit", "Exit").build(app)?;
    let help_item = MenuItemBuilder::with_id("help", "Open Help").build(app)?;
    let about_item = MenuItemBuilder::with_id("about", "About Riptide").build(app)?;
    let undo_item = PredefinedMenuItem::undo(app, None)?;
    let redo_item = PredefinedMenuItem::redo(app, None)?;
    let cut_item = PredefinedMenuItem::cut(app, None)?;
    let copy_item = PredefinedMenuItem::copy(app, None)?;
    let paste_item = PredefinedMenuItem::paste(app, None)?;
    let select_all_item = PredefinedMenuItem::select_all(app, None)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&open_item)
        .separator()
        .item(&exit_item)
        .build()?;
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&undo_item)
        .item(&redo_item)
        .separator()
        .item(&cut_item)
        .item(&copy_item)
        .item(&paste_item)
        .separator()
        .item(&select_all_item)
        .build()?;
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&help_item)
        .item(&about_item)
        .build()?;

    let menu = MenuBuilder::new(app)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&help_menu)
        .build()?;

    app.set_menu(menu)?;
    app.on_menu_event(|app, event| match event.id.as_ref() {
        "open" => show_main_window(app),
        "help" => dispatch_desktop_command(app, DesktopCommand::screen("help")),
        "about" => dispatch_desktop_command(app, DesktopCommand::about()),
        "quit" => request_quit(app),
        _ => {}
    });
    Ok(())
}

fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_item = MenuItemBuilder::with_id("tray-open", "Open Riptide").build(app)?;
    let help_item = MenuItemBuilder::with_id("tray-help", "Open Help").build(app)?;
    let about_item = MenuItemBuilder::with_id("tray-about", "About Riptide").build(app)?;
    let quit_item = MenuItemBuilder::with_id("tray-quit", "Quit").build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .item(&help_item)
        .item(&about_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let icon = load_app_icon()?;
    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("Riptide")
        .menu(&menu)
        .menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "tray-open" => show_main_window(app),
            "tray-help" => dispatch_desktop_command(app, DesktopCommand::screen("help")),
            "tray-about" => dispatch_desktop_command(app, DesktopCommand::about()),
            "tray-quit" => request_quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

fn load_app_icon() -> tauri::Result<Image<'static>> {
    let icon_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../assets/icon.png");
    Image::from_path(icon_path)
}

fn schedule_pending_flush(app: AppHandle) {
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(2));
        if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
            flush_pending_commands(&window);
        }
    });
}

fn backend_url() -> String {
    env::var("RIPTIDE_URL").unwrap_or_else(|_| format!("http://{}:{}", BACKEND_HOST, BACKEND_PORT))
}

fn start_bundled_backend(app: &AppHandle) -> tauri::Result<()> {
    if env::var("RIPTIDE_URL").is_ok() {
        return Ok(());
    }

    let backend_path = bundled_backend_path(app).ok_or_else(|| tauri::Error::AssetNotFound("Bundled backend was not found".into()))?;
    cleanup_stale_backends();

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;
    let downloads_dir = default_download_dir();

    std::fs::create_dir_all(&data_dir).map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;
    std::fs::create_dir_all(&downloads_dir).map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;

    let child = Command::new(backend_path)
        .env("RIPTIDE_BACKEND_HOST", BACKEND_HOST)
        .env("RIPTIDE_BACKEND_PORT", BACKEND_PORT.to_string())
        .env("TORRENT_CLIENT_DATA_DIR", data_dir)
        .env("TORRENT_CLIENT_DEFAULT_DOWNLOAD_DIR", &downloads_dir)
        .env("TORRENT_CLIENT_ALLOWED_DOWNLOAD_ROOTS", &downloads_dir)
        .env("TORRENT_CLIENT_USERNAME", env::var("TORRENT_CLIENT_USERNAME").unwrap_or_else(|_| "admin".into()))
        .env("TORRENT_CLIENT_PASSWORD", env::var("TORRENT_CLIENT_PASSWORD").unwrap_or_else(|_| "admin".into()))
        .env("TORRENT_CLIENT_CORS_ORIGINS", backend_url())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;

    let state = app.state::<DesktopState>();
    *state.backend_process.lock().expect("backend mutex poisoned") = Some(child);
    wait_for_backend()?;
    Ok(())
}

fn bundled_backend_path(app: &AppHandle) -> Option<PathBuf> {
    let candidates = if cfg!(target_os = "windows") {
        vec![
            app.path().resource_dir().ok()?.join("backend").join("riptide-backend.exe"),
            app.path().resource_dir().ok()?.join("riptide-backend.exe"),
        ]
    } else {
        vec![
            app.path().resource_dir().ok()?.join("backend").join("riptide-backend"),
            app.path().resource_dir().ok()?.join("riptide-backend"),
        ]
    };
    candidates.into_iter().find(|path| path.exists())
}

fn default_download_dir() -> PathBuf {
    if let Ok(user_profile) = env::var("USERPROFILE") {
        return PathBuf::from(user_profile).join("Downloads").join("Riptide");
    }
    PathBuf::from("Downloads").join("Riptide")
}

fn wait_for_backend() -> tauri::Result<()> {
    let deadline = Instant::now() + Duration::from_secs(20);
    let addr: SocketAddr = format!("{}:{}", BACKEND_HOST, BACKEND_PORT)
        .parse()
        .map_err(|e: std::net::AddrParseError| tauri::Error::AssetNotFound(e.to_string()))?;

    while Instant::now() < deadline {
        if TcpStream::connect_timeout(&addr, Duration::from_millis(350)).is_ok() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(300));
    }

    Err(tauri::Error::AssetNotFound("Timed out waiting for bundled backend".into()))
}

fn cleanup_stale_backends() {
    if cfg!(target_os = "windows") {
        let _ = Command::new("taskkill")
            .args(["/IM", "riptide-backend.exe", "/T", "/F"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .and_then(|mut child| child.wait());
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn queue_desktop_command(app: &AppHandle, command: DesktopCommand) {
    let state = app.state::<DesktopState>();
    state.pending_commands.lock().expect("pending commands mutex poisoned").push(command);
}

fn flush_pending_commands(window: &WebviewWindow) {
    let state = window.state::<DesktopState>();
    let pending = {
        let mut guard = state.pending_commands.lock().expect("pending commands mutex poisoned");
        guard.drain(..).collect::<Vec<_>>()
    };
    for command in pending {
        let _ = emit_command(window, &command);
    }
}

fn dispatch_desktop_command(app: &AppHandle, command: DesktopCommand) {
    if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        if emit_command(&window, &command).is_ok() {
            show_main_window(app);
            return;
        }
    }
    queue_desktop_command(app, command);
}

fn emit_command(window: &WebviewWindow, command: &DesktopCommand) -> tauri::Result<()> {
    let payload = serde_json::to_string(command).map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;
    window.eval(&format!(
        "window.dispatchEvent(new CustomEvent('riptide-desktop-command', {{ detail: {} }}));",
        payload
    ))
}

fn parse_launch_commands(args: &[String]) -> Vec<DesktopCommand> {
    let mut commands = Vec::new();
    for arg in args {
        if arg.starts_with("magnet:?") {
            commands.push(DesktopCommand::magnet(arg.clone()));
            continue;
        }
        if arg.to_ascii_lowercase().ends_with(".torrent") {
            commands.push(DesktopCommand::torrent_file(arg.clone()));
        }
    }
    commands
}

fn request_quit(app: &AppHandle) {
    if let Some(state) = app.try_state::<DesktopState>() {
        state.is_quitting.store(true, Ordering::Relaxed);
    }
    terminate_backend(app);
    app.exit(0);
}

fn terminate_backend(app: &AppHandle) {
    let Some(state) = app.try_state::<DesktopState>() else {
        return;
    };
    let mut guard = state.backend_process.lock().expect("backend mutex poisoned");
    let Some(child) = guard.as_mut() else {
        return;
    };

    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &child.id().to_string(), "/T", "/F"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .and_then(|mut taskkill| taskkill.wait());
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = child.kill();
        let _ = child.wait();
    }

    *guard = None;
}

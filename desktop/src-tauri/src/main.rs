use serde::{Deserialize, Serialize};
use std::{
    env,
    fs::OpenOptions,
    io::{Read, Write},
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
    AppHandle, Manager, RunEvent, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const BACKEND_HOST: &str = "127.0.0.1";
const BACKEND_PORT: u16 = 8123;
const TRAY_ID: &str = "main-tray";
const WINDOW_LABEL: &str = "main";

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct DesktopState {
    backend_process: Mutex<Option<Child>>,
    is_quitting: AtomicBool,
    pending_commands: Mutex<Vec<DesktopCommand>>,
}

#[derive(Default, Clone, Copy, PartialEq, Eq)]
struct TrayStatus {
    downloading: bool,
    uploading: bool,
    dl_bytes_per_sec: u64,
    ul_bytes_per_sec: u64,
    active_count: usize,
    seeding_count: usize,
}

#[derive(Deserialize)]
struct TorrentListItem {
    status: String,
    download_speed: u64,
    upload_speed: u64,
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
        Self {
            command: "screen",
            screen: Some(screen.into()),
            magnet: None,
            path: None,
        }
    }

    fn about() -> Self {
        Self {
            command: "about",
            screen: None,
            magnet: None,
            path: None,
        }
    }

    fn magnet(magnet: impl Into<String>) -> Self {
        Self {
            command: "magnet",
            screen: None,
            magnet: Some(magnet.into()),
            path: None,
        }
    }

    fn torrent_file(path: impl Into<String>) -> Self {
        Self {
            command: "torrent-file",
            screen: None,
            magnet: None,
            path: Some(path.into()),
        }
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
            start_tray_status_loop(app.handle().clone());

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

    let icon = tray_icon_for_status(TrayStatus::default(), false);
    TrayIconBuilder::with_id(TRAY_ID)
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
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

fn start_tray_status_loop(app: AppHandle) {
    thread::spawn(move || {
        let mut pulse = false;
        let mut last_status = TrayStatus::default();
        let mut last_tooltip = String::new();

        loop {
            thread::sleep(Duration::from_millis(1400));

            let Some(state) = app.try_state::<DesktopState>() else {
                break;
            };
            if state.is_quitting.load(Ordering::Relaxed) {
                break;
            }

            let status = fetch_tray_status().unwrap_or_default();
            let tooltip = tray_tooltip(status);
            let icon_changed = status != last_status;
            let is_animating = status.downloading || status.uploading;

            if let Some(tray) = app.tray_by_id(TRAY_ID) {
                if icon_changed || is_animating {
                    let _ = tray.set_icon(Some(tray_icon_for_status(status, pulse)));
                }
                if tooltip != last_tooltip {
                    let _ = tray.set_tooltip(Some(&tooltip));
                }
            }

            last_status = status;
            last_tooltip = tooltip;
            if is_animating {
                pulse = !pulse;
            } else {
                pulse = false;
            }
        }
    });
}

fn fetch_tray_status() -> Option<TrayStatus> {
    let mut stream = TcpStream::connect((BACKEND_HOST, BACKEND_PORT)).ok()?;
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
    let request = format!(
        "GET /api/torrents HTTP/1.1\r\nHost: {}:{}\r\nConnection: close\r\n\r\n",
        BACKEND_HOST, BACKEND_PORT
    );
    stream.write_all(request.as_bytes()).ok()?;

    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    let (_, body) = response.split_once("\r\n\r\n")?;
    let torrents: Vec<TorrentListItem> = serde_json::from_str(body).ok()?;

    let mut status = TrayStatus::default();
    for torrent in torrents {
        status.dl_bytes_per_sec += torrent.download_speed;
        status.ul_bytes_per_sec += torrent.upload_speed;
        if torrent.download_speed > 0 {
            status.downloading = true;
        }
        if torrent.upload_speed > 0 {
            status.uploading = true;
        }

        let state = torrent.status.to_ascii_lowercase();
        if state.contains("download") || state.contains("check") || state.contains("metadata") {
            status.active_count += 1;
        } else if state.contains("seed") {
            status.seeding_count += 1;
        }
    }

    Some(status)
}

fn tray_tooltip(status: TrayStatus) -> String {
    if status.active_count == 0
        && status.seeding_count == 0
        && !status.downloading
        && !status.uploading
    {
        return "Riptide | Idle".into();
    }

    format!(
        "Riptide | DL {} | UL {} | {} active | {} seeding",
        format_rate(status.dl_bytes_per_sec),
        format_rate(status.ul_bytes_per_sec),
        status.active_count,
        status.seeding_count
    )
}

fn tray_icon_for_status(status: TrayStatus, pulse: bool) -> Image<'static> {
    const SIZE: u32 = 32;
    let mut rgba = vec![0_u8; (SIZE * SIZE * 4) as usize];

    let background = if status.downloading && status.uploading {
        [25, 118, 210, 255]
    } else if status.downloading {
        [0, 150, 136, 255]
    } else if status.uploading {
        [255, 152, 0, 255]
    } else {
        [72, 88, 110, 255]
    };
    let accent = if pulse {
        [255, 255, 255, 255]
    } else {
        [210, 230, 255, 255]
    };
    let dim = [18, 26, 38, 255];

    fill_circle(&mut rgba, SIZE, 16, 16, 15, background);
    fill_circle(&mut rgba, SIZE, 16, 16, 10, dim);

    if status.downloading {
        draw_down_arrow(&mut rgba, SIZE, 11, 8, accent);
    }
    if status.uploading {
        draw_up_arrow(&mut rgba, SIZE, 18, 8, accent);
    }
    if !status.downloading && !status.uploading {
        fill_rect(&mut rgba, SIZE, 10, 14, 12, 3, accent);
    }

    Image::new_owned(rgba, SIZE, SIZE)
}

fn fill_circle(rgba: &mut [u8], size: u32, cx: i32, cy: i32, radius: i32, color: [u8; 4]) {
    for y in 0..size as i32 {
        for x in 0..size as i32 {
            let dx = x - cx;
            let dy = y - cy;
            if dx * dx + dy * dy <= radius * radius {
                set_pixel(rgba, size, x, y, color);
            }
        }
    }
}

fn fill_rect(rgba: &mut [u8], size: u32, x: i32, y: i32, width: i32, height: i32, color: [u8; 4]) {
    for yy in y..(y + height) {
        for xx in x..(x + width) {
            set_pixel(rgba, size, xx, yy, color);
        }
    }
}

fn draw_down_arrow(rgba: &mut [u8], size: u32, x: i32, y: i32, color: [u8; 4]) {
    fill_rect(rgba, size, x + 2, y, 3, 10, color);
    for row in 0..6 {
        let start = x - row;
        let width = 9 + row * 2;
        fill_rect(rgba, size, start, y + 8 + row, width, 1, color);
    }
}

fn draw_up_arrow(rgba: &mut [u8], size: u32, x: i32, y: i32, color: [u8; 4]) {
    fill_rect(rgba, size, x + 2, y + 6, 3, 10, color);
    for row in 0..6 {
        let start = x - row;
        let width = 9 + row * 2;
        fill_rect(rgba, size, start, y + (5 - row), width, 1, color);
    }
}

fn set_pixel(rgba: &mut [u8], size: u32, x: i32, y: i32, color: [u8; 4]) {
    if x < 0 || y < 0 || x >= size as i32 || y >= size as i32 {
        return;
    }
    let offset = ((y as u32 * size + x as u32) * 4) as usize;
    rgba[offset..offset + 4].copy_from_slice(&color);
}

fn format_rate(bytes_per_sec: u64) -> String {
    const UNITS: [&str; 4] = ["B/s", "KB/s", "MB/s", "GB/s"];
    let mut value = bytes_per_sec as f64;
    let mut unit = 0;
    while value >= 1024.0 && unit < UNITS.len() - 1 {
        value /= 1024.0;
        unit += 1;
    }
    if unit == 0 {
        format!("{} {}", bytes_per_sec, UNITS[unit])
    } else if value >= 100.0 {
        format!("{value:.0} {}", UNITS[unit])
    } else if value >= 10.0 {
        format!("{value:.1} {}", UNITS[unit])
    } else {
        format!("{value:.2} {}", UNITS[unit])
    }
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
        trace("Skipping bundled backend start because RIPTIDE_URL is set");
        return Ok(());
    }

    let backend_path = bundled_backend_path(app)
        .ok_or_else(|| tauri::Error::AssetNotFound("Bundled backend was not found".into()))?;
    trace(&format!("Bundled backend path: {}", backend_path.display()));
    cleanup_stale_backends();

    let data_dir = desktop_data_dir(app)?;
    let downloads_dir = default_download_dir();
    trace(&format!("Desktop data dir: {}", data_dir.display()));
    trace(&format!(
        "Desktop downloads dir: {}",
        downloads_dir.display()
    ));

    std::fs::create_dir_all(&data_dir).map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;
    std::fs::create_dir_all(&downloads_dir)
        .map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;

    let mut command = Command::new(backend_path);
    command
        .env("RIPTIDE_BACKEND_HOST", BACKEND_HOST)
        .env("RIPTIDE_BACKEND_PORT", BACKEND_PORT.to_string())
        .env("TORRENT_CLIENT_DATA_DIR", data_dir)
        .env("TORRENT_CLIENT_DEFAULT_DOWNLOAD_DIR", &downloads_dir)
        .env("TORRENT_CLIENT_ALLOWED_DOWNLOAD_ROOTS", &downloads_dir)
        .env(
            "TORRENT_CLIENT_USERNAME",
            env::var("TORRENT_CLIENT_USERNAME").unwrap_or_else(|_| "admin".into()),
        )
        .env(
            "TORRENT_CLIENT_PASSWORD",
            env::var("TORRENT_CLIENT_PASSWORD").unwrap_or_else(|_| "admin".into()),
        )
        .env("TORRENT_CLIENT_CORS_ORIGINS", backend_url())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    let child = command.spawn().map_err(|e| {
        trace(&format!("Failed to spawn backend: {e}"));
        tauri::Error::AssetNotFound(e.to_string())
    })?;
    trace(&format!("Spawned backend pid {}", child.id()));

    let state = app.state::<DesktopState>();
    *state
        .backend_process
        .lock()
        .expect("backend mutex poisoned") = Some(child);
    wait_for_backend()?;
    trace("Bundled backend is reachable");
    Ok(())
}

fn bundled_backend_path(app: &AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok();
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf));
    let candidates = if cfg!(target_os = "windows") {
        vec![
            resource_dir
                .as_ref()
                .map(|dir| dir.join("backend").join("riptide-backend.exe")),
            resource_dir.as_ref().map(|dir| {
                dir.join("backend")
                    .join("dist")
                    .join("win32")
                    .join("riptide-backend.exe")
            }),
            resource_dir
                .as_ref()
                .map(|dir| dir.join("riptide-backend.exe")),
            exe_dir
                .as_ref()
                .map(|dir| dir.join("backend").join("riptide-backend.exe")),
            exe_dir.as_ref().map(|dir| {
                dir.join("backend")
                    .join("dist")
                    .join("win32")
                    .join("riptide-backend.exe")
            }),
            exe_dir.as_ref().map(|dir| {
                dir.join("_up_")
                    .join("_up_")
                    .join("backend")
                    .join("dist")
                    .join("win32")
                    .join("riptide-backend.exe")
            }),
        ]
    } else {
        vec![
            resource_dir
                .as_ref()
                .map(|dir| dir.join("backend").join("riptide-backend")),
            resource_dir.as_ref().map(|dir| dir.join("riptide-backend")),
            exe_dir
                .as_ref()
                .map(|dir| dir.join("backend").join("riptide-backend")),
        ]
    };
    candidates.into_iter().flatten().find(|path| path.exists())
}

fn default_download_dir() -> PathBuf {
    if let Ok(user_profile) = env::var("USERPROFILE") {
        return PathBuf::from(user_profile)
            .join("Downloads")
            .join("Riptide");
    }
    PathBuf::from("Downloads").join("Riptide")
}

fn desktop_data_dir(app: &AppHandle) -> tauri::Result<PathBuf> {
    if cfg!(target_os = "windows") {
        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            return Ok(PathBuf::from(local_app_data).join("Riptide").join("data"));
        }
    }

    app.path()
        .app_data_dir()
        .map_err(|e| tauri::Error::AssetNotFound(e.to_string()))
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

    trace("Timed out waiting for bundled backend");
    Err(tauri::Error::AssetNotFound(
        "Timed out waiting for bundled backend".into(),
    ))
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
    state
        .pending_commands
        .lock()
        .expect("pending commands mutex poisoned")
        .push(command);
}

fn flush_pending_commands(window: &WebviewWindow) {
    let state = window.state::<DesktopState>();
    let pending = {
        let mut guard = state
            .pending_commands
            .lock()
            .expect("pending commands mutex poisoned");
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
    let payload =
        serde_json::to_string(command).map_err(|e| tauri::Error::AssetNotFound(e.to_string()))?;
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
    let mut guard = state
        .backend_process
        .lock()
        .expect("backend mutex poisoned");
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

fn trace(message: &str) {
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            let log_dir = PathBuf::from(local_app_data).join("Riptide");
            let _ = std::fs::create_dir_all(&log_dir);
            let log_path = log_dir.join("desktop-debug.log");
            if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
                let _ = writeln!(file, "{}", message);
            }
        }
    }
}

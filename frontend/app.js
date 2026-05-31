const state = {
  torrents: [],
  selectedId: null,
  filter: "all",
  label: null,
  tab: "general",
  speedHistory: [],
  authenticated: false,
  storagePath: "",
  screen: "torrents",
  settingsSection: "general",
  rssFeeds: [],
  rssRules: [],
  rssItems: [],
  rssSelectedFeed: null,
  rssShowRules: false,
  labels: [],
  addFilePreview: null,
  uiSettings: {
    autostart: true,
    notifications: false,
    theme: "Deep ocean",
    language: "en",
    incomplete_folder: true,
    encryption: "Prefer",
    compact: false,
  },
};

const qs = (selector) => document.querySelector(selector);
const list = qs("#torrent-list");
const message = qs("#message");

const RT_ICON_PATHS = {
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  folderOpen: '<path d="M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6A2 2 0 0 1 18.46 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  magnet: '<path d="M6 15V9a6 6 0 1 1 12 0v6"/><path d="M6 9H2v6h4"/><path d="M22 9h-4v6h4"/>',
  arrowUp: '<path d="m18 15-6-6-6 6"/>',
  arrowDown: '<path d="m6 9 6 6 6-6"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  server: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  hardDrive: '<path d="M22 12H2"/><path d="M5.5 5h13a2 2 0 0 1 1.8 1.1l1.7 3.4a2 2 0 0 1 .2.9V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.6a2 2 0 0 1 .2-.9l1.7-3.4A2 2 0 0 1 5.5 5z"/><path d="M6 16h.01M10 16h.01"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="m6 6 1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  disc: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
};

function icon(name, size = 16) {
  const path = RT_ICON_PATHS[name];
  if (!path) return "";
  return `<svg class="rt-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function applyTheme() {
  document.body.classList.toggle("theme-light", state.uiSettings.theme === "Pearl light");
}

const I18N = {
  en: {
    logout: "Logout", all: "All torrents", downloading: "Downloading", seeding: "Seeding",
    completed: "Completed", paused: "Paused", labels: "Labels", tools: "Tools", search: "Search",
    rss: "RSS feeds", settings: "Settings", about: "About", freeSpace: "Free space",
    addTorrent: "Add torrent", files: "Files", filterTorrents: "Filter torrents...",
    searchTitle: "Search torrents", searchPlaceholder: "Search local torrents and downloaded files...",
    rssTitle: "RSS feeds", rules: "Auto-download rules", addFeed: "Add feed",
    selectTorrent: "Select a torrent", delete: "Delete", general: "General", peers: "Peers",
    trackers: "Trackers", progress: "Progress", downloaded: "Downloaded", ratio: "Ratio",
    eta: "ETA", seeds: "Seeds", speedLimits: "Speed limits", unlimited: "Unlimited",
    download: "Download", upload: "Upload", saveLimits: "Save limits", magnetLink: "Magnet link",
    savePath: "Save path", category: "Category", cancel: "Cancel", addMagnet: "Add magnet",
    uploadFile: "Upload file", torrentFile: "Torrent file", startPaused: "Start paused",
    sequential: "Sequential download", language: "Language",
    downloads: "Downloads", bandwidth: "Bandwidth", connection: "Connection", privacy: "Privacy",
    inspect: "Inspect", resume: "Resume", pause: "Pause", openFolder: "Open download folder",
    setDownloadLimit: "Set download limit", setUploadLimit: "Set upload limit",
    clearLimits: "Clear speed limits", copyHash: "Copy info hash",
    disableSequential: "Disable sequential", superSeeding: "Super seeding",
    disableSuperSeeding: "Disable super seeding", forceReannounce: "Force reannounce",
    forceRecheck: "Force recheck", editTrackers: "Edit trackers", seedingLimits: "Seeding limits",
    queueTop: "Queue top", queueUp: "Queue up", queueDown: "Queue down", setLabel: "Set label",
    setGeneral: "General", setDownloads: "Downloads", setBandwidth: "Bandwidth limits",
    setAltSpeed: "Alternate speed schedule", setConnection: "Connection",
    setPrivacy: "Privacy", setLabels: "Labels",
    startup: "Launch Riptide on system startup",
    startupDesc: "Stored as a local UI preference; systemd service stays enabled separately",
    desktopNotify: "Desktop notifications",
    desktopNotifyDesc: "Notify when a download completes in this browser",
    theme: "Theme", defaultSaveLoc: "Default save location",
    watchFolder: "Watch folder", watchFolderDesc: "Auto-import .torrent files from this directory",
    enableWatchFolder: "Enable watch folder",
    keepIncomplete: "Keep incomplete files in download root",
    keepIncompleteDesc: "Stored as a local UI preference until incomplete-folder backend support is added",
    maxActiveDownloads: "Maximum active downloads",
    maxDlRate: "Maximum download rate", maxUlRate: "Maximum upload rate", zeroUnlimited: "0 = unlimited",
    enableAltSpeed: "Enable alt speed", enableAltSpeedDesc: "Apply lower limits on a schedule",
    altDlRate: "Alt download rate", altUlRate: "Alt upload rate",
    schedule: "Schedule", scheduleDesc: "Active hours", days: "Days",
    incomingPort: "Incoming port", listenPort: "Listen port", randomPort: "Random port on startup",
    upnp: "Map port with UPnP / NAT-PMP", dht: "Distributed Hash Table (DHT)",
    dhtDesc: "Find peers without a tracker", pex: "Peer Exchange (PEX)",
    pexDesc: "Exchange peer lists with connected peers", lsd: "Local Peer Discovery",
    globalConns: "Global connections", connsPerTorrent: "Connections per torrent",
    globalSlots: "Global upload slots", slotsPerTorrent: "Upload slots per torrent",
    connSpeed: "Connection speed", connSpeedDesc: "New outgoing connections per second",
    queueing: "Queueing", queueingDesc: "qBittorrent-style active torrent limits",
    maxActive: "Max active torrents", maxActiveUl: "Max active uploads",
    recheckTitle: "Force recheck", recheckMsg: "Recheck downloaded pieces for this torrent?",
    recheckBtn: "Recheck", seedLimitsTitle: "Seeding limits",
    seedRatioLabel: "Ratio limit, 0 = unlimited", seedTimeLabel: "Seeding time in minutes, 0 = unlimited",
    seedLimitsSaved: "Seeding limits saved",
    apply: "Apply", save: "Save", orUploadFile: "or upload a file", autoDetect: "Auto-detect",
    removeTorrent: "Remove torrent", removeTorrentMsg: "Remove this torrent from Riptide? Downloaded files will remain on disk.", removeBtn: "Remove",
    // status pills
    statusSeeding: "Seeding", statusDownloading: "Downloading", statusPaused: "Paused",
    statusChecking: "Checking", statusQueued: "Queued", statusMetadata: "Loading metadata",
    statusCompleted: "Completed", statusNotLoaded: "Not loaded",
    // storage panel
    refresh: "Refresh", open: "Open", move: "Move", actions: "Actions",
    folderType: "folder", emptyFolder: "Download folder is empty",
    createTorrentFrom: "Create torrent from this folder", createBtn: "Create",
    // labels
    noCustomSavePath: "No custom save path", editPath: "Edit path", addCustomLabel: "Add custom label",
    // modals
    editTrackersTitle: "Edit trackers", trackerUrlsLabel: "Tracker URLs, comma separated",
    addRssTitle: "Add RSS feed", feedUrlLabel: "Feed URL", feedTitleLabel: "Feed title",
    newRuleTitle: "New rule", ruleNameLabel: "Rule name",
    matchPatternLabel: "Match pattern (use * as wildcard)",
    destFolderLabel: "Destination folder",
    addLabelTitle: "Add label", labelNameLabel: "Label name",
    labelColorLabel: "Color (CSS value, e.g. #ff7a66)",
    labelPathLabel: "Default save path (optional)",
    editSavePathTitle: "Edit save path",
    deleteLabelTitle: "Delete label", deleteLabelMsg: "Delete label",
    deleteFileTitle: "Delete file", deleteFileMsg: "Permanently delete",
    extractTitle: "Extract archive", destPathLabel: "Destination path",
    moveFileTitle: "Move file",
    createTorrentTitle: "Create torrent",
    commentLabel: "Comment (optional)", defaultComment: "Created by Riptide",
    saveLocTitle: "Save location", defaultSavePathLabel: "Default save path",
    inspectArchive: "Inspect archive",
    browse: "Browse", metadataLoading: "Loading metadata...",
    pieces: "Pieces", connected: "Connected", disconnected: "Disconnected",
    dhtOn: "DHT on", dhtOff: "DHT off", footerTorrents: "torrents",
    limitDownDir: "Download limit", limitUpDir: "Upload limit",
    // detail tabs
    noFileMeta: "No file metadata yet.", noConnectedPeers: "No connected peers.",
    noTrackerMeta: "No tracker metadata yet.",
    skipAll: "Skip all", normalAll: "Normal all", highAll: "High all",
    priSkip: "Skip", priLow: "Low", priNormal: "Normal", priHigh: "High",
    filePriUpdated: "File priorities updated",
    reannounce: "Reannounce", trackerReannounced: "Tracker reannounce sent",
    unknownClient: "unknown client",
    tierLabel: "Tier", seedsLabel: "seeds", leechersLabel: "leechers",
    // props grid
    propHash: "Hash", propSavePath: "Save path", propPieceSize: "Piece size",
    propPieces: "Pieces", propFiles: "Files", propCreatedBy: "Created by",
    propCreated: "Created", propPrivate: "Private", propMaxConn: "Max connections",
    propMaxUploads: "Max uploads", propComment: "Comment",
    propPrivateYes: "yes", propPrivateNo: "no",
    // privacy settings
    encryption: "Protocol encryption", preferTcp: "Prefer TCP over uTP",
    preferTcpDesc: "Matches qBittorrent mixed mode", limitTcpOverhead: "Limit TCP overhead",
    limitTcpDesc: "qBittorrent default is off", limitUtpRate: "Limit uTP rate",
    limitUtpDesc: "qBittorrent default is on",
    multiConnSameIp: "Allow multiple connections from same IP",
    anonymousMode: "Anonymous mode", ipFilter: "IP filter",
    vpnRoute: "Route traffic through VPN interface",
    vpnRouteDesc: "nftables kill-switch restricts torrentclient to tun0 and loopback",
    authSetting: "Authentication",
    authSettingDesc: "Session cookie frontend plus Basic Auth API compatibility",
    backupSection: "Backup", backupDesc: "Includes settings, labels, RSS feeds and RSS rules",
    exportBtn: "Export", importBtn: "Import",
  },
  az: {
    logout: "Çıxış", all: "Hamısı", downloading: "Yüklənənlər", seeding: "Paylaşanlar",
    completed: "Tamamlananlar", paused: "Dayandırılanlar", labels: "Etiketlər", tools: "Alətlər",
    search: "Axtarış", rss: "RSS lentlər", settings: "Tənzimləmələr", about: "Haqqında",
    freeSpace: "Boş yer", addTorrent: "Torrent əlavə et", files: "Fayllar",
    filterTorrents: "Torrentləri süz...", searchTitle: "Torrent axtar",
    searchPlaceholder: "Lokal torrent və yüklənmiş fayllarda axtar...",
    rssTitle: "RSS lentlər", rules: "Avto-yükləmə qaydaları", addFeed: "Lent əlavə et",
    selectTorrent: "Torrent seç", delete: "Sil", general: "Ümumi", peers: "Peer-lər",
    trackers: "Tracker-lər", progress: "İrəliləyiş", downloaded: "Yüklənib",
    ratio: "Reytinq", eta: "Qalan vaxt", seeds: "Seed-lər", speedLimits: "Sürət limitləri",
    unlimited: "Limitsiz", download: "Yükləmə", upload: "Paylaşma", saveLimits: "Limitləri saxla",
    magnetLink: "Magnet link", savePath: "Saxlama yeri", category: "Kateqoriya",
    cancel: "Ləğv et", addMagnet: "Magnet əlavə et", uploadFile: "Fayl yüklə",
    torrentFile: "Torrent faylı", startPaused: "Dayandırılmış başlat",
    sequential: "Ardıcıl yükləmə", language: "Dil",
    downloads: "Yükləmələr", bandwidth: "Bant genişliyi", connection: "Bağlantı", privacy: "Məxfilik",
    inspect: "Yoxla", resume: "Davam et", pause: "Dayandır",
    openFolder: "Yükləmə qovluğunu aç", setDownloadLimit: "Yükləmə limiti qoy",
    setUploadLimit: "Paylaşma limiti qoy", clearLimits: "Limitləri sıfırla",
    copyHash: "İnfo hash-i kopyala", disableSequential: "Ardıcıllığı söndür",
    superSeeding: "Super paylaşma", disableSuperSeeding: "Super paylaşmanı söndür",
    forceReannounce: "Məcburi elan et", forceRecheck: "Məcburi yoxla",
    editTrackers: "Tracker-ləri redaktə et", seedingLimits: "Paylaşma limitləri",
    queueTop: "Növbənin başına", queueUp: "Növbədə yuxarı", queueDown: "Növbədə aşağı",
    setLabel: "Etiket qoy",
    setGeneral: "Ümumi", setDownloads: "Yükləmələr", setBandwidth: "Bant genişliyi limitləri",
    setAltSpeed: "Alternativ sürət cədvəli", setConnection: "Bağlantı",
    setPrivacy: "Məxfilik", setLabels: "Etiketlər",
    startup: "Sistem açılışında Riptide-i başlat",
    startupDesc: "Lokal UI tənzimləməsidir; systemd xidməti ayrıca aktiv qalır",
    desktopNotify: "Masaüstü bildirişlər",
    desktopNotifyDesc: "Bu brauzerdə yükləmə tamamlananda xəbər ver",
    theme: "Tema", defaultSaveLoc: "Standart saxlama yeri",
    watchFolder: "İzlənilən qovluq",
    watchFolderDesc: ".torrent fayllarını bu qovluqdan avtomatik idxal et",
    enableWatchFolder: "İzlənilən qovluğu aktiv et",
    keepIncomplete: "Tamamlanmamış faylları kök qovluqda saxla",
    keepIncompleteDesc: "Backend dəstəyi əlavə olunana qədər lokal UI tənzimləməsidir",
    maxActiveDownloads: "Maksimal aktiv yükləmə",
    maxDlRate: "Maksimal yükləmə sürəti", maxUlRate: "Maksimal paylaşma sürəti",
    zeroUnlimited: "0 = limitsiz", enableAltSpeed: "Alternativ sürəti aktiv et",
    enableAltSpeedDesc: "Cədvəl əsasında aşağı limitlər tətbiq et",
    altDlRate: "Alt yükləmə sürəti", altUlRate: "Alt paylaşma sürəti",
    schedule: "Cədvəl", scheduleDesc: "Aktiv saatlar", days: "Günlər",
    incomingPort: "Giriş portu", listenPort: "Dinləmə portu",
    randomPort: "Başlanğıcda təsadüfi port", upnp: "UPnP / NAT-PMP ilə port açıqlığı",
    dht: "Paylanmış Hash Cədvəli (DHT)", dhtDesc: "Tracker olmadan peer tap",
    pex: "Peer Mübadiləsi (PEX)", pexDesc: "Qoşulmuş peer-lərlə peer siyahısı mübadiləsi",
    lsd: "Lokal Peer Tapma", globalConns: "Qlobal bağlantılar",
    connsPerTorrent: "Torrent başına bağlantı", globalSlots: "Qlobal upload slotları",
    slotsPerTorrent: "Torrent başına slot", connSpeed: "Bağlantı sürəti",
    connSpeedDesc: "Saniyədə yeni çıxış bağlantıları", queueing: "Növbəlik",
    queueingDesc: "qBittorrent-stilindəki aktiv torrent limitləri",
    maxActive: "Maks aktiv torrent", maxActiveUl: "Maks aktiv paylaşma",
    recheckTitle: "Məcburi yoxlama", recheckMsg: "Bu torrentin yüklənmiş parçaları yenidən yoxlansın?",
    recheckBtn: "Yoxla", seedLimitsTitle: "Paylaşma limitləri",
    seedRatioLabel: "Ratio limiti, 0 = limitsiz",
    seedTimeLabel: "Paylaşma vaxtı (dəqiqə), 0 = limitsiz",
    seedLimitsSaved: "Paylaşma limitləri saxlandı",
    apply: "Tətbiq et", save: "Saxla", orUploadFile: "və ya fayl yüklə", autoDetect: "Avtomatik tap",
    removeTorrent: "Torrenti sil", removeTorrentMsg: "Bu torrent Riptide-dan silinsin? Yüklənmiş fayllar diskdə qalacaq.", removeBtn: "Sil",
    statusSeeding: "Paylaşılır", statusDownloading: "Yüklənir", statusPaused: "Dayandırılıb",
    statusChecking: "Yoxlanılır", statusQueued: "Növbədə", statusMetadata: "Metadata yüklənir",
    statusCompleted: "Tamamlandı", statusNotLoaded: "Yüklənməyib",
    refresh: "Yenilə", open: "Aç", move: "Köçür", actions: "Əməliyyatlar",
    folderType: "qovluq", emptyFolder: "Yükləmə qovluğu boşdur",
    createTorrentFrom: "Bu qovluqdan torrent yarat", createBtn: "Yarat",
    noCustomSavePath: "Xüsusi saxlama yolu yoxdur", editPath: "Yolu redaktə et",
    addCustomLabel: "Xüsusi etiket əlavə et",
    editTrackersTitle: "Tracker-ləri redaktə et", trackerUrlsLabel: "Tracker URL-ləri, vergüllə",
    addRssTitle: "RSS lent əlavə et", feedUrlLabel: "Lent URL-i", feedTitleLabel: "Lent başlığı",
    newRuleTitle: "Yeni qayda", ruleNameLabel: "Qayda adı",
    matchPatternLabel: "Uyğunluq şablonu (* joker simvol)",
    destFolderLabel: "Hədəf qovluq",
    addLabelTitle: "Etiket əlavə et", labelNameLabel: "Etiket adı",
    labelColorLabel: "Rəng (CSS dəyəri, məs. #ff7a66)",
    labelPathLabel: "Standart saxlama yolu (ixtiyari)",
    editSavePathTitle: "Saxlama yolunu redaktə et",
    deleteLabelTitle: "Etiketi sil", deleteLabelMsg: "Etiketi sil",
    deleteFileTitle: "Faylı sil", deleteFileMsg: "Həmişəlik sil",
    extractTitle: "Arxivi çıxart", destPathLabel: "Hədəf yol",
    moveFileTitle: "Faylı köçür",
    createTorrentTitle: "Torrent yarat",
    commentLabel: "Şərh (ixtiyari)", defaultComment: "Riptide tərəfindən yaradılıb",
    saveLocTitle: "Saxlama yeri", defaultSavePathLabel: "Standart saxlama yolu",
    inspectArchive: "Arxivə bax",
    browse: "Gözdən keçir", metadataLoading: "Metadata yüklənir...",
    pieces: "Parçalar", connected: "Qoşulub", disconnected: "Qoşulmayıb",
    dhtOn: "DHT açıq", dhtOff: "DHT bağlı", footerTorrents: "torrent",
    limitDownDir: "Yükləmə limiti", limitUpDir: "Paylaşma limiti",
    noFileMeta: "Fayl metadata yoxdur.", noConnectedPeers: "Qoşulmuş peer yoxdur.",
    noTrackerMeta: "Tracker metadata yoxdur.",
    skipAll: "Hamısını atla", normalAll: "Hamısı normal", highAll: "Hamısı yüksək",
    priSkip: "Atla", priLow: "Aşağı", priNormal: "Normal", priHigh: "Yüksək",
    filePriUpdated: "Fayl prioritetləri yeniləndi",
    reannounce: "Yenidən elan et", trackerReannounced: "Tracker elanı göndərildi",
    unknownClient: "naməlum client",
    tierLabel: "Dərəcə", seedsLabel: "seed", leechersLabel: "leech",
    propHash: "Hash", propSavePath: "Saxlama yolu", propPieceSize: "Parça ölçüsü",
    propPieces: "Parçalar", propFiles: "Fayllar", propCreatedBy: "Yaradan",
    propCreated: "Yaradılıb", propPrivate: "Şəxsi", propMaxConn: "Maks bağlantı",
    propMaxUploads: "Maks yükləmə", propComment: "Şərh",
    propPrivateYes: "bəli", propPrivateNo: "xeyr",
    encryption: "Protokol şifrələməsi", preferTcp: "TCP-ni uTP-dən üstün tut",
    preferTcpDesc: "qBittorrent mixed rejimi", limitTcpOverhead: "TCP əlavə yükünü məhdudlaşdır",
    limitTcpDesc: "qBittorrent standartı: söndürülü", limitUtpRate: "uTP sürətini məhdudlaşdır",
    limitUtpDesc: "qBittorrent standartı: açıq",
    multiConnSameIp: "Eyni IP-dən çoxlu bağlantıya icazə ver",
    anonymousMode: "Anonim rejim", ipFilter: "IP filter",
    vpnRoute: "Trafiki VPN interfeysinə yönləndir",
    vpnRouteDesc: "nftables kill-switch tun0 və loopback-ə məhdudlaşdırır",
    authSetting: "Autentifikasiya",
    authSettingDesc: "Session cookie + Basic Auth API uyumluluğu",
    backupSection: "Yedəkləmə", backupDesc: "Tənzimləmələr, etiketlər, RSS məlumatlarını ehtiva edir",
    exportBtn: "İxrac", importBtn: "İdxal",
  },
  ru: {
    logout: "Выйти", all: "Все", downloading: "Загружаются", seeding: "Раздаются",
    completed: "Завершены", paused: "Остановлены", labels: "Метки", tools: "Инструменты",
    search: "Поиск", rss: "RSS", settings: "Настройки", about: "О программе",
    freeSpace: "Свободно", addTorrent: "Добавить торрент", files: "Файлы",
    filterTorrents: "Фильтр торрентов...", searchTitle: "Поиск торрентов",
    searchPlaceholder: "Поиск локальных торрентов и загруженных файлов...",
    rssTitle: "RSS-ленты", rules: "Правила автозагрузки", addFeed: "Добавить ленту",
    selectTorrent: "Выберите торрент", delete: "Удалить", general: "Общее", peers: "Пиры",
    trackers: "Трекеры", progress: "Прогресс", downloaded: "Загружено", ratio: "Рейтинг",
    eta: "Осталось", seeds: "Сиды", speedLimits: "Ограничения скорости", unlimited: "Без лимита",
    download: "Загрузка", upload: "Отдача", saveLimits: "Сохранить лимиты",
    magnetLink: "Magnet-ссылка", savePath: "Путь сохранения", category: "Категория",
    cancel: "Отмена", addMagnet: "Добавить magnet", uploadFile: "Загрузить файл",
    torrentFile: "Torrent-файл", startPaused: "Запустить остановленным",
    sequential: "Последовательная загрузка", language: "Язык",
    downloads: "Загрузки", bandwidth: "Полоса пропускания",
    connection: "Подключение", privacy: "Конфиденциальность",
    inspect: "Просмотр", resume: "Возобновить", pause: "Остановить",
    openFolder: "Открыть папку загрузки", setDownloadLimit: "Лимит загрузки",
    setUploadLimit: "Лимит отдачи", clearLimits: "Сбросить лимиты скорости",
    copyHash: "Копировать info hash", disableSequential: "Отключить последовательную",
    superSeeding: "Суперраздача", disableSuperSeeding: "Отключить суперраздачу",
    forceReannounce: "Принудительный анонс", forceRecheck: "Принудительная проверка",
    editTrackers: "Редактировать трекеры", seedingLimits: "Лимиты раздачи",
    queueTop: "В начало очереди", queueUp: "Вверх в очереди", queueDown: "Вниз в очереди",
    setLabel: "Установить метку",
    setGeneral: "Общее", setDownloads: "Загрузки", setBandwidth: "Лимиты полосы пропускания",
    setAltSpeed: "Расписание альтернативной скорости", setConnection: "Подключение",
    setPrivacy: "Конфиденциальность", setLabels: "Метки",
    startup: "Запускать Riptide при старте системы",
    startupDesc: "Локальная настройка UI; служба systemd остаётся активной отдельно",
    desktopNotify: "Уведомления рабочего стола",
    desktopNotifyDesc: "Уведомлять в браузере о завершении загрузки",
    theme: "Тема", defaultSaveLoc: "Папка загрузки по умолчанию",
    watchFolder: "Отслеживаемая папка",
    watchFolderDesc: "Автоматически импортировать .torrent файлы из этой папки",
    enableWatchFolder: "Включить отслеживаемую папку",
    keepIncomplete: "Хранить незавершённые файлы в корне загрузок",
    keepIncompleteDesc: "Локальная настройка UI до добавления поддержки в backend",
    maxActiveDownloads: "Максимум активных загрузок",
    maxDlRate: "Максимальная скорость загрузки", maxUlRate: "Максимальная скорость отдачи",
    zeroUnlimited: "0 = без лимита", enableAltSpeed: "Включить альт. скорость",
    enableAltSpeedDesc: "Применять меньшие лимиты по расписанию",
    altDlRate: "Альт. скорость загрузки", altUlRate: "Альт. скорость отдачи",
    schedule: "Расписание", scheduleDesc: "Активные часы", days: "Дни",
    incomingPort: "Входящий порт", listenPort: "Порт прослушивания",
    randomPort: "Случайный порт при запуске", upnp: "Пробросить порт через UPnP / NAT-PMP",
    dht: "Распределённая хеш-таблица (DHT)", dhtDesc: "Поиск пиров без трекера",
    pex: "Обмен пирами (PEX)", pexDesc: "Обмен списками пиров с подключёнными пирами",
    lsd: "Локальный поиск пиров", globalConns: "Глобальные подключения",
    connsPerTorrent: "Подключений на торрент", globalSlots: "Глобальные слоты отдачи",
    slotsPerTorrent: "Слотов на торрент", connSpeed: "Скорость подключения",
    connSpeedDesc: "Новых исходящих подключений в секунду",
    queueing: "Очередь", queueingDesc: "Лимиты активных торрентов в стиле qBittorrent",
    maxActive: "Макс. активных торрентов", maxActiveUl: "Макс. активных раздач",
    recheckTitle: "Принудительная проверка",
    recheckMsg: "Перепроверить загруженные части этого торрента?",
    recheckBtn: "Проверить", seedLimitsTitle: "Лимиты раздачи",
    seedRatioLabel: "Лимит рейтинга, 0 = без лимита",
    seedTimeLabel: "Время раздачи в минутах, 0 = без лимита",
    seedLimitsSaved: "Лимиты раздачи сохранены",
    apply: "Применить", save: "Сохранить", orUploadFile: "или загрузить файл",
    autoDetect: "Авто-определение",
    removeTorrent: "Удалить торрент", removeTorrentMsg: "Удалить этот торрент из Riptide? Загруженные файлы останутся на диске.", removeBtn: "Удалить",
    statusSeeding: "Раздаётся", statusDownloading: "Загружается", statusPaused: "Остановлен",
    statusChecking: "Проверяется", statusQueued: "В очереди", statusMetadata: "Загрузка метаданных",
    statusCompleted: "Завершён", statusNotLoaded: "Не загружен",
    refresh: "Обновить", open: "Открыть", move: "Переместить", actions: "Действия",
    folderType: "папка", emptyFolder: "Папка загрузок пуста",
    createTorrentFrom: "Создать торрент из этой папки", createBtn: "Создать",
    noCustomSavePath: "Путь не задан", editPath: "Изменить путь",
    addCustomLabel: "Добавить метку",
    editTrackersTitle: "Редактировать трекеры", trackerUrlsLabel: "URL трекеров, через запятую",
    addRssTitle: "Добавить RSS-ленту", feedUrlLabel: "URL ленты", feedTitleLabel: "Название ленты",
    newRuleTitle: "Новое правило", ruleNameLabel: "Название правила",
    matchPatternLabel: "Шаблон совпадения (* — джокер)",
    destFolderLabel: "Папка назначения",
    addLabelTitle: "Добавить метку", labelNameLabel: "Название метки",
    labelColorLabel: "Цвет (CSS значение, напр. #ff7a66)",
    labelPathLabel: "Путь сохранения по умолчанию (необязательно)",
    editSavePathTitle: "Изменить путь сохранения",
    deleteLabelTitle: "Удалить метку", deleteLabelMsg: "Удалить метку",
    deleteFileTitle: "Удалить файл", deleteFileMsg: "Удалить навсегда",
    extractTitle: "Распаковать архив", destPathLabel: "Путь назначения",
    moveFileTitle: "Переместить файл",
    createTorrentTitle: "Создать торрент",
    commentLabel: "Комментарий (необязательно)", defaultComment: "Создано в Riptide",
    saveLocTitle: "Место сохранения", defaultSavePathLabel: "Путь сохранения по умолчанию",
    inspectArchive: "Просмотр архива",
    browse: "Обзор", metadataLoading: "Загрузка метаданных...",
    pieces: "Части", connected: "Подключено", disconnected: "Отключено",
    dhtOn: "DHT вкл", dhtOff: "DHT выкл", footerTorrents: "торрентов",
    limitDownDir: "Лимит загрузки", limitUpDir: "Лимит отдачи",
    noFileMeta: "Метаданные файлов недоступны.", noConnectedPeers: "Нет подключённых пиров.",
    noTrackerMeta: "Метаданные трекера недоступны.",
    skipAll: "Пропустить все", normalAll: "Нормально все", highAll: "Высокий все",
    priSkip: "Пропустить", priLow: "Низкий", priNormal: "Нормальный", priHigh: "Высокий",
    filePriUpdated: "Приоритеты файлов обновлены",
    reannounce: "Переанонсировать", trackerReannounced: "Анонс трекера отправлен",
    unknownClient: "неизвестный клиент",
    tierLabel: "Уровень", seedsLabel: "сиды", leechersLabel: "личеры",
    propHash: "Хеш", propSavePath: "Путь сохранения", propPieceSize: "Размер части",
    propPieces: "Части", propFiles: "Файлы", propCreatedBy: "Создан",
    propCreated: "Дата создания", propPrivate: "Приватный", propMaxConn: "Макс. подключений",
    propMaxUploads: "Макс. отдач", propComment: "Комментарий",
    propPrivateYes: "да", propPrivateNo: "нет",
    encryption: "Шифрование протокола", preferTcp: "Предпочитать TCP перед uTP",
    preferTcpDesc: "Смешанный режим qBittorrent", limitTcpOverhead: "Ограничить TCP накладные расходы",
    limitTcpDesc: "По умолчанию в qBittorrent: выкл", limitUtpRate: "Ограничить скорость uTP",
    limitUtpDesc: "По умолчанию в qBittorrent: вкл",
    multiConnSameIp: "Разрешить несколько подключений с одного IP",
    anonymousMode: "Анонимный режим", ipFilter: "IP-фильтр",
    vpnRoute: "Маршрутизировать трафик через VPN",
    vpnRouteDesc: "nftables kill-switch ограничивает клиент до tun0 и loopback",
    authSetting: "Аутентификация",
    authSettingDesc: "Cookie сессии + совместимость Basic Auth API",
    backupSection: "Резервная копия", backupDesc: "Включает настройки, метки, RSS",
    exportBtn: "Экспорт", importBtn: "Импорт",
  },
};

function l(key) {
  const lang = state.uiSettings.language || "en";
  return I18N[lang]?.[key] || I18N.en[key] || key;
}

function setText(selector, text) {
  const el = qs(selector);
  if (el) el.textContent = text;
}

function applyLanguage() {
  document.documentElement.lang = state.uiSettings.language || "en";
  setText("#logout span", l("logout"));
  const filterLabels = { all: l("all"), downloading: l("downloading"), seeding: l("seeding"), completed: l("completed"), paused: l("paused") };
  Object.entries(filterLabels).forEach(([key, value]) => {
    const btn = qs(`[data-filter="${key}"]`);
    const count = btn?.querySelector("b")?.outerHTML || "";
    if (btn) btn.innerHTML = `${icon(btn.dataset.icon)}<span>${value}</span>${count}`;
  });
  document.querySelectorAll(".sidebar-title").forEach((el, idx) => { el.textContent = idx === 0 ? l("labels") : l("tools"); });
  const screens = { search: l("search"), rss: l("rss"), settings: l("settings") };
  Object.entries(screens).forEach(([key, value]) => {
    const btn = qs(`[data-screen="${key}"]`);
    const count = btn?.querySelector("b")?.outerHTML || "";
    if (btn) btn.innerHTML = `${icon(btn.dataset.icon)}<span>${value}</span>${count}`;
  });
  const about = qs("#about-toggle");
  if (about) about.innerHTML = `${icon("info")}<span>${l("about")}</span>`;
  const free = qs(".free-space span");
  if (free) free.textContent = l("freeSpace");
  setText("#add-toggle span", l("addTorrent"));
  setText("#storage-toggle span", l("files"));
  qs("#search")?.setAttribute("placeholder", l("filterTorrents"));
  setText("#search-screen .rt-screen-title", l("searchTitle"));
  qs("#global-search")?.setAttribute("placeholder", l("searchPlaceholder"));
  setText("#rss-screen .rt-screen-title", l("rssTitle"));
  setText("#rss-rules-toggle span", l("rules"));
  setText("#rss-add-feed span", l("addFeed"));
  setText("#settings-screen .rt-screen-title", l("settings"));
  setText("#detail-empty", l("selectTorrent"));
  setText("#delete-selected span", l("delete"));
  const tabs = { general: l("general"), files: l("files"), peers: l("peers"), trackers: l("trackers") };
  Object.entries(tabs).forEach(([key, value]) => setText(`.tab[data-tab="${key}"] span`, value));
  const statLabels = ["progress", "downloaded", "ratio", "eta", "seeds", "peers"];
  document.querySelectorAll(".stats-grid span").forEach((el, idx) => { el.textContent = l(statLabels[idx]); });
  setText(".limit-panel-head span", l("speedLimits"));
  setText("#torrent-limit-clear", l("unlimited"));
  document.querySelectorAll(".limit-grid label > span").forEach((el, idx) => { el.textContent = idx === 0 ? l("download") : l("upload"); });
  setText("#torrent-limit-form button[type='submit']", l("saveLimits"));
  const settingsNavMap = { general: l("setGeneral"), downloads: l("setDownloads"), bandwidth: l("bandwidth"), connection: l("connection"), privacy: l("privacy"), labels: l("labels") };
  Object.entries(settingsNavMap).forEach(([key, value]) => {
    const btn = qs(`.settings-section[data-section="${key}"]`);
    if (btn) btn.innerHTML = `${icon(btn.dataset.icon)}<span>${value}</span>`;
  });
  setText("#storage-refresh span", l("refresh"));
  // speed chart legend — use direct children only to avoid inner .rt-lg-dot spans
  const lgItems = document.querySelectorAll(".rt-graph-legend > span");
  lgItems.forEach((el, i) => {
    const tn = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
    if (tn) tn.textContent = i === 0 ? l("download") : l("upload");
  });
  // piece map header
  setText(".rt-insp-sechead span:first-child", l("pieces"));
  setText("#add-modal-title", l("addTorrent"));
  const modalLabels = document.querySelectorAll("#add-modal .rt-modal-label");
  [l("magnetLink"), l("savePath"), l("category"), l("torrentFile"), l("savePath"), l("category")].forEach((text, idx) => {
    if (modalLabels[idx]) modalLabels[idx].childNodes[0].textContent = text + " ";
  });
  setText("#add-modal-cancel", l("cancel"));
  setText("#magnet-form button[type='submit'] span", l("addMagnet"));
  setText("#file-form button[type='submit'] span", l("uploadFile"));
  setText('label[for="magnet-start-paused"]', l("startPaused"));
  document.querySelectorAll(".rt-add-options label").forEach((el) => {
    if (el.querySelector("#magnet-start-paused,#file-start-paused")) el.lastChild.textContent = " " + l("startPaused");
    if (el.querySelector("#magnet-sequential,#file-sequential")) el.lastChild.textContent = " " + l("sequential");
  });
}

function applyThemeOverride() {
  const forcedTheme = new URLSearchParams(window.location.search).get("theme");
  if (forcedTheme === "light") state.uiSettings.theme = "Pearl light";
  if (forcedTheme === "dark") state.uiSettings.theme = "Deep ocean";
}

function applyStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    if (el.dataset.iconReady) return;
    const count = el.querySelector("b");
    const existing = el.querySelector(".title-icon,.search-icon-slot");
    if (existing) return;
    const label = Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join(" ");
    const swatch = el.querySelector(".swatch")?.outerHTML || "";
    el.innerHTML = `${icon(el.dataset.icon)}${swatch}${label ? `<span>${esc(label)}</span>` : ""}${count ? count.outerHTML : ""}`;
    el.dataset.iconReady = "1";
  });
  document.querySelectorAll(".title-icon[data-icon], .search-icon-slot[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, 18);
  });
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text || response.statusText };
  }
  if (response.status === 401) {
    showLogin();
    throw new Error(data.detail || "Authentication required");
  }
  if (!response.ok) throw new Error(data.detail || response.statusText);
  return data;
}

function showLogin(messageText = "") {
  state.authenticated = false;
  qs("#login-screen").classList.remove("hidden");
  qs("#login-message").textContent = messageText;
  qs("#login-message").classList.toggle("error", Boolean(messageText));
}

function hideLogin() {
  state.authenticated = true;
  qs("#login-screen").classList.add("hidden");
  qs("#login-message").textContent = "";
}

function bytes(value) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Number(value);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function toBytes(value, unit = "b") {
  const number = Number(value || 0);
  if (unit === "mb") return number * 1024 * 1024;
  if (unit === "kb") return number * 1024;
  return number;
}

function fromBytes(value, unit = "b") {
  if (unit === "mb") return Math.round((value || 0) / 1024 / 1024);
  if (unit === "kb") return Math.round((value || 0) / 1024);
  return value || 0;
}

function safeLinkHref(url) {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") ? url : "#";
  } catch {
    return "#";
  }
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function eta(seconds) {
  if (seconds === null || seconds === undefined) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h ? `${h}h ${m}m` : `${m}m ${s}s`;
}

function labelOf(torrent) {
  if (torrent.label) return torrent.label;
  const name = `${torrent.name} ${torrent.save_path}`.toLowerCase();
  if (/\b(iso|ubuntu|debian|fedora|arch|mint|kali|tails|centos|almalinux|rocky|opensuse|freebsd|windows.*iso|manjaro|popos|zorin)\b/.test(name) || name.endsWith(".iso")) return "iso";
  if (/\.(mp4|mkv|mp3|flac|avi|mov|wmv|aac|opus|m4v|webm|srt|sub)/.test(name)) return "media";
  if (/\b(720p|1080p|2160p|4k|bluray|blu-ray|bdrip|webrip|web-dl|hdtv|x264|x265|h264|h265|hevc|xvid|hdrip|dvdrip|remux)\b/.test(name)) return "media";
  if (/\b(game|gog|fitgirl|repack|skidrow|codex|plaza|cpy|steamrip|elamigos)\b/.test(name)) return "games";
  if (/\.(pdf|epub|mobi|azw|azw3|djvu|fb2|cbz|cbr|doc|docx)/.test(name)) return "books";
  if (/\.(exe|msi|dmg|appimage|deb|rpm|pkg|apk)/.test(name)) return "software";
  if (/\.(zip|rar|7z|tar|gz|bz2|xz|zst)/.test(name)) return "archives";
  return "other";
}

function matchesFilter(torrent) {
  const status = torrent.status.toLowerCase();
  const query = qs("#search").value.trim().toLowerCase();
  if (query && !`${torrent.name} ${torrent.info_hash} ${torrent.save_path}`.toLowerCase().includes(query)) return false;
  if (state.label && labelOf(torrent) !== state.label) return false;
  if (state.filter === "downloading" && !status.includes("downloading")) return false;
  if (state.filter === "seeding" && !status.includes("seeding")) return false;
  if (state.filter === "completed" && torrent.progress < 100) return false;
  if (state.filter === "paused" && !torrent.paused) return false;
  return true;
}

function pillClass(torrent) {
  if (torrent.paused) return "pill paused";
  const s = torrent.status.toLowerCase();
  if (s.includes("seeding")) return "pill seeding";
  if (torrent.progress >= 100) return "pill completed";
  if (s.includes("downloading") || s === "metadata loading" || s === "queued") return "pill downloading";
  if (s === "not loaded" || s === "checking" || s === "checking resume data") return "pill paused";
  return "pill";
}

function statusText(torrent) {
  if (torrent.paused) return l("statusPaused");
  const s = torrent.status.toLowerCase();
  if (s.includes("seeding")) return l("statusSeeding");
  if (s.includes("downloading")) return l("statusDownloading");
  if (s === "metadata loading") return l("statusMetadata");
  if (s === "queued") return l("statusQueued");
  if (s === "checking" || s === "checking resume data") return l("statusChecking");
  if (s === "not loaded") return l("statusNotLoaded");
  if (torrent.progress >= 100) return l("statusCompleted");
  return torrent.status;
}

function renderCounts() {
  const counts = {
    all: state.torrents.length,
    downloading: state.torrents.filter((t) => t.status.toLowerCase().includes("downloading")).length,
    seeding: state.torrents.filter((t) => t.status.toLowerCase().includes("seeding")).length,
    completed: state.torrents.filter((t) => t.progress >= 100).length,
    paused: state.torrents.filter((t) => t.paused).length,
  };
  Object.entries(counts).forEach(([key, value]) => {
    const el = qs(`#count-${key}`);
    if (el) el.textContent = value;
  });
  // Update label counts in dynamically rendered sidebar buttons
  state.labels.forEach(({ name }) => {
    const count = state.torrents.filter((t) => labelOf(t) === name).length;
    const el = qs(`#count-label-${CSS.escape(name)}`);
    if (el) el.textContent = count;
  });
  const footerCount = qs("#footer-count");
  if (footerCount) footerCount.textContent = `${counts.all} ${l("footerTorrents")}`;
}

async function loadLabels() {
  try {
    state.labels = await api("/api/labels");
    renderSidebarLabels();
    populateLabelSelects();
  } catch { /* ignore */ }
}

function renderSidebarLabels() {
  const container = qs("#sidebar-labels");
  if (!container) return;
  container.innerHTML = state.labels.map(({ name, color }) => {
    const isActive = state.label === name;
    return `<button class="label${isActive ? " active" : ""}" data-label="${esc(name)}">` +
      `<span class="swatch" style="background:${esc(color || "var(--rt-fg-4)")}"></span>` +
      `<span>${esc(name)}</span>` +
      `<b id="count-label-${esc(name)}">0</b>` +
      `</button>`;
  }).join("");
  // Attach click handlers
  container.querySelectorAll("[data-label]").forEach((button) => {
    button.onclick = () => {
      state.screen = "torrents";
      state.label = button.dataset.label;
      state.filter = "all";
      document.querySelectorAll(".nav,.label").forEach((el) => el.classList.remove("active"));
      setScreen("torrents");
      button.classList.add("active");
      renderList();
    };
  });
}

function populateLabelSelects() {
  const options = state.labels.map(({ name }) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
  ["#magnet-label", "#file-label", "#label-picker-select"].forEach((sel) => {
    const el = qs(sel);
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">Auto-detect</option>${options}`;
    if (current) el.value = current;
  });
}

async function setTorrentLabel(torrentId, label) {
  await api(`/api/torrents/${torrentId}/label`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label || null }),
  });
  await loadTorrents();
}

function openLabelPickerModal(torrentId) {
  const torrent = state.torrents.find((t) => t.torrent_id === torrentId);
  populateLabelSelects();
  const sel = qs("#label-picker-select");
  if (torrent && sel) sel.value = torrent.label || "";
  openModal("label-picker-modal");
  const cleanup = (apply) => {
    qs("#label-picker-ok").onclick = null;
    qs("#label-picker-cancel").onclick = null;
    qs("#label-picker-close").onclick = null;
    closeModal("label-picker-modal");
    if (apply) setTorrentLabel(torrentId, qs("#label-picker-select").value || null);
  };
  qs("#label-picker-ok").onclick = () => cleanup(true);
  qs("#label-picker-cancel").onclick = () => cleanup(false);
  qs("#label-picker-close").onclick = () => cleanup(false);
}

function renderList() {
  renderCounts();
  const visible = state.torrents.filter(matchesFilter);
  if (!visible.length) {
    list.innerHTML = `
      <div class="rt-empty">
        <div class="rt-empty-mark">${icon("layers", 40)}</div>
        <div class="rt-empty-title">${state.torrents.length ? "No matches" : "No torrents yet."}</div>
        <div class="rt-empty-sub">${state.torrents.length ? "Try a different filter or search term." : "Drop a .torrent file or paste a magnet link to get going."}</div>
      </div>`;
    return;
  }
  list.replaceChildren(...visible.map((torrent) => {
    const card = document.createElement("article");
    card.className = `torrent-card${state.uiSettings.compact ? " compact" : ""}${torrent.torrent_id === state.selectedId ? " active" : ""}`;
    card.onclick = () => selectTorrent(torrent.torrent_id);
    card.oncontextmenu = (e) => { e.preventDefault(); showCtxMenu(e.clientX, e.clientY, torrent.torrent_id); };
    const playIcon = torrent.paused ? "play" : "pause";
    card.innerHTML = `
      <button class="rt-row-play" data-row-toggle="${torrent.torrent_id}" aria-label="${torrent.paused ? "Resume" : "Pause"}" title="${torrent.paused ? "Resume" : "Pause"}">${icon(playIcon, 13)}</button>
      <div>
        <div class="torrent-name">${esc(torrent.name || l("metadataLoading"))}</div>
        <div class="row-meta"><span class="${pillClass(torrent)}">${esc(statusText(torrent))}</span> <span class="rt-label-badge rt-label-${labelOf(torrent)}">${labelOf(torrent)}</span> ${torrent.progress.toFixed(1)}% · ${bytes(torrent.downloaded)} / ${bytes(torrent.total_size)}</div>
        <div class="bar"><span style="width:${Math.min(torrent.progress, 100)}%"></span></div>
      </div>
      <div class="speeds">
        <div><b>↓ ${bytes(torrent.download_speed)}/s</b></div>
        <div><b>↑ ${bytes(torrent.upload_speed)}/s</b></div>
      </div>
    `;
    return card;
  }));
}

list.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-row-toggle]");
  if (!btn) return;
  e.stopPropagation();
  const id = btn.dataset.rowToggle;
  const torrent = state.torrents.find((t) => t.torrent_id === id);
  if (!torrent) return;
  await act(`/api/torrents/${id}/${torrent.paused ? "resume" : "pause"}`, "POST");
});

function renderTotals() {
  const down = state.torrents.reduce((sum, t) => sum + t.download_speed, 0);
  const up = state.torrents.reduce((sum, t) => sum + t.upload_speed, 0);
  const uploaded = state.torrents.reduce((sum, t) => sum + t.uploaded, 0);
  const downloaded = state.torrents.reduce((sum, t) => sum + t.downloaded, 0);
  const active = state.torrents.filter((t) => t.download_speed || t.upload_speed || t.status.toLowerCase().includes("downloading")).length;
  qs("#global-down").textContent = `↓ ${bytes(down)}/s`;
  qs("#global-up").textContent = `↑ ${bytes(up)}/s`;
  qs("#connection-state").textContent = `${l("connected")} (${active} active)`;
  qs("#footer-ratio").textContent = `Ratio ${downloaded ? (uploaded / downloaded).toFixed(2) : "0.00"}`;
}

function drawChart() {
  const canvas = qs("#speed-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(30, 39, 51, 0.8)";
  ctx.lineWidth = 1;
  for (let y = 30; y < height; y += 35) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (!state.speedHistory.length) return;

  const max = Math.max(1, ...state.speedHistory.flatMap((p) => [p.down, p.up]));
  const series = [
    { key: "down", stroke: "#1fe3c0", fill: "rgba(31, 227, 192, 0.18)" },
    { key: "up",   stroke: "#ff7a66", fill: "rgba(255, 122, 102, 0.15)" },
  ];

  series.forEach(({ key, stroke, fill }) => {
    const pts = state.speedHistory.map((point, i) => ({
      x: (i / Math.max(state.speedHistory.length - 1, 1)) * width,
      y: height - (point[key] / max) * (height - 20) - 10,
    }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, height);
    pts.forEach(({ x, y }) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    pts.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function renderSimpleTable(target, rows, empty, columns) {
  const el = qs(target);
  if (!rows.length) {
    el.innerHTML = `<div class="muted">${empty}</div>`;
    return;
  }
  el.innerHTML = `<div class="list-table">${rows.map((row) => `
    <div class="list-row">${columns.map((col) => `<span>${esc(col(row))}</span>`).join("")}</div>
  `).join("")}</div>`;
}

async function selectTorrent(torrentId) {
  state.selectedId = torrentId;
  renderList();
  const details = await api(`/api/torrents/${torrentId}/details`);
  const torrent = details.status;
  qs("#detail-empty").classList.add("hidden");
  qs("#detail-content").classList.remove("hidden");
  qs("#detail-name").textContent = torrent.name || l("metadataLoading");
  qs("#detail-status").textContent = statusText(torrent);
  qs("#detail-status").className = pillClass(torrent);
  qs("#stat-progress").textContent = `${torrent.progress.toFixed(1)}%`;
  qs("#stat-downloaded").textContent = bytes(torrent.downloaded);
  qs("#stat-ratio").textContent = torrent.downloaded ? (torrent.uploaded / torrent.downloaded).toFixed(2) : "0.00";
  qs("#stat-eta").textContent = eta(torrent.eta);
  qs("#stat-seeds").textContent = torrent.seeds;
  qs("#stat-peers").textContent = torrent.peers;
  const dlLimit = qs("#torrent-download-limit");
  const ulLimit = qs("#torrent-upload-limit");
  if (dlLimit && document.activeElement !== dlLimit) dlLimit.value = fromBytes(torrent.download_limit || 0, "kb");
  if (ulLimit && document.activeElement !== ulLimit) ulLimit.value = fromBytes(torrent.upload_limit || 0, "kb");

  state.speedHistory.push({ down: torrent.download_speed, up: torrent.upload_speed });
  state.speedHistory = state.speedHistory.slice(-48);
  drawChart();

  const pieceMap = qs("#piece-map");
  if (pieceMap) {
    const cols = 24;
    const rows = 5;
    const cells = cols * rows;
    const done = Math.floor((torrent.progress / 100) * cells);
    const hasPartial = done < cells && torrent.progress > 0;
    pieceMap.innerHTML = Array.from({ length: cells }, (_, i) => {
      if (i < done) return `<div class="piece-map-cell done"></div>`;
      if (i === done && hasPartial) return `<div class="piece-map-cell partial"></div>`;
      return `<div class="piece-map-cell"></div>`;
    }).join("");
    const countEl = qs("#piece-map-count");
    if (countEl) countEl.textContent = `${done} / ${cells}`;
  }
  const props = details.properties || {};
  const general = qs("#tab-general");
  general.querySelector(".rt-props-grid")?.remove();
  const created = props.creation_date ? new Date(props.creation_date * 1000).toLocaleString() : "-";
  general.insertAdjacentHTML("beforeend", `
    <div class="rt-props-grid">
      <div><span>${l("propHash")}</span><b>${esc(torrent.info_hash)}</b></div>
      <div><span>${l("propSavePath")}</span><b>${esc(torrent.save_path || "-")}</b></div>
      <div><span>${l("propPieceSize")}</span><b>${props.piece_size ? bytes(props.piece_size) : "-"}</b></div>
      <div><span>${l("propPieces")}</span><b>${esc(props.pieces ?? "-")}</b></div>
      <div><span>${l("propFiles")}</span><b>${esc(props.num_files ?? "-")}</b></div>
      <div><span>${l("propCreatedBy")}</span><b>${esc(props.created_by || "-")}</b></div>
      <div><span>${l("propCreated")}</span><b>${esc(created)}</b></div>
      <div><span>${l("propPrivate")}</span><b>${props.private ? l("propPrivateYes") : l("propPrivateNo")}</b></div>
      <div><span>${l("propMaxConn")}</span><b>${esc(props.max_connections ?? "-")}</b></div>
      <div><span>${l("propMaxUploads")}</span><b>${esc(props.max_uploads ?? "-")}</b></div>
      ${props.comment ? `<div class="wide"><span>${l("propComment")}</span><b>${esc(props.comment)}</b></div>` : ""}
    </div>
  `);

  const filesEl = qs("#tab-files");
  if (!details.files.length) {
    filesEl.innerHTML = `<div class="muted">${l("noFileMeta")}</div>`;
  } else {
    const PRI_LABELS = { 0: l("priSkip"), 1: l("priLow"), 4: l("priNormal"), 7: l("priHigh") };
    filesEl.innerHTML = `
      <div class="rt-file-toolbar">
        <button type="button" class="rt-btn rt-btn-secondary rt-btn-auto" data-files-pri="0">${icon("x", 13)} ${l("skipAll")}</button>
        <button type="button" class="rt-btn rt-btn-secondary rt-btn-auto" data-files-pri="4">${icon("check", 13)} ${l("normalAll")}</button>
        <button type="button" class="rt-btn rt-btn-secondary rt-btn-auto" data-files-pri="7">${icon("arrowUp", 13)} ${l("highAll")}</button>
      </div>
      ${details.files.map((f, idx) => {
      const pct = f.size ? Math.min((f.downloaded / f.size) * 100, 100) : 0;
      const name = f.path.split("/").pop();
      const priOpts = Object.entries(PRI_LABELS).map(([v, l]) =>
        `<option value="${v}"${(f.priority ?? 4) === Number(v) ? " selected" : ""}>${l}</option>`
      ).join("");
      return `<div class="rt-file-row">
        <div class="rt-file-main">
          <div class="rt-file-name" title="${esc(f.path)}">${esc(name)}</div>
          <div class="rt-file-track"><div class="rt-file-fill" style="width:${pct.toFixed(1)}%"></div></div>
        </div>
        <select class="rt-file-pri" data-idx="${idx}">${priOpts}</select>
        <div class="rt-file-size">${bytes(f.downloaded)} / ${bytes(f.size)}</div>
      </div>`;
    }).join("")}`;
    filesEl.querySelectorAll("[data-files-pri]").forEach((btn) => {
      btn.onclick = async () => {
        filesEl.querySelectorAll(".rt-file-pri").forEach((sel) => { sel.value = btn.dataset.filesPri; });
        const priorities = [...filesEl.querySelectorAll(".rt-file-pri")].map((s) => Number(s.value));
        try {
          await api(`/api/torrents/${state.selectedId}/files`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priorities }),
          });
          showToast(l("filePriUpdated"), "success");
        } catch (e) { showToast(e.message, "error"); }
      };
    });
    filesEl.querySelectorAll(".rt-file-pri").forEach((sel) => {
      sel.onchange = async () => {
        const priorities = [...filesEl.querySelectorAll(".rt-file-pri")].map((s) => Number(s.value));
        try {
          await api(`/api/torrents/${state.selectedId}/files`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priorities }),
          });
        } catch (e) { showToast(e.message, "error"); }
      };
    });
  }

  const peersEl = qs("#tab-peers");
  if (!details.peers.length) {
    peersEl.innerHTML = `<div class="muted">${l("noConnectedPeers")}</div>`;
  } else {
    peersEl.innerHTML = details.peers.map((p) => {
      const active = p.download_speed > 0 || p.upload_speed > 0;
      return `<div class="rt-tracker-row">
        <div class="rt-bdot" style="background:${active ? "var(--rt-aqua)" : "var(--rt-fg-4)"}"></div>
        <div class="rt-tracker-main">
          <div class="rt-tracker-url">${esc(p.ip)}</div>
          <div class="rt-tracker-meta">${esc(p.client || l("unknownClient"))} · ${esc(p.connection_type || "BT")} · ↓ ${bytes(p.download_speed)}/s ↑ ${bytes(p.upload_speed || 0)}/s · got ${bytes(p.downloaded || 0)} sent ${bytes(p.uploaded || 0)}</div>
        </div>
        <div class="rt-file-size">${p.progress != null ? p.progress.toFixed(0) + "%" : ""}</div>
      </div>`;
    }).join("");
  }

  const trackersEl = qs("#tab-trackers");
  const trackerControls = `
    <div class="rt-file-toolbar">
      <button type="button" class="rt-btn rt-btn-secondary rt-btn-auto" data-reannounce>${icon("refresh", 13)} ${l("reannounce")}</button>
      <button type="button" class="rt-btn rt-btn-secondary rt-btn-auto" data-edit-trackers>${icon("server", 13)} ${l("editTrackers")}</button>
    </div>`;
  if (!details.trackers.length) {
    trackersEl.innerHTML = `${trackerControls}<div class="muted">${l("noTrackerMeta")}</div>`;
  } else {
    trackersEl.innerHTML = trackerControls + details.trackers.map((t) => {
      const ok = !t.message || !t.message.toLowerCase().includes("error");
      return `<div class="rt-tracker-row">
        <div class="rt-bdot" style="background:${ok ? "var(--rt-success)" : "var(--rt-fg-4)"}"></div>
        <div class="rt-tracker-main">
          <div class="rt-tracker-url">${esc(t.url)}</div>
          <div class="rt-tracker-meta">${l("tierLabel")} ${esc(String(t.tier ?? ""))} · ${l("seedsLabel")} ${esc(t.scrape_complete ?? "-")} · ${l("leechersLabel")} ${esc(t.scrape_incomplete ?? "-")}${t.message ? " · " + esc(t.message) : ""}</div>
        </div>
      </div>`;
    }).join("");
  }
  trackersEl.querySelector("[data-reannounce]")?.addEventListener("click", async () => {
    try {
      await api(`/api/torrents/${torrentId}/reannounce`, { method: "POST" });
      showToast(l("trackerReannounced"), "success");
      await selectTorrent(torrentId);
    } catch (e) { showToast(e.message, "error"); }
  });
  trackersEl.querySelector("[data-edit-trackers]")?.addEventListener("click", async () => {
    const current = details.trackers.map((t) => t.url).join("\n");
    const value = await openInputModal(l("editTrackersTitle"), l("trackerUrlsLabel"), current);
    if (value === null) return;
    const urls = value.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
    try {
      await api(`/api/torrents/${torrentId}/trackers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      showToast("Trackers updated", "success");
      await selectTorrent(torrentId);
    } catch (e) { showToast(e.message, "error"); }
  });
}

let _loadingTorrents = false;

async function loadTorrents() {
  if (_loadingTorrents) return;
  _loadingTorrents = true;
  try {
    state.torrents = await api("/api/torrents");
    if (!state.selectedId && state.torrents[0]) state.selectedId = state.torrents[0].torrent_id;
    if (state.selectedId && !state.torrents.some((t) => t.torrent_id === state.selectedId)) {
      state.selectedId = state.torrents[0]?.torrent_id || null;
    }
    renderList();
    renderTotals();
    if (state.selectedId) await selectTorrent(state.selectedId);
    else {
      qs("#detail-empty").classList.remove("hidden");
      qs("#detail-content").classList.add("hidden");
    }
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    _loadingTorrents = false;
  }
}

async function loadSystem() {
  try {
    const system = await api("/api/system/status");
    const usedPercent = system.disk_total ? (system.disk_used / system.disk_total) * 100 : 0;
    qs("#free-space").textContent = bytes(system.disk_free);
    qs("#free-meter").style.width = `${Math.max(3, 100 - usedPercent)}%`;
    qs("#dht-state").textContent = system.dht_enabled ? l("dhtOn") : l("dhtOff");
    if (!state.storagePath) {
      state.storagePath = system.download_root;
      qs("#storage-path").value = state.storagePath;
    }
  } catch {
    qs("#connection-state").textContent = l("disconnected");
  }
}

function setScreen(screen) {
  state.screen = screen;
  document.querySelectorAll(".screen-page").forEach((el) => el.classList.remove("active"));
  qs(`#${screen === "torrents" ? "torrent" : screen}-screen`).classList.add("active");
  document.querySelectorAll(".nav,.label,.tool-nav").forEach((el) => el.classList.remove("active"));
  if (screen === "torrents") {
    qs(`[data-filter="${state.filter}"]`)?.classList.add("active");
  } else {
    qs(`[data-screen="${screen}"]`)?.classList.add("active");
  }
  if (screen === "rss") loadRss();
  if (screen === "settings") renderSettingsScreen();
}

async function runGlobalSearch() {
  const query = qs("#global-search").value.trim();
  if (!query) {
    qs("#search-results").innerHTML = `<div class="rt-screen-foot">Type a search term.</div>`;
    return;
  }
  const result = await api(`/api/search?q=${encodeURIComponent(query)}`);
  const torrentRows = result.torrents.map((torrent) => `
    <div class="rt-res-row">
      <span class="rt-res-name">
        <span class="rt-res-health" style="background:#34EACB"></span>
        <span class="rt-res-nm">${esc(torrent.name || torrent.info_hash)}</span>
        <span class="rt-verified">${icon("check", 10)}</span>
      </span>
      <span class="rt-res-size">${bytes(torrent.total_size || 0)}</span>
      <span class="rt-res-sp rt-mono">${esc(torrent.paused ? "paused" : "active")}</span>
      <span class="rt-res-sp rt-mono">${esc(torrent.info_hash.slice(0, 6))}</span>
      <span class="rt-res-src">${esc(torrent.save_path || "")}<span class="rt-res-age">torrent</span></span>
      <span class="rt-res-add"><button class="rt-res-btn" data-select-torrent="${esc(torrent.info_hash)}">${icon("search", 14)}</button></span>
    </div>
  `);
  const fileRows = result.files.map((file) => `
    <div class="rt-res-row">
      <span class="rt-res-name">
        <span class="rt-res-health" style="background:${file.type === "directory" ? "#5BA2FF" : "#FFB84D"}"></span>
        <span class="rt-res-nm">${esc(file.name)}</span>
      </span>
      <span class="rt-res-size">${file.type === "file" ? bytes(file.size) : l("folderType")}</span>
      <span class="rt-res-sp rt-mono">${esc(file.type)}</span>
      <span class="rt-res-sp rt-mono">local</span>
      <span class="rt-res-src">${esc(file.path)}<span class="rt-res-age">storage</span></span>
      <span class="rt-res-add"><button class="rt-res-btn" data-open-file="${esc(file.path)}">${icon(file.type === "directory" ? "folderOpen" : "folder", 14)}</button></span>
    </div>
  `);
  qs("#search-results").innerHTML = `
    <div class="rt-restable">
      <div class="rt-res-th">
        <span class="rt-res-name">Name</span>
        <span class="rt-res-size">Size</span>
        <span class="rt-res-sp">State</span>
        <span class="rt-res-sp">ID</span>
        <span class="rt-res-src">Source</span>
        <span class="rt-res-add"></span>
      </div>
      ${[...torrentRows, ...fileRows].join("") || `<div class="rt-table-empty">No local results</div>`}
    </div>
    <div class="rt-screen-foot">${torrentRows.length + fileRows.length} results · local torrents and files</div>
  `;
}

async function loadRss() {
  try {
    const [feeds, rules] = await Promise.all([api("/api/rss/feeds"), api("/api/rss/rules")]);
    state.rssFeeds = feeds;
    state.rssRules = rules;
    if (!state.rssSelectedFeed && feeds[0]) state.rssSelectedFeed = feeds[0].id;
    qs("#count-rss").textContent = feeds.length;
    renderRss();
    if (state.rssSelectedFeed && !state.rssShowRules) loadRssItems(state.rssSelectedFeed);
  } catch (error) {
    showMessage(error.message, true);
  }
}

let _rssLoadGen = 0;

async function loadRssItems(feedId) {
  const gen = ++_rssLoadGen;
  try {
    const data = await api(`/api/rss/feeds/${feedId}/items`);
    if (gen !== _rssLoadGen) return; // stale response
    state.rssItems = data.items || [];
    renderRss();
  } catch (error) {
    if (gen !== _rssLoadGen) return; // stale response
    state.rssItems = [];
    qs("#rss-panel").insertAdjacentHTML("beforeend", `<div class="screen-empty">${esc(error.message)}</div>`);
  }
}

function renderRss() {
  qs("#rss-feeds").innerHTML = state.rssFeeds.map((feed) => `
    <button class="rt-feed-item ${feed.id === state.rssSelectedFeed ? "active" : ""}" data-feed-id="${feed.id}">
      <span class="rt-feed-dot ${feed.active ? "on" : ""}"></span>
      <span class="rt-feed-main"><span class="rt-feed-title">${esc(feed.title)}</span><span class="rt-feed-url">${esc(feed.url)}</span></span>
      <span class="rt-feed-unread">${feed.active ? "on" : "off"}</span>
    </button>
  `).join("") || `<div class="rt-table-empty">No RSS feeds yet.</div>`;

  if (state.rssShowRules) {
    qs("#rss-panel").innerHTML = `
      <div class="rt-rss-content-head">
        <div><div class="rt-rss-ch-title">Auto-download rules</div><div class="rt-rss-ch-sub">New items matching a rule download automatically</div></div>
        <button id="rss-add-rule" class="rt-btn rt-btn-primary rt-btn-auto">${icon("plus", 14)} New rule</button>
      </div>
      <div class="rt-rules">${state.rssRules.map((rule) => `
        <div class="rt-rule ${rule.enabled ? "" : "off"}">
          <button data-toggle-rule="${rule.id}" class="rt-tog ${rule.enabled ? "on" : "off"}"><span class="rt-tog-knob"></span></button>
          <div class="rt-rule-main">
            <div class="rt-rule-top"><span class="rt-rule-label">${esc(rule.label)}</span><span class="rt-rule-feed">${esc(rule.feed_title || "All feeds")}</span></div>
            <code class="rt-rule-pattern">${esc(rule.pattern)}</code>
            <div class="rt-rule-dest">${icon("folder", 12)}${esc(rule.destination)}</div>
          </div>
          <div class="rt-rule-hits"><b>${rule.hits || 0}</b><span>matched</span></div>
        </div>
      `).join("") || `<div class="rt-table-empty">No rules yet.</div>`}</div>
    `;
    qs("#rss-add-rule").onclick = addRssRule;
    return;
  }

  const feed = state.rssFeeds.find((item) => item.id === state.rssSelectedFeed);
  qs("#rss-panel").innerHTML = feed ? `
    <div class="rt-rss-content-head">
      <div><div class="rt-rss-ch-title">${esc(feed.title)}</div><div class="rt-rss-ch-sub">${state.rssItems.length} items · ${esc(feed.url)}</div></div>
      <div class="rt-rss-ch-toggle">
        <span>Feed active</span>
        <button data-toggle-feed="${feed.id}" class="rt-tog ${feed.active ? "on" : "off"}"><span class="rt-tog-knob"></span></button>
        <button class="rt-icon-btn" data-refresh-feed="${feed.id}" title="Refresh">${icon("refresh", 15)}</button>
      </div>
    </div>
    <div class="rt-rss-items">${state.rssItems.map((item) => `
      <div class="rt-rss-item">
        ${icon("file", 15)}
        <div class="rt-rss-item-main"><div class="rt-rss-item-title">${esc(item.title)}</div><div class="rt-rss-item-meta">${esc(item.date || "no date")} · ${item.size ? bytes(item.size) : "size unknown"}</div></div>
        <span class="rt-rss-matched">${icon("check", 11)}Feed item</span>
        <a class="rt-res-btn" href="${safeLinkHref(item.link)}" target="_blank" rel="noreferrer">${icon("download", 14)}</a>
      </div>
    `).join("") || `<div class="rt-table-empty">No feed items loaded yet.</div>`}</div>
  ` : `<div class="rt-table-empty">Select a feed.</div>`;
}

async function addRssFeed() {
  const url = await openInputModal(l("addRssTitle"), l("feedUrlLabel"));
  if (!url) return;
  let hostname = url;
  try { hostname = new URL(url).hostname; } catch { /* use raw url */ }
  const title = await openInputModal(l("addRssTitle"), l("feedTitleLabel"), hostname);
  if (!title) return;
  await api("/api/rss/feeds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, url, active: true }),
  });
  await loadRss();
}

async function addRssRule() {
  const label = await openInputModal(l("newRuleTitle"), l("ruleNameLabel"));
  if (!label) return;
  const pattern = await openInputModal(l("newRuleTitle"), l("matchPatternLabel"), "*");
  if (!pattern) return;
  const destination = await openInputModal(l("newRuleTitle"), l("destFolderLabel"), state.storagePath || "/var/lib/torrent-client/downloads");
  if (!destination) return;
  await api("/api/rss/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, pattern, destination, feed_id: state.rssSelectedFeed, enabled: true }),
  });
  await loadRss();
}

function renderSettingsScreen() {
  const panel = qs("#settings-screen-form");
  const s = state.settings || {};
  const ui = state.uiSettings;
  const row = (title, desc, control) => `
    <div class="rt-set-row">
      <div class="rt-set-row-text"><div class="rt-set-row-title">${title}</div>${desc ? `<div class="rt-set-row-desc">${desc}</div>` : ""}</div>
      <div class="rt-set-row-control">${control}</div>
    </div>
  `;
  const toggle = (key) => `<button type="button" class="rt-tog ${s[key] ? "on" : "off"}" data-setting-toggle="${key}"><span class="rt-tog-knob"></span></button>`;
  const uiToggle = (key) => `<button type="button" class="rt-tog ${ui[key] ? "on" : "off"}" data-ui-toggle="${key}"><span class="rt-tog-knob"></span></button>`;
  if (state.settingsSection === "general") {
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">${l("setGeneral")}</div>${row(l("startup"), l("startupDesc"), uiToggle("autostart"))}${row(l("desktopNotify"), l("desktopNotifyDesc"), uiToggle("notifications"))}${row(l("theme"), "", `<button type="button" class="rt-select" data-cycle-theme>${icon("settings", 14)} ${esc(ui.theme)}</button>`)}${row(l("language"), "", `<div class="rt-seg rt-seg-inline"><button type="button" data-lang="en" class="${ui.language === "en" || !ui.language ? "active" : ""}">EN</button><button type="button" data-lang="az" class="${ui.language === "az" ? "active" : ""}">AZ</button><button type="button" data-lang="ru" class="${ui.language === "ru" ? "active" : ""}">RU</button></div>`)}</div>`;
  }
  if (state.settingsSection === "downloads") {
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">${l("setDownloads")}</div>${row(l("defaultSaveLoc"), "", `<div class="rt-pathfield">${icon("folder", 14)}<input id="screen_default_download_folder" value="${esc(s.default_download_folder || "")}" /><button type="button" class="rt-path-btn" data-browse-download>${l("browse")}</button></div>`)}${row(l("watchFolder"), l("watchFolderDesc"), `<div class="rt-pathfield">${icon("folderOpen", 14)}<input id="screen_watch_folder" value="${esc(s.watch_folder || "")}" placeholder="/var/lib/torrent-client/watch" /></div>`)}${row(l("enableWatchFolder"), "", toggle("watch_folder_enabled"))}${row(l("keepIncomplete"), l("keepIncompleteDesc"), uiToggle("incomplete_folder"))}${row(l("maxActiveDownloads"), "", `<input class="rt-numfield" id="screen_max_active_downloads" type="number" min="1" value="${s.max_active_downloads || 3}" />`)}</div>`;
  }
  if (state.settingsSection === "bandwidth") {
    const days = (s.alt_speed_days || "1111111").split("");
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayBtns = dayNames.map((d, i) =>
      `<button type="button" class="rt-day-btn${days[i] === "1" ? " active" : ""}" data-day="${i}">${d}</button>`
    ).join("");
    panel.innerHTML = `
      <div class="rt-set-group">
        <div class="rt-set-grouphead">${l("setBandwidth")}</div>
        ${row(l("maxDlRate"), l("zeroUnlimited"), `<div class="rt-numunit"><input class="rt-numfield" id="screen_global_download_limit" type="number" min="0" value="${fromBytes(s.global_download_limit, "kb")}" /><span>KB/s</span></div>`)}
        ${row(l("maxUlRate"), l("zeroUnlimited"), `<div class="rt-numunit"><input class="rt-numfield" id="screen_global_upload_limit" type="number" min="0" value="${fromBytes(s.global_upload_limit, "kb")}" /><span>KB/s</span></div>`)}
        <div class="rt-set-note">${icon("gauge", 14)}Global limits are applied directly to the libtorrent session.</div>
      </div>
      <div class="rt-set-group">
        <div class="rt-set-grouphead">${l("setAltSpeed")}</div>
        ${row(l("enableAltSpeed"), l("enableAltSpeedDesc"), toggle("alt_speed_enabled"))}
        ${row(l("altDlRate"), l("zeroUnlimited"), `<div class="rt-numunit"><input class="rt-numfield" id="screen_alt_speed_dl" type="number" min="0" value="${fromBytes(s.alt_speed_dl, "kb")}" /><span>KB/s</span></div>`)}
        ${row(l("altUlRate"), l("zeroUnlimited"), `<div class="rt-numunit"><input class="rt-numfield" id="screen_alt_speed_ul" type="number" min="0" value="${fromBytes(s.alt_speed_ul, "kb")}" /><span>KB/s</span></div>`)}
        ${row(l("schedule"), l("scheduleDesc"), `<div class="rt-alttime"><input class="rt-timefield" id="screen_alt_begin" type="time" value="${esc(s.alt_speed_begin || "09:00")}" /> <span>to</span> <input class="rt-timefield" id="screen_alt_end" type="time" value="${esc(s.alt_speed_end || "23:00")}" /></div>`)}
        ${row(l("days"), "", `<div class="rt-day-row" id="alt-day-row">${dayBtns}</div>`)}
      </div>`;
  }
  if (state.settingsSection === "connection") {
    panel.innerHTML = `
      <div class="rt-set-group">
        <div class="rt-set-grouphead">${l("setConnection")}</div>
        ${row(l("incomingPort"), "libtorrent listens on 6881-6891", `<input class="rt-numfield" value="6881" disabled />`)}
        ${row(l("listenPort"), "", `<input class="rt-numfield" id="screen_listen_port" type="number" min="1" max="65535" value="${s.listen_port || 6881}" />`)}
        ${row(l("randomPort"), "", toggle("random_port"))}
        ${row(l("upnp"), "", toggle("upnp_enabled"))}
        ${row(l("dht"), l("dhtDesc"), toggle("dht_enabled"))}
        ${row(l("pex"), l("pexDesc"), toggle("pex_enabled"))}
        ${row(l("lsd"), "", toggle("lsd_enabled"))}
        ${row(l("globalConns"), "", `<input class="rt-numfield" id="screen_global_connections_limit" type="number" min="1" value="${s.global_connections_limit || 500}" />`)}
        ${row(l("connsPerTorrent"), "", `<input class="rt-numfield" id="screen_torrent_connections_limit" type="number" min="1" value="${s.torrent_connections_limit || 100}" />`)}
        ${row(l("globalSlots"), "", `<input class="rt-numfield" id="screen_global_upload_slots" type="number" min="1" value="${s.global_upload_slots || 20}" />`)}
        ${row(l("slotsPerTorrent"), "", `<input class="rt-numfield" id="screen_torrent_upload_slots" type="number" min="1" value="${s.torrent_upload_slots || 4}" />`)}
        ${row(l("connSpeed"), l("connSpeedDesc"), `<input class="rt-numfield" id="screen_connection_speed" type="number" min="1" value="${s.connection_speed || 30}" />`)}
        ${row(l("queueing"), l("queueingDesc"), toggle("queueing_enabled"))}
        ${row(l("maxActive"), "", `<input class="rt-numfield" id="screen_max_active_torrents" type="number" min="1" value="${s.max_active_torrents || 500}" />`)}
        ${row(l("maxActiveUl"), "", `<input class="rt-numfield" id="screen_max_active_uploads" type="number" min="1" value="${s.max_active_uploads || 5}" />`)}
      </div>`;
  }
  if (state.settingsSection === "labels") {
    const labelRows = state.labels.map((lbl) => `
      <div class="rt-set-row">
        <div class="rt-set-row-text">
          <div class="rt-set-row-title" style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${esc(lbl.color || "var(--rt-fg-4)")};flex-shrink:0;"></span>
            ${esc(lbl.name)}${lbl.builtin ? ` <span style="font-size:10px;color:var(--rt-fg-4);font-weight:400;">(built-in)</span>` : ""}
          </div>
          <div class="rt-set-row-desc">${lbl.save_path ? esc(lbl.save_path) : l("noCustomSavePath")}</div>
        </div>
        <div class="rt-set-row-control" style="display:flex;gap:8px;">
          <button type="button" class="rt-btn rt-btn-secondary rt-btn-auto" data-edit-label="${esc(lbl.name)}">${icon("folder", 13)} ${l("editPath")}</button>
          ${!lbl.builtin ? `<button type="button" class="rt-btn rt-btn-danger rt-btn-auto" data-delete-label="${esc(lbl.name)}">${icon("trash", 13)} Delete</button>` : ""}
        </div>
      </div>`).join("");
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">${l("setLabels")}</div>${labelRows || `<div class="rt-set-row"><div class="rt-set-row-text" style="color:var(--rt-fg-3)">${l("noCustomSavePath")}</div></div>`}<div style="padding-top:12px;"><button type="button" class="rt-btn rt-btn-primary rt-btn-auto" id="add-custom-label">${icon("plus", 13)} ${l("addCustomLabel")}</button></div></div>`;
    panel.querySelector("#add-custom-label")?.addEventListener("click", async () => {
      const name = await openInputModal(l("addLabelTitle"), l("labelNameLabel"));
      if (!name) return;
      const color = await openInputModal(l("addLabelTitle"), l("labelColorLabel"), "#5ba2ff");
      const save_path = await openInputModal(l("addLabelTitle"), l("labelPathLabel"), "");
      try {
        await api("/api/labels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color: color || "#5ba2ff", save_path: save_path || null }) });
        await loadLabels();
        renderSettingsScreen();
        showToast("Label created", "success");
      } catch (e) { showToast(e.message, "error"); }
    });
    panel.querySelectorAll("[data-edit-label]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const name = btn.dataset.editLabel;
        const lbl = state.labels.find((l) => l.name === name);
        const save_path = await openInputModal(l("editSavePathTitle"), `${l("savePath")} "${name}"`, lbl?.save_path || "");
        if (save_path === null) return;
        try {
          await api(`/api/labels/${encodeURIComponent(name)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ save_path: save_path || null }) });
          await loadLabels();
          renderSettingsScreen();
          showToast("Label updated", "success");
        } catch (e) { showToast(e.message, "error"); }
      });
    });
    panel.querySelectorAll("[data-delete-label]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const name = btn.dataset.deleteLabel;
        const ok = await openConfirmModal(l("deleteLabelTitle"), `${l("deleteLabelMsg")} "${name}"?`, l("delete"));
        if (!ok) return;
        try {
          await api(`/api/labels/${encodeURIComponent(name)}`, { method: "DELETE" });
          await loadLabels();
          renderSettingsScreen();
          showToast("Label deleted", "success");
        } catch (e) { showToast(e.message, "error"); }
      });
    });
    return;
  }
  if (state.settingsSection === "privacy") {
    const encButtons = [["Disabled", 0], ["Prefer", 1], ["Require", 2]].map(([label, value]) =>
      `<button type="button" data-encryption="${label}" data-enc-policy="${value}" class="${Number(s.encryption_policy || 0) === value ? "active" : ""}">${label}</button>`
    ).join("");
    panel.innerHTML = `<div class="rt-set-group"><div class="rt-set-grouphead">${l("setPrivacy")}</div>${row(l("encryption"), "", `<div class="rt-seg rt-seg-inline">${encButtons}</div>`)}${row(l("preferTcp"), l("preferTcpDesc"), `<button type="button" class="rt-tog ${Number(s.utp_tcp_mixed_mode || 0) === 0 ? "on" : "off"}" data-mixed-mode><span class="rt-tog-knob"></span></button>`)}${row(l("limitTcpOverhead"), l("limitTcpDesc"), toggle("limit_tcp_overhead"))}${row(l("limitUtpRate"), l("limitUtpDesc"), toggle("limit_utp_rate"))}${row(l("multiConnSameIp"), "", toggle("allow_multiple_connections_from_same_ip"))}${row(l("anonymousMode"), "", toggle("anonymous_mode"))}${row(l("ipFilter"), "One CIDR or start-end range per line", `<textarea id="screen_ip_filter" class="rt-textarea" placeholder="203.0.113.0/24">${esc(s.ip_filter || "")}</textarea>`)}${row(l("vpnRoute"), l("vpnRouteDesc"), `<span class="rt-select">${icon("shield", 14)} enabled</span>`)}${row(l("authSetting"), l("authSettingDesc"), `<span class="rt-select">${icon("lock", 14)} enabled</span>`)}<div class="rt-set-note">${icon("lock", 14)}Riptide stores credentials locally in /etc/torrent-client.env and sends no telemetry.</div></div>`;
  }
  if (state.settingsSection === "general") {
    panel.insertAdjacentHTML("beforeend", `<div class="rt-set-group"><div class="rt-set-grouphead">${l("backupSection")}</div>${row(l("backupDesc"), "", `<div class="rt-inline-actions"><button type="button" class="rt-btn rt-btn-secondary rt-btn-auto" data-export-settings>${icon("download", 13)} ${l("exportBtn")}</button><button type="button" class="rt-btn rt-btn-secondary rt-btn-auto" data-import-settings>${icon("upload", 13)} ${l("importBtn")}</button><input id="settings-import-file" class="hidden" type="file" accept="application/json,.json" /></div>`)}</div>`);
  }
  panel.insertAdjacentHTML("beforeend", `<div class="settings-save-row"><button class="rt-btn rt-btn-primary rt-btn-auto" type="submit">${icon("check", 14)} Save settings</button></div>`);
}

function parentPath(path) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return `/${parts.join("/")}`;
}

async function loadStorage(path = state.storagePath) {
  try {
    const data = await api(`/api/files?path=${encodeURIComponent(path || "")}`);
    state.storagePath = data.path;
    qs("#storage-path").value = data.path;
    const rows = [];
    if (!data.roots.includes(data.path)) {
      rows.push(`<div class="storage-row"><span>${icon("folderOpen", 14)} ..</span><span></span><button data-open="${esc(parentPath(data.path))}">${icon("folderOpen", 14)} ${l("open")}</button><span></span></div>`);
    }
    rows.push(`<div class="storage-row storage-action-row"><span>${icon("magnet", 14)} ${l("createTorrentFrom")}</span><span></span><button data-create-torrent="${esc(data.path)}">${icon("plus", 14)} ${l("createBtn")}</button><span></span><span></span></div>`);
    rows.push(...data.items.map((item) => `
      <div class="storage-row">
        <span title="${esc(item.path)}">${icon(item.type === "directory" ? "folder" : "file", 14)} ${esc(item.name)}</span>
        <span>${item.type === "file" ? bytes(item.size) : l("folderType")}</span>
        <button data-open="${esc(item.path)}">${icon(item.type === "directory" ? "folderOpen" : "folder", 14)} ${item.type === "directory" ? l("open") : l("move")}</button>
        ${item.type === "file" ? `<button data-file-actions="${esc(item.path)}" data-file-iso="${item.is_iso ? "1" : ""}" data-file-archive="${item.is_archive ? "1" : ""}">${icon("more-horizontal", 14)} ${l("actions")}</button>` : `<span></span>`}
        <button class="danger" data-delete="${esc(item.path)}">${icon("trash", 14)} ${l("delete")}</button>
      </div>
    `));
    qs("#storage-list").innerHTML = rows.length ? rows.join("") : `<div class="muted">${l("emptyFolder")}</div>`;
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function moveStorageItem(path) {
  const name = path.split("/").pop();
  const destination = await openInputModal(l("moveFileTitle"), l("destPathLabel"), `${state.storagePath}/${name}`);
  if (!destination || destination === path) return;
  await api("/api/files/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: path, destination }),
  });
  await loadStorage();
}

async function deleteStorageItem(path) {
  const confirmed = await openConfirmModal(l("deleteFileTitle"), `${l("deleteFileMsg")} "${path.split("/").pop()}"?`, l("delete"));
  if (!confirmed) return;
  await api("/api/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  await loadStorage();
}

async function showArchiveContents(path) {
  const data = await api("/api/files/archive/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const text = data.entries.length
    ? data.entries.map((entry) => `${entry.path}  (${bytes(entry.size)})`).join("\n")
    : "Archive is empty.";
  openTextPreviewModal(`Archive contents: ${path.split("/").pop()}`, text);
}

async function extractArchive(path) {
  const suggested = path.replace(/\.(zip|tar|gz|tgz|bz2|xz|7z|rar)$/i, "");
  const destination = await openInputModal(l("extractTitle"), l("destPathLabel"), suggested);
  if (!destination) return;
  const result = await api("/api/files/archive/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, destination }),
  });
  showToast(`Archive extracted to ${result.destination}`, "success");
  await loadStorage(result.destination);
}

async function mountIso(path) {
  const result = await api("/api/files/iso/mount", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const text = result.mount_point
    ? `Mounted at ${result.mount_point}\nDevice: ${result.device}`
    : `Mounted device: ${result.device}`;
  openTextPreviewModal(`ISO mounted: ${path.split("/").pop()}`, text);
}

async function showChecksum(path) {
  const result = await api("/api/files/checksum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  openTextPreviewModal(`Checksums: ${path.split("/").pop()}`, `MD5    ${result.md5}\nSHA256 ${result.sha256}`);
}

function openDownloadedFile(path) {
  window.open(`/api/files/download?path=${encodeURIComponent(path)}`, "_blank", "noopener");
}

function showStorageCtxMenu(x, y, path, options = {}) {
  const menu = qs("#ctx-menu");
  menu.innerHTML = `
    <button class="rt-ctx-item hl" data-storage-ctx="open-file" role="menuitem">
      <span>${icon("folderOpen", 14)}</span><span>Open / download</span>
    </button>
    ${options.isArchive ? `<button class="rt-ctx-item" data-storage-ctx="inspect-archive" role="menuitem"><span>${icon("file", 14)}</span><span>${l("inspectArchive")}</span></button>` : ""}
    ${options.isArchive ? `<button class="rt-ctx-item" data-storage-ctx="extract-archive" role="menuitem"><span>${icon("download", 14)}</span><span>Extract archive</span></button>` : ""}
    ${options.isIso ? `<button class="rt-ctx-item" data-storage-ctx="mount-iso" role="menuitem"><span>${icon("disc", 14)}</span><span>Mount ISO</span></button>` : ""}
    <button class="rt-ctx-item" data-storage-ctx="checksum" role="menuitem">
      <span>${icon("check", 14)}</span><span>Show checksums</span>
    </button>
  `;
  menu.dataset.storagePath = path;
  delete menu.dataset.torrentId;
  menu.style.left = `${Math.min(x, window.innerWidth - 250)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 350)}px`;
  menu.classList.remove("hidden");
}

async function createTorrentFromPath(sourcePath) {
  const trackersRaw = await openInputModal(l("createTorrentTitle"), l("trackerUrlsLabel"), "");
  if (trackersRaw === null) return;
  const comment = await openInputModal(l("createTorrentTitle"), l("commentLabel"), l("defaultComment"));
  const trackers = trackersRaw.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
  try {
    const response = await fetch("/api/torrents/create-file", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_path: sourcePath, trackers, comment: comment || "" }),
    });
    if (!response.ok) {
      let detail = response.statusText;
      try { detail = (await response.json()).detail || detail; } catch {}
      throw new Error(detail);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sourcePath.split("/").filter(Boolean).pop() || "riptide"}.torrent`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(".torrent file created", "success");
  } catch (e) {
    showToast(e.message, "error");
  }
}

async function loadSettings() {
  try {
    const settings = await api("/api/settings");
    state.settings = settings;
    try {
      const stored = JSON.parse(localStorage.getItem("riptide_ui_settings") || "{}");
      state.uiSettings = { ...state.uiSettings, ...stored };
      if (!stored.theme && window.matchMedia("(prefers-color-scheme: light)").matches) {
        state.uiSettings.theme = "Pearl light";
      }
    } catch {
      localStorage.removeItem("riptide_ui_settings");
    }
    applyThemeOverride();
    applyTheme();
    applyLanguage();
    qs("#compact-toggle")?.classList.toggle("active", state.uiSettings.compact);
    Object.entries(settings).forEach(([key, value]) => {
      const input = qs(`#${key}`);
      if (!input) return;
      if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = fromBytes(value, input.dataset.unit);
    });
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function act(path, method) {
  try {
    await api(path, { method });
    await loadTorrents();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function limitTorrent(torrentId, downloadLimit, uploadLimit) {
  const payload = {};
  if (downloadLimit !== undefined && downloadLimit !== null) payload.download_limit = downloadLimit;
  if (uploadLimit !== undefined && uploadLimit !== null) payload.upload_limit = uploadLimit;
  await api(`/api/torrents/${torrentId}/limit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function openTorrentLocation(torrentId) {
  const torrent = state.torrents.find((t) => t.torrent_id === torrentId);
  if (!torrent?.save_path) return;
  setScreen("torrents");
  qs("#storage-panel").classList.remove("hidden");
  await loadStorage(torrent.save_path);
  showToast("Download folder opened", "success");
}

async function promptTorrentLimit(torrentId, direction) {
  const torrent = state.torrents.find((t) => t.torrent_id === torrentId);
  if (!torrent) return;
  const current = direction === "download" ? torrent.download_limit : torrent.upload_limit;
  const value = await openInputModal(
    direction === "download" ? l("limitDownDir") : l("limitUpDir"),
    "KB/s, 0 = unlimited",
    String(fromBytes(current || 0, "kb"))
  );
  if (value === null) return;
  const next = toBytes(value || 0, "kb");
  const payload = direction === "download"
    ? { download_limit: next }
    : { upload_limit: next };
  await api(`/api/torrents/${torrentId}/limit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  showToast("Torrent speed limit saved", "success");
  await loadTorrents();
}

async function deleteTorrent(torrentId) {
  const confirmed = await openConfirmModal(l("removeTorrent"), l("removeTorrentMsg"), l("removeBtn"));
  if (!confirmed) return;
  await act(`/api/torrents/${torrentId}?delete_files=false`, "DELETE");
}

qs("#add-toggle").onclick = () => openModal("add-modal");
qs("#storage-toggle").onclick = async () => {
  qs("#storage-panel").classList.toggle("hidden");
  if (!qs("#storage-panel").classList.contains("hidden")) await loadStorage(qs("#storage-path").value || state.storagePath);
};
qs("#storage-refresh").onclick = () => loadStorage(qs("#storage-path").value);
qs("#pause-selected").onclick = () => state.selectedId && act(`/api/torrents/${state.selectedId}/pause`, "POST");
qs("#resume-selected").onclick = () => state.selectedId && act(`/api/torrents/${state.selectedId}/resume`, "POST");
qs("#delete-selected").onclick = () => state.selectedId && deleteTorrent(state.selectedId);
qs("#torrent-limit-clear").onclick = async () => {
  if (!state.selectedId) return;
  try {
    qs("#torrent-download-limit").value = 0;
    qs("#torrent-upload-limit").value = 0;
    await limitTorrent(state.selectedId, 0, 0);
    showMessage("Torrent speed limits cleared");
    await selectTorrent(state.selectedId);
  } catch (e) {
    showToast(e.message, "error");
  }
};
qs("#torrent-limit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedId) return;
  const downloadLimit = toBytes(qs("#torrent-download-limit").value || 0, "kb");
  const uploadLimit = toBytes(qs("#torrent-upload-limit").value || 0, "kb");
  try {
    await limitTorrent(state.selectedId, downloadLimit, uploadLimit);
    showMessage("Torrent speed limits saved");
    await selectTorrent(state.selectedId);
  } catch (error) {
    showMessage(error.message, true);
  }
});
qs("#search").oninput = renderList;
qs("#logout").onclick = async () => {
  await api("/api/auth/logout", { method: "POST" });
  showLogin();
};

document.querySelectorAll("[data-screen]").forEach((button) => {
  button.onclick = () => setScreen(button.dataset.screen);
});

qs("#global-search-run").onclick = runGlobalSearch;
qs("#global-search").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runGlobalSearch();
});
qs("#search-results").onclick = async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.selectTorrent) {
    setScreen("torrents");
    await selectTorrent(button.dataset.selectTorrent);
  }
  if (button.dataset.openFile) {
    setScreen("torrents");
    qs("#storage-panel").classList.remove("hidden");
    const path = button.dataset.openFile;
    await loadStorage(path.split("/").slice(0, -1).join("/") || state.storagePath);
  }
};

qs("#rss-add-feed").onclick = addRssFeed;
qs("#rss-rules-toggle").onclick = () => {
  state.rssShowRules = !state.rssShowRules;
  renderRss();
};
qs("#rss-feeds").onclick = (event) => {
  const button = event.target.closest("[data-feed-id]");
  if (!button) return;
  state.rssSelectedFeed = Number(button.dataset.feedId);
  state.rssShowRules = false;
  renderRss();
  loadRssItems(state.rssSelectedFeed);
};
qs("#rss-panel").onclick = async (event) => {
  const toggleRule = event.target.closest("[data-toggle-rule]");
  const toggleFeed = event.target.closest("[data-toggle-feed]");
  const refreshFeed = event.target.closest("[data-refresh-feed]");
  if (refreshFeed) {
    await loadRssItems(Number(refreshFeed.dataset.refreshFeed));
    return;
  }
  if (toggleRule) {
    const rule = state.rssRules.find((item) => item.id === Number(toggleRule.dataset.toggleRule));
    if (!rule) return;
    await api(`/api/rss/rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    await loadRss();
  }
  if (toggleFeed) {
    const feed = state.rssFeeds.find((item) => item.id === Number(toggleFeed.dataset.toggleFeed));
    if (!feed) return;
    await api(`/api/rss/feeds/${feed.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !feed.active }),
    });
    await loadRss();
  }
};

document.querySelectorAll(".settings-section").forEach((button) => {
  button.onclick = () => {
    state.settingsSection = button.dataset.section;
    document.querySelectorAll(".settings-section").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    renderSettingsScreen();
  };
});

qs("#storage-list").onclick = async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const open = button.dataset.open;
  const del = button.dataset.delete;
  const create = button.dataset.createTorrent;
  const fileActions = button.dataset.fileActions;
  if (create) return createTorrentFromPath(create);
  if (fileActions) {
    return showStorageCtxMenu(event.clientX, event.clientY, fileActions, {
      isIso: Boolean(button.dataset.fileIso),
      isArchive: Boolean(button.dataset.fileArchive),
    });
  }
  if (open && button.textContent.includes("Move")) return moveStorageItem(open);
  if (open) return loadStorage(open);
  if (del) return deleteStorageItem(del);
};

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.onclick = () => {
    state.screen = "torrents";
    state.filter = button.dataset.filter;
    state.label = null;
    document.querySelectorAll(".nav,.label").forEach((el) => el.classList.remove("active"));
    setScreen("torrents");
    button.classList.add("active");
    renderList();
  };
});

document.querySelectorAll("[data-label]").forEach((button) => {
  button.onclick = () => {
    state.screen = "torrents";
    state.label = button.dataset.label;
    state.filter = "all";
    document.querySelectorAll(".nav,.label").forEach((el) => el.classList.remove("active"));
    setScreen("torrents");
    button.classList.add("active");
    renderList();
  };
});

document.querySelectorAll(".tab").forEach((button) => {
  button.onclick = () => {
    state.tab = button.dataset.tab;
    document.querySelectorAll(".tab,.tab-page").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    qs(`#tab-${state.tab}`).classList.add("active");
  };
});

qs("#magnet-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedLabel = qs("#magnet-label").value || null;
  try {
    const result = await api("/api/torrents/add-magnet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        magnet: qs("#magnet").value.trim(),
        save_path: qs("#save-path").value.trim() || null,
        start_paused: qs("#magnet-start-paused")?.checked || false,
        sequential: qs("#magnet-sequential")?.checked || false,
      }),
    });
    event.target.reset();
    closeModal("add-modal");
    showToast("Magnet added", "success");
    if (selectedLabel && result && result.torrent_id) {
      await setTorrentLabel(result.torrent_id, selectedLabel);
    } else {
      await loadTorrents();
    }
  } catch (error) {
    showToast(error.message, "error");
  }
});

qs("#file-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = qs("#torrent-file").files[0];
  if (!file) return showToast("Select a .torrent file", "error");
  const selectedLabel = qs("#file-label").value || null;
  const form = new FormData();
  form.append("file", file);
  form.append("save_path", qs("#file-save-path").value.trim());
  form.append("start_paused", qs("#file-start-paused")?.checked ? "true" : "false");
  form.append("sequential", qs("#file-sequential")?.checked ? "true" : "false");
  const previewPriorities = state.addFilePreview?.files?.map((_, idx) =>
    Number(qs(`[data-preview-pri="${idx}"]`)?.value ?? 4)
  );
  if (previewPriorities?.length) form.append("priorities", JSON.stringify(previewPriorities));
  try {
    const result = await api("/api/torrents/add-file", { method: "POST", body: form });
    event.target.reset();
    closeModal("add-modal");
    showToast(".torrent file added", "success");
    if (selectedLabel && result && result.torrent_id) {
      await setTorrentLabel(result.torrent_id, selectedLabel);
    } else {
      await loadTorrents();
    }
  } catch (error) {
    showToast(error.message, "error");
  }
});


qs("#magnet-label").addEventListener("change", () => {
  const label = state.labels.find((l) => l.name === qs("#magnet-label").value);
  if (label?.save_path) qs("#magnet-save-path").value = label.save_path;
});
qs("#file-label").addEventListener("change", () => {
  const label = state.labels.find((l) => l.name === qs("#file-label").value);
  if (label?.save_path) qs("#file-save-path").value = label.save_path;
});

qs("#torrent-file").addEventListener("change", async () => {
  const box = qs("#torrent-file-preview");
  const file = qs("#torrent-file").files[0];
  box.classList.add("hidden");
  box.innerHTML = "";
  state.addFilePreview = null;
  if (!file) return;
  const form = new FormData();
  form.append("file", file);
  try {
    const preview = await api("/api/torrents/preview-file", { method: "POST", body: form });
    state.addFilePreview = preview;
    const shownFiles = preview.files.slice(0, 20).map((f, idx) => `<div><span>${esc(f.path)}</span><span>${bytes(f.size)}</span><select data-preview-pri="${idx}" class="rt-file-pri"><option value="0">Skip</option><option value="1">Low</option><option value="4" selected>Normal</option><option value="7">High</option></select></div>`).join("");
    box.innerHTML = `
      <div class="rt-preview-title">${icon("file", 13)} ${esc(preview.name)}</div>
      <div class="rt-preview-meta">${bytes(preview.total_size)} · ${preview.files.length} files · ${preview.trackers.length} trackers</div>
      <div class="rt-preview-files">${shownFiles}${preview.files.length > 6 ? `<div>+${preview.files.length - 6} more</div>` : ""}</div>
    `;
    box.classList.remove("hidden");
  } catch (e) {
    box.innerHTML = `<div class="rt-preview-error">${esc(e.message)}</div>`;
    box.classList.remove("hidden");
  }
});

qs("#settings-screen-form").addEventListener("click", async (event) => {
  const settingToggle = event.target.closest("[data-setting-toggle]");
  const uiToggle = event.target.closest("[data-ui-toggle]");
  const encryption = event.target.closest("[data-encryption]");
  const browse = event.target.closest("[data-browse-download]");
  const theme = event.target.closest("[data-cycle-theme]");
  const exportSettings = event.target.closest("[data-export-settings]");
  const importSettings = event.target.closest("[data-import-settings]");
  const mixedMode = event.target.closest("[data-mixed-mode]");
  const lang = event.target.closest("[data-lang]");
  if (settingToggle) {
    const key = settingToggle.dataset.settingToggle;
    state.settings[key] = !state.settings[key];
    renderSettingsScreen();
  }
  if (uiToggle) {
    const key = uiToggle.dataset.uiToggle;
    state.uiSettings[key] = !state.uiSettings[key];
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    renderSettingsScreen();
  }
  if (encryption) {
    state.uiSettings.encryption = encryption.dataset.encryption;
    state.settings.encryption_policy = Number(encryption.dataset.encPolicy || 0);
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    renderSettingsScreen();
  }
  if (mixedMode) {
    state.settings.utp_tcp_mixed_mode = Number(state.settings.utp_tcp_mixed_mode || 0) === 0 ? 1 : 0;
    renderSettingsScreen();
  }
  if (lang) {
    state.uiSettings.language = lang.dataset.lang;
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    renderSettingsScreen();
    applyLanguage();
  }
  if (browse) {
    const current = qs("#screen_default_download_folder")?.value || state.settings.default_download_folder;
    const next = await openInputModal(l("saveLocTitle"), l("defaultSavePathLabel"), current);
    if (next) qs("#screen_default_download_folder").value = next;
  }
  if (theme) {
    state.uiSettings.theme = state.uiSettings.theme === "Deep ocean" ? "Pearl light" : "Deep ocean";
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    applyTheme();
    renderSettingsScreen();
    applyLanguage();
  }
  if (exportSettings) {
    try {
      const data = await api("/api/settings/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "riptide-settings.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { showToast(e.message, "error"); }
  }
  if (importSettings) {
    qs("#settings-import-file")?.click();
  }
  const dayBtn = event.target.closest(".rt-day-btn");
  if (dayBtn) dayBtn.classList.toggle("active");
});

qs("#settings-screen-form").addEventListener("change", async (event) => {
  const fileInput = event.target.closest("#settings-import-file");
  if (!fileInput || !fileInput.files[0]) return;
  try {
    const payload = JSON.parse(await fileInput.files[0].text());
    state.settings = await api("/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadLabels();
    await loadRss();
    renderSettingsScreen();
    showToast("Settings imported", "success");
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    fileInput.value = "";
  }
});

qs("#settings-screen-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {};
  if (state.settingsSection === "downloads") {
    payload.default_download_folder = qs("#screen_default_download_folder")?.value || state.settings.default_download_folder;
    payload.watch_folder = qs("#screen_watch_folder")?.value || "";
    payload.watch_folder_enabled = state.settings.watch_folder_enabled;
    payload.max_active_downloads = Number(qs("#screen_max_active_downloads")?.value || state.settings.max_active_downloads);
  }
  if (state.settingsSection === "bandwidth") {
    payload.global_download_limit = toBytes(qs("#screen_global_download_limit")?.value || 0, "kb");
    payload.global_upload_limit = toBytes(qs("#screen_global_upload_limit")?.value || 0, "kb");
    payload.alt_speed_dl = toBytes(qs("#screen_alt_speed_dl")?.value || 0, "kb");
    payload.alt_speed_ul = toBytes(qs("#screen_alt_speed_ul")?.value || 0, "kb");
    payload.alt_speed_begin = qs("#screen_alt_begin")?.value || "09:00";
    payload.alt_speed_end = qs("#screen_alt_end")?.value || "23:00";
    const dayBtns = qs("#alt-day-row")?.querySelectorAll(".rt-day-btn") || [];
    payload.alt_speed_days = [...dayBtns].map((b) => (b.classList.contains("active") ? "1" : "0")).join("");
  }
  if (state.settingsSection === "connection") {
    payload.dht_enabled = state.settings.dht_enabled;
    payload.upnp_enabled = state.settings.upnp_enabled;
    payload.lsd_enabled = state.settings.lsd_enabled;
    payload.pex_enabled = state.settings.pex_enabled;
    payload.random_port = state.settings.random_port;
    payload.listen_port = Number(qs("#screen_listen_port")?.value || 6881);
    payload.queueing_enabled = state.settings.queueing_enabled;
    payload.global_connections_limit = Number(qs("#screen_global_connections_limit")?.value || 500);
    payload.torrent_connections_limit = Number(qs("#screen_torrent_connections_limit")?.value || 100);
    payload.global_upload_slots = Number(qs("#screen_global_upload_slots")?.value || 20);
    payload.torrent_upload_slots = Number(qs("#screen_torrent_upload_slots")?.value || 4);
    payload.connection_speed = Number(qs("#screen_connection_speed")?.value || 30);
    payload.max_active_torrents = Number(qs("#screen_max_active_torrents")?.value || 500);
    payload.max_active_uploads = Number(qs("#screen_max_active_uploads")?.value || 5);
  }
  if (state.settingsSection === "privacy") {
    payload.ip_filter = qs("#screen_ip_filter")?.value || "";
    payload.encryption_policy = Number(state.settings.encryption_policy || 0);
    payload.utp_tcp_mixed_mode = Number(state.settings.utp_tcp_mixed_mode || 0);
    payload.limit_tcp_overhead = state.settings.limit_tcp_overhead;
    payload.limit_utp_rate = state.settings.limit_utp_rate;
    payload.allow_multiple_connections_from_same_ip = state.settings.allow_multiple_connections_from_same_ip;
    payload.anonymous_mode = state.settings.anonymous_mode;
  }
  if (!Object.keys(payload).length) {
    localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
    showMessage("Settings saved");
    return;
  }
  try {
    state.settings = await api("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showMessage("Settings saved");
    renderSettingsScreen();
    await loadSystem();
  } catch (error) {
    showMessage(error.message, true);
  }
});

qs("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: qs("#login-username").value.trim(),
        password: qs("#login-password").value,
      }),
    });
    event.target.reset();
    hideLogin();
    await boot();
  } catch (error) {
    showLogin(error.message);
  }
});

function showToast(text, type = "") {
  const wrap = qs("#toast-wrap");
  const el = document.createElement("div");
  el.className = `rt-toast${type ? " " + type : ""}`;
  el.textContent = text;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.animation = "rt-toast-out var(--rt-dur) var(--rt-ease) forwards";
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

function openModal(id) {
  const el = qs(`#${id}`);
  el.classList.remove("hidden");
  el.querySelector("input, button")?.focus();
}

function closeModal(id) {
  qs(`#${id}`).classList.add("hidden");
}

function openConfirmModal(title, text, okLabel = "Confirm") {
  return new Promise((resolve) => {
    qs("#confirm-modal-title").textContent = title;
    qs("#confirm-modal-text").textContent = text;
    qs("#confirm-modal-ok").textContent = okLabel;
    openModal("confirm-modal");
    const cleanup = (val) => {
      qs("#confirm-modal-ok").onclick = null;
      qs("#confirm-modal-cancel").onclick = null;
      qs("#confirm-modal-close").onclick = null;
      closeModal("confirm-modal");
      resolve(val);
    };
    qs("#confirm-modal-ok").onclick = () => cleanup(true);
    qs("#confirm-modal-cancel").onclick = () => cleanup(false);
    qs("#confirm-modal-close").onclick = () => cleanup(false);
  });
}

function openInputModal(title, label, defaultValue = "") {
  return new Promise((resolve) => {
    qs("#input-modal-title").textContent = title;
    qs("#input-modal-label").textContent = label;
    qs("#input-modal-field").value = defaultValue;
    openModal("input-modal");
    setTimeout(() => qs("#input-modal-field").focus(), 30);
    const cleanup = (val) => {
      qs("#input-modal-ok").onclick = null;
      qs("#input-modal-cancel").onclick = null;
      qs("#input-modal-close").onclick = null;
      qs("#input-modal-field").onkeydown = null;
      closeModal("input-modal");
      resolve(val);
    };
    qs("#input-modal-ok").onclick = () => cleanup(qs("#input-modal-field").value.trim() || null);
    qs("#input-modal-cancel").onclick = () => cleanup(null);
    qs("#input-modal-close").onclick = () => cleanup(null);
    qs("#input-modal-field").onkeydown = (e) => {
      if (e.key === "Enter") cleanup(qs("#input-modal-field").value.trim() || null);
    };
  });
}

function openTextPreviewModal(title, text) {
  qs("#text-preview-title").textContent = title;
  qs("#text-preview-body").textContent = text;
  openModal("text-preview-modal");
}

function showCtxMenu(x, y, torrentId) {
  const menu = qs("#ctx-menu");
  const torrent = state.torrents.find((t) => t.torrent_id === torrentId);
  if (!torrent) return;
  menu.innerHTML = `
    <button class="rt-ctx-item hl" data-ctx="select" role="menuitem">
      <span>${icon("activity", 14)}</span><span>${l("inspect")}</span>
    </button>
    ${torrent.paused
      ? `<button class="rt-ctx-item" data-ctx="resume" role="menuitem"><span>${icon("play", 14)}</span><span>${l("resume")}</span></button>`
      : `<button class="rt-ctx-item" data-ctx="pause" role="menuitem"><span>${icon("pause", 14)}</span><span>${l("pause")}</span></button>`}
    <button class="rt-ctx-item" data-ctx="open-folder" role="menuitem">
      <span>${icon("folderOpen", 14)}</span><span>${l("openFolder")}</span>
    </button>
    <div class="rt-ctx-sep"></div>
    <button class="rt-ctx-item" data-ctx="limit-down" role="menuitem">
      <span>${icon("download", 14)}</span><span>${l("setDownloadLimit")}</span><span class="rt-ctx-key">${fromBytes(torrent.download_limit || 0, "kb") || 0}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="limit-up" role="menuitem">
      <span>${icon("upload", 14)}</span><span>${l("setUploadLimit")}</span><span class="rt-ctx-key">${fromBytes(torrent.upload_limit || 0, "kb") || 0}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="limit-clear" role="menuitem">
      <span>${icon("gauge", 14)}</span><span>${l("clearLimits")}</span>
    </button>
    <div class="rt-ctx-sep"></div>
    <button class="rt-ctx-item" data-ctx="copy-magnet" role="menuitem">
      <span>${icon("magnet", 14)}</span><span>${l("copyHash")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="sequential" role="menuitem">
      <span>${icon("arrow-right", 14)}</span><span>${torrent.sequential ? l("disableSequential") : l("sequential")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="super-seeding" role="menuitem">
      <span>${icon("upload", 14)}</span><span>${torrent.super_seeding ? l("disableSuperSeeding") : l("superSeeding")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="reannounce" role="menuitem">
      <span>${icon("refresh", 14)}</span><span>${l("forceReannounce")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="recheck" role="menuitem">
      <span>${icon("check", 14)}</span><span>${l("forceRecheck")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="edit-trackers" role="menuitem">
      <span>${icon("server", 14)}</span><span>${l("editTrackers")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="seeding-limits" role="menuitem">
      <span>${icon("repeat", 14)}</span><span>${l("seedingLimits")}</span>
    </button>
    <div class="rt-ctx-sep"></div>
    <button class="rt-ctx-item" data-ctx="queue-top" role="menuitem">
      <span>${icon("arrowUp", 14)}</span><span>${l("queueTop")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="queue-up" role="menuitem">
      <span>${icon("arrowUp", 14)}</span><span>${l("queueUp")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="queue-down" role="menuitem">
      <span>${icon("arrowDown", 14)}</span><span>${l("queueDown")}</span>
    </button>
    <button class="rt-ctx-item" data-ctx="set-label" role="menuitem">
      <span>${icon("tag", 14)}</span><span>${l("setLabel")}</span>
    </button>
    <div class="rt-ctx-sep"></div>
    <button class="rt-ctx-item danger" data-ctx="delete" role="menuitem">
      <span>${icon("trash", 14)}</span><span>${l("removeBtn")}</span>
    </button>
  `;
  menu.dataset.torrentId = torrentId;
  menu.style.left = `${Math.min(x, window.innerWidth - 250)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 350)}px`;
  menu.classList.remove("hidden");
}

function closeCtxMenu() {
  qs("#ctx-menu").classList.add("hidden");
}

qs("#ctx-menu").onclick = async (e) => {
  const btn = e.target.closest("[data-ctx]");
  const storageBtn = e.target.closest("[data-storage-ctx]");
  if (!btn && !storageBtn) return;
  const menu = qs("#ctx-menu");
  const id = menu.dataset.torrentId;
  const storagePath = menu.dataset.storagePath;
  closeCtxMenu();
  if (storageBtn && storagePath) {
    if (storageBtn.dataset.storageCtx === "open-file") return openDownloadedFile(storagePath);
    if (storageBtn.dataset.storageCtx === "inspect-archive") return showArchiveContents(storagePath);
    if (storageBtn.dataset.storageCtx === "extract-archive") return extractArchive(storagePath);
    if (storageBtn.dataset.storageCtx === "mount-iso") return mountIso(storagePath);
    if (storageBtn.dataset.storageCtx === "checksum") return showChecksum(storagePath);
    return;
  }
  if (btn.dataset.ctx === "select") await selectTorrent(id);
  if (btn.dataset.ctx === "resume") await act(`/api/torrents/${id}/resume`, "POST");
  if (btn.dataset.ctx === "pause") await act(`/api/torrents/${id}/pause`, "POST");
  if (btn.dataset.ctx === "open-folder") await openTorrentLocation(id);
  if (btn.dataset.ctx === "limit-down") await promptTorrentLimit(id, "download");
  if (btn.dataset.ctx === "limit-up") await promptTorrentLimit(id, "upload");
  if (btn.dataset.ctx === "limit-clear") {
    await limitTorrent(id, 0, 0);
    showToast("Torrent speed limits cleared", "success");
    await loadTorrents();
  }
  if (btn.dataset.ctx === "delete") await deleteTorrent(id);
  if (btn.dataset.ctx === "sequential") {
    const t = state.torrents.find((x) => x.torrent_id === id);
    try {
      await api(`/api/torrents/${id}/sequential`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !t?.sequential }),
      });
      await loadTorrents();
    } catch (e) { showToast(e.message, "error"); }
  }
  if (btn.dataset.ctx === "super-seeding") {
    const t = state.torrents.find((x) => x.torrent_id === id);
    try {
      await api(`/api/torrents/${id}/super-seeding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !t?.super_seeding }),
      });
      await loadTorrents();
    } catch (e) { showToast(e.message, "error"); }
  }
  if (btn.dataset.ctx === "set-label") openLabelPickerModal(id);
  if (btn.dataset.ctx === "reannounce") {
    try {
      await api(`/api/torrents/${id}/reannounce`, { method: "POST" });
      showToast("Reannounce sent", "success");
    } catch (e) { showToast(e.message, "error"); }
  }
  if (btn.dataset.ctx === "recheck") {
    const ok = await openConfirmModal(l("recheckTitle"), l("recheckMsg"), l("recheckBtn"));
    if (!ok) return;
    try {
      await api(`/api/torrents/${id}/recheck`, { method: "POST" });
      showToast("Recheck started", "success");
      await loadTorrents();
    } catch (e) { showToast(e.message, "error"); }
  }
  if (btn.dataset.ctx === "edit-trackers") {
    try {
      const details = await api(`/api/torrents/${id}/details`);
      const current = details.trackers.map((t) => t.url).join("\n");
      const value = await openInputModal(l("editTrackersTitle"), l("trackerUrlsLabel"), current);
      if (value === null) return;
      const urls = value.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
      await api(`/api/torrents/${id}/trackers`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }) });
      showToast("Trackers updated", "success");
      await selectTorrent(id);
    } catch (e) { showToast(e.message, "error"); }
  }
  if (btn.dataset.ctx === "seeding-limits") {
    const torrent = state.torrents.find((t) => t.torrent_id === id);
    const ratio = await openInputModal(l("seedLimitsTitle"), l("seedRatioLabel"), torrent?.ratio_limit || 0);
    if (ratio === null) return;
    const minutes = await openInputModal(l("seedLimitsTitle"), l("seedTimeLabel"), torrent?.seeding_time_limit || 0);
    if (minutes === null) return;
    try {
      await api(`/api/torrents/${id}/seeding-limits`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ratio_limit: Number(ratio), seeding_time_limit: Number(minutes) }) });
      showToast(l("seedLimitsSaved"), "success");
      await loadTorrents();
    } catch (e) { showToast(e.message, "error"); }
  }
  if (btn.dataset.ctx?.startsWith("queue-")) {
    const action = btn.dataset.ctx.replace("queue-", "");
    try {
      await api(`/api/torrents/${id}/queue/${action}`, { method: "POST" });
      showToast("Queue updated", "success");
      await loadTorrents();
    } catch (e) { showToast(e.message, "error"); }
  }
  if (btn.dataset.ctx === "copy-magnet") {
    const torrent = state.torrents.find((t) => t.torrent_id === id);
    if (torrent) {
      await navigator.clipboard.writeText(torrent.info_hash || id).catch(() => {});
      showToast("Info hash copied");
    }
  }
};

qs("#add-modal-close").onclick = () => closeModal("add-modal");
qs("#add-modal-cancel").onclick = () => closeModal("add-modal");

function showAbout() {
  if (typeof RIPTIDE === "undefined") { showToast("About info unavailable", "error"); return; }
  qs("#about-version").textContent = `v${RIPTIDE.version}`;
  qs("#about-tagline").textContent = RIPTIDE.tagline;
  qs("#about-brand").textContent = RIPTIDE.brand;
  qs("#about-engine").textContent = RIPTIDE.engine;
  qs("#about-stack").textContent = RIPTIDE.stack.join(", ");
  qs("#about-copy").textContent = RIPTIDE.copyright;
  openModal("about-modal");
}

qs("#about-toggle").onclick = showAbout;
qs(".brand").onclick = showAbout;
qs("#about-modal-close").onclick = () => closeModal("about-modal");
qs("#text-preview-close").onclick = () => closeModal("text-preview-modal");
qs("#text-preview-cancel").onclick = () => closeModal("text-preview-modal");

qs("#compact-toggle").onclick = () => {
  state.uiSettings.compact = !state.uiSettings.compact;
  qs("#compact-toggle").classList.toggle("active", state.uiSettings.compact);
  localStorage.setItem("riptide_ui_settings", JSON.stringify(state.uiSettings));
  renderList();
};

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  ["add-modal", "confirm-modal", "input-modal", "about-modal", "label-picker-modal", "text-preview-modal"].forEach((id) => {
    if (!qs(`#${id}`).classList.contains("hidden")) closeModal(id);
  });
  closeCtxMenu();
});

document.addEventListener("click", (e) => {
  if (!qs("#ctx-menu").classList.contains("hidden") && !e.target.closest("#ctx-menu")) {
    closeCtxMenu();
  }
  ["add-modal", "confirm-modal", "input-modal", "about-modal", "label-picker-modal", "text-preview-modal"].forEach((id) => {
    const scrim = qs(`#${id}`);
    if (!scrim.classList.contains("hidden") && e.target === scrim) closeModal(id);
  });
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  if (!localStorage.getItem("riptide_ui_settings")) {
    state.uiSettings.theme = e.matches ? "Pearl light" : "Deep ocean";
    applyTheme();
  }
});

async function boot() {
  try {
    await api("/api/auth/me");
    hideLogin();
    await loadSettings();
    await loadSystem();
    await loadLabels();
    await loadTorrents();
    if (typeof RIPTIDE !== "undefined" && !sessionStorage.getItem("about_shown")) {
      sessionStorage.setItem("about_shown", "1");
      showAbout();
    }
  } catch {
    showLogin();
  }
}

applyThemeOverride();
applyTheme();
applyStaticIcons();
applyLanguage();
boot();
setInterval(() => state.authenticated && loadTorrents(), 2000);
setInterval(() => state.authenticated && loadSystem(), 10000);

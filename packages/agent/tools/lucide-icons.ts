import { tool } from "ai";
import { z } from "zod";

export interface LucideIcon {
  name: string;
  importName: string;
  categories: string[];
  tags: string[];
  description: string;
  useCases: string[];
}

const LUCIDE_ICONS: LucideIcon[] = [
  // ─── Navigation & UI ───────────────────────────────────────────────────
  {
    name: "menu",
    importName: "Menu",
    categories: ["navigation", "ui"],
    tags: ["hamburger", "nav", "menu", "mobile", "toggle"],
    description: "Hamburger menu icon for mobile navigation",
    useCases: ["mobile nav", "sidebar toggle", "menu button"],
  },
  {
    name: "x",
    importName: "X",
    categories: ["navigation", "ui"],
    tags: ["close", "exit", "cancel", "dismiss"],
    description: "Close/X icon for modals and drawers",
    useCases: ["close button", "modal dismiss", "cancel action"],
  },
  {
    name: "chevron-down",
    importName: "ChevronDown",
    categories: ["navigation", "ui"],
    tags: ["dropdown", "expand", "arrow", "down"],
    description: "Downward chevron for dropdowns",
    useCases: ["dropdowns", "accordions", "expandable sections"],
  },
  {
    name: "chevron-up",
    importName: "ChevronUp",
    categories: ["navigation", "ui"],
    tags: ["dropdown", "collapse", "arrow", "up"],
    description: "Upward chevron for collapsible sections",
    useCases: ["accordions", "collapse", "scroll to top"],
  },
  {
    name: "chevron-left",
    importName: "ChevronLeft",
    categories: ["navigation", "ui"],
    tags: ["back", "previous", "arrow", "left"],
    description: "Left chevron for back navigation",
    useCases: ["back button", "previous slide", "carousel nav"],
  },
  {
    name: "chevron-right",
    importName: "ChevronRight",
    categories: ["navigation", "ui"],
    tags: ["forward", "next", "arrow", "right"],
    description: "Right chevron for forward navigation",
    useCases: ["next button", "next slide", "carousel nav"],
  },
  {
    name: "arrow-left",
    importName: "ArrowLeft",
    categories: ["navigation", "ui"],
    tags: ["back", "return", "previous"],
    description: "Left arrow for navigation",
    useCases: ["back to previous page", "return", "go back"],
  },
  {
    name: "arrow-right",
    importName: "ArrowRight",
    categories: ["navigation", "ui"],
    tags: ["forward", "continue", "next"],
    description: "Right arrow for navigation",
    useCases: ["continue", "next step", "forward"],
  },
  {
    name: "home",
    importName: "Home",
    categories: ["navigation"],
    tags: ["house", "main", "start", "index"],
    description: "Home icon for main page link",
    useCases: ["home link", "breadcrumb", "landing page"],
  },
  {
    name: "search",
    importName: "Search",
    categories: ["navigation", "ui"],
    tags: ["find", "lookup", "magnify", "query"],
    description: "Search icon for search inputs",
    useCases: ["search bar", "filter", "lookup functionality"],
  },
  {
    name: "globe",
    importName: "Globe",
    categories: ["navigation"],
    tags: ["world", "internet", "web", "global"],
    description: "Globe icon for international/language features",
    useCases: ["language selector", "international", "global features"],
  },

  // ─── Actions ───────────────────────────────────────────────────────────
  {
    name: "plus",
    importName: "Plus",
    categories: ["actions", "ui"],
    tags: ["add", "create", "new", "expand"],
    description: "Plus icon for add/create actions",
    useCases: ["add new item", "create", "expand", "add button"],
  },
  {
    name: "minus",
    importName: "Minus",
    categories: ["actions", "ui"],
    tags: ["remove", "subtract", "collapse", "decrease"],
    description: "Minus icon for remove/collapse actions",
    useCases: ["remove item", "decrease", "collapse"],
  },
  {
    name: "trash-2",
    importName: "Trash2",
    categories: ["actions"],
    tags: ["delete", "remove", "bin", "trash"],
    description: "Trash icon for delete actions",
    useCases: ["delete item", "remove", "trash"],
  },
  {
    name: "edit",
    importName: "Edit",
    categories: ["actions"],
    tags: ["modify", "change", "update", "pencil"],
    description: "Edit icon for modify actions",
    useCases: ["edit content", "modify", "update"],
  },
  {
    name: "save",
    importName: "Save",
    categories: ["actions"],
    tags: ["download", "export", "store", "keep"],
    description: "Save icon for save/export actions",
    useCases: ["save changes", "export", "download"],
  },
  {
    name: "check",
    importName: "Check",
    categories: ["actions", "status"],
    tags: ["done", "complete", "success", "approve"],
    description: "Checkmark for completion/success",
    useCases: ["task complete", "success", "approve", "confirm"],
  },
  {
    name: "x-circle",
    importName: "XCircle",
    categories: ["actions", "status"],
    tags: ["error", "fail", "cancel", "wrong"],
    description: "X in circle for errors/cancellation",
    useCases: ["error state", "cancel", "invalid input"],
  },
  {
    name: "refresh-cw",
    importName: "RefreshCw",
    categories: ["actions"],
    tags: ["reload", "sync", "update", "redo"],
    description: "Refresh icon for reload/refresh actions",
    useCases: ["refresh data", "reload", "sync"],
  },
  {
    name: "upload",
    importName: "Upload",
    categories: ["actions"],
    tags: ["import", "send", "cloud-up", "push"],
    description: "Upload icon for file uploads",
    useCases: ["file upload", "import", "push to cloud"],
  },
  {
    name: "download",
    importName: "Download",
    categories: ["actions"],
    tags: ["export", "save", "cloud-down", "pull"],
    description: "Download icon for file downloads",
    useCases: ["download file", "export", "pull from cloud"],
  },
  {
    name: "copy",
    importName: "Copy",
    categories: ["actions"],
    tags: ["duplicate", "clone", "replicate"],
    description: "Copy icon for copy/duplicate actions",
    useCases: ["copy text", "duplicate", "clone item"],
  },
  {
    name: "share-2",
    importName: "Share2",
    categories: ["actions"],
    tags: ["send", "forward", "social", "spread"],
    description: "Share icon for sharing content",
    useCases: ["share content", "social sharing", "forward"],
  },
  {
    name: "heart",
    importName: "Heart",
    categories: ["actions", "social"],
    tags: ["like", "favorite", "love", "wishlist"],
    description: "Heart icon for favorites/likes",
    useCases: ["add to favorites", "like", "wishlist"],
  },
  {
    name: "star",
    importName: "Star",
    categories: ["actions", "ui"],
    tags: ["favorite", "rating", "bookmark", "featured"],
    description: "Star icon for ratings/bookmarks",
    useCases: ["rating", "bookmark", "featured content"],
  },
  {
    name: "settings",
    importName: "Settings",
    categories: ["actions", "ui"],
    tags: ["gear", "config", "preferences", "options"],
    description: "Settings gear icon for configuration",
    useCases: ["settings page", "preferences", "configuration"],
  },
  {
    name: "filter",
    importName: "Filter",
    categories: ["actions", "ui"],
    tags: ["funnel", "sort", "refine", "narrow"],
    description: "Filter icon for filtering content",
    useCases: ["filter results", "sort", "refine search"],
  },

  // ─── Media & Content ──────────────────────────────────────────────────
  {
    name: "image",
    importName: "Image",
    categories: ["media", "content"],
    tags: ["photo", "picture", "gallery", "visual"],
    description: "Image icon for photos/media",
    useCases: ["image upload", "gallery", "media library"],
  },
  {
    name: "video",
    importName: "Video",
    categories: ["media", "content"],
    tags: ["film", "movie", "camera", "play"],
    description: "Video icon for video content",
    useCases: ["video player", "video upload", "media"],
  },
  {
    name: "music",
    importName: "Music",
    categories: ["media", "content"],
    tags: ["audio", "sound", "song", "play"],
    description: "Music note icon for audio content",
    useCases: ["music player", "audio", "sound"],
  },
  {
    name: "play",
    importName: "Play",
    categories: ["media"],
    tags: ["start", "begin", "triangle", "media"],
    description: "Play button for media playback",
    useCases: ["play video", "start audio", "media controls"],
  },
  {
    name: "pause",
    importName: "Pause",
    categories: ["media"],
    tags: ["stop", "hold", "media", "temporary"],
    description: "Pause icon for media controls",
    useCases: ["pause video", "pause audio", "media controls"],
  },
  {
    name: "file-text",
    importName: "FileText",
    categories: ["content", "ui"],
    tags: ["document", "page", "text", "paper"],
    description: "File with text for documents",
    useCases: ["document viewer", "text file", "page"],
  },
  {
    name: "folder",
    importName: "Folder",
    categories: ["content", "ui"],
    tags: ["directory", "browse", "files", "organize"],
    description: "Folder icon for directories",
    useCases: ["file browser", "folder structure", "organize"],
  },
  {
    name: "camera",
    importName: "Camera",
    categories: ["media"],
    tags: ["photo", "picture", "capture", "shoot"],
    description: "Camera icon for photography",
    useCases: ["take photo", "camera app", "screenshot"],
  },
  {
    name: "mic",
    importName: "Mic",
    categories: ["media"],
    tags: ["voice", "audio", "record", "speech"],
    description: "Microphone icon for audio recording",
    useCases: ["voice recording", "speech to text", "audio input"],
  },

  // ─── Communication ────────────────────────────────────────────────────
  {
    name: "mail",
    importName: "Mail",
    categories: ["communication"],
    tags: ["email", "message", "inbox", "contact"],
    description: "Mail icon for email",
    useCases: ["email link", "contact form", "inbox"],
  },
  {
    name: "message-circle",
    importName: "MessageCircle",
    categories: ["communication"],
    tags: ["chat", "comment", "talk", "discuss"],
    description: "Message bubble for chat",
    useCases: ["chat app", "comments", "messaging"],
  },
  {
    name: "phone",
    importName: "Phone",
    categories: ["communication"],
    tags: ["call", "telephone", "contact", "dial"],
    description: "Phone icon for calls",
    useCases: ["contact number", "call now", "phone link"],
  },
  {
    name: "send",
    importName: "Send",
    categories: ["communication"],
    tags: ["submit", "dispatch", "deliver", "transmit"],
    description: "Send icon for submitting content",
    useCases: ["send message", "submit form", "deliver"],
  },
  {
    name: "bell",
    importName: "Bell",
    categories: ["communication", "ui"],
    tags: ["notification", "alert", "remind", "notify"],
    description: "Bell icon for notifications",
    useCases: ["notifications", "alerts", "reminders"],
  },

  // ─── Business & Finance ───────────────────────────────────────────────
  {
    name: "dollar-sign",
    importName: "DollarSign",
    categories: ["business", "finance"],
    tags: ["price", "cost", "money", "currency"],
    description: "Dollar sign for pricing",
    useCases: ["pricing page", "cost display", "currency"],
  },
  {
    name: "credit-card",
    importName: "CreditCard",
    categories: ["business", "finance"],
    tags: ["payment", "purchase", "transaction", "buy"],
    description: "Credit card for payments",
    useCases: ["payment form", "checkout", "billing"],
  },
  {
    name: "shopping-cart",
    importName: "ShoppingCart",
    categories: ["business", "ecommerce"],
    tags: ["cart", "buy", "purchase", "store"],
    description: "Shopping cart for e-commerce",
    useCases: ["add to cart", "checkout", "e-commerce"],
  },
  {
    name: "store",
    importName: "Store",
    categories: ["business", "ecommerce"],
    tags: ["shop", "market", "retail", "commerce"],
    description: "Store icon for shops/e-commerce",
    useCases: ["online store", "shop page", "marketplace"],
  },
  {
    name: "trending-up",
    importName: "TrendingUp",
    categories: ["business", "finance"],
    tags: ["growth", "increase", "profit", "success"],
    description: "Upward trend for growth metrics",
    useCases: ["analytics", "growth metrics", "success stats"],
  },
  {
    name: "bar-chart-2",
    importName: "BarChart2",
    categories: ["business"],
    tags: ["analytics", "data", "stats", "graph"],
    description: "Bar chart for analytics",
    useCases: ["dashboard", "analytics", "data visualization"],
  },
  {
    name: "pie-chart",
    importName: "PieChart",
    categories: ["business"],
    tags: ["analytics", "data", "stats", "distribution"],
    description: "Pie chart for data visualization",
    useCases: ["analytics", "data viz", "statistics"],
  },

  // ─── Social & User ────────────────────────────────────────────────────
  {
    name: "user",
    importName: "User",
    categories: ["user", "social"],
    tags: ["profile", "account", "person", "avatar"],
    description: "User icon for profiles",
    useCases: ["user profile", "account", "avatar"],
  },
  {
    name: "users",
    importName: "Users",
    categories: ["user", "social"],
    tags: ["team", "group", "people", "community"],
    description: "Multiple users for teams",
    useCases: ["team page", "community", "group"],
  },
  {
    name: "github",
    importName: "Github",
    categories: ["social", "brands"],
    tags: ["code", "repo", "open source", "git"],
    description: "GitHub logo for code repositories",
    useCases: ["github link", "source code", "open source"],
  },
  {
    name: "twitter",
    importName: "Twitter",
    categories: ["social", "brands"],
    tags: ["x", "social media", "tweet", "follow"],
    description: "Twitter/X logo for social media",
    useCases: ["twitter link", "social media", "follow"],
  },
  {
    name: "linkedin",
    importName: "Linkedin",
    categories: ["social", "brands"],
    tags: ["professional", "network", "career", "business"],
    description: "LinkedIn logo for professional networking",
    useCases: ["linkedin profile", "professional", "career"],
  },
  {
    name: "facebook",
    importName: "Facebook",
    categories: ["social", "brands"],
    tags: ["social media", "connect", "friends"],
    description: "Facebook logo for social media",
    useCases: ["facebook page", "social media", "connect"],
  },
  {
    name: "instagram",
    importName: "Instagram",
    categories: ["social", "brands"],
    tags: ["photo", "social media", "camera", "visual"],
    description: "Instagram logo for social media",
    useCases: ["instagram link", "social media", "photos"],
  },

  // ─── Security & Status ─────────────────────────────────────────────────
  {
    name: "shield",
    importName: "Shield",
    categories: ["security", "status"],
    tags: ["protect", "secure", "safety", "guard"],
    description: "Shield icon for security",
    useCases: ["security page", "protected content", "privacy"],
  },
  {
    name: "lock",
    importName: "Lock",
    categories: ["security"],
    tags: ["secure", "private", "password", "protected"],
    description: "Lock icon for security/privacy",
    useCases: ["login", "password", "private content"],
  },
  {
    name: "unlock",
    importName: "Unlock",
    categories: ["security"],
    tags: ["open", "access", "public", "unrestricted"],
    description: "Unlock icon for access",
    useCases: ["unlock content", "public access", "open"],
  },
  {
    name: "alert-circle",
    importName: "AlertCircle",
    categories: ["status"],
    tags: ["warning", "error", "attention", "caution"],
    description: "Alert circle for warnings",
    useCases: ["warning message", "error state", "attention"],
  },
  {
    name: "info",
    importName: "Info",
    categories: ["status"],
    tags: ["information", "details", "help", "more"],
    description: "Info icon for information",
    useCases: ["info tooltip", "details", "help text"],
  },
  {
    name: "alert-triangle",
    importName: "AlertTriangle",
    categories: ["status"],
    tags: ["warning", "danger", "caution", "hazard"],
    description: "Warning triangle for alerts",
    useCases: ["warning alert", "danger zone", "caution"],
  },

  // ─── Development & Tech ───────────────────────────────────────────────
  {
    name: "code",
    importName: "Code",
    categories: ["development", "tech"],
    tags: ["programming", "html", "develop", "script"],
    description: "Code icon for development",
    useCases: ["code editor", "development", "programming"],
  },
  {
    name: "terminal",
    importName: "Terminal",
    categories: ["development", "tech"],
    tags: ["console", "command", "cli", "shell"],
    description: "Terminal for command line",
    useCases: ["terminal emulator", "command line", "CLI"],
  },
  {
    name: "database",
    importName: "Database",
    categories: ["development", "tech"],
    tags: ["storage", "data", "server", "backend"],
    description: "Database icon for data storage",
    useCases: ["database admin", "data storage", "backend"],
  },
  {
    name: "server",
    importName: "Server",
    categories: ["development", "tech"],
    tags: ["cloud", "hosting", "backend", "infrastructure"],
    description: "Server icon for infrastructure",
    useCases: ["server setup", "cloud hosting", "infrastructure"],
  },
  {
    name: "cloud",
    importName: "Cloud",
    categories: ["development", "tech"],
    tags: ["hosting", "saas", "deploy", "online"],
    description: "Cloud icon for cloud services",
    useCases: ["cloud hosting", "SaaS", "deploy"],
  },
  {
    name: "zap",
    importName: "Zap",
    categories: ["tech", "ui"],
    tags: ["lightning", "fast", "power", "energy"],
    description: "Zap/lightning for speed/power",
    useCases: ["fast performance", "power feature", "energy"],
  },
  {
    name: "globe",
    importName: "Globe",
    categories: ["tech"],
    tags: ["web", "internet", "online", "world"],
    description: "Globe for web/internet",
    useCases: ["web app", "internet", "online service"],
  },

  // ─── Weather & Nature ─────────────────────────────────────────────────
  {
    name: "sun",
    importName: "Sun",
    categories: ["weather", "ui"],
    tags: ["light", "bright", "day", "theme"],
    description: "Sun icon for light mode/weather",
    useCases: ["light mode toggle", "weather", "daytime"],
  },
  {
    name: "moon",
    importName: "Moon",
    categories: ["weather", "ui"],
    tags: ["dark", "night", "theme", "mode"],
    description: "Moon icon for dark mode",
    useCases: ["dark mode toggle", "night mode", "theme"],
  },
  {
    name: "cloud-rain",
    importName: "CloudRain",
    categories: ["weather"],
    tags: ["rain", "storm", "precipitation", "weather"],
    description: "Rain cloud for weather",
    useCases: ["weather app", "rain forecast", "precipitation"],
  },
  {
    name: "wind",
    importName: "Wind",
    categories: ["weather"],
    tags: ["breeze", "air", "storm", "weather"],
    description: "Wind icon for weather",
    useCases: ["weather forecast", "wind speed", "air flow"],
  },

  // ─── Maps & Location ──────────────────────────────────────────────────
  {
    name: "map-pin",
    importName: "MapPin",
    categories: ["location", "maps"],
    tags: ["location", "address", "place", "pin"],
    description: "Map pin for locations",
    useCases: ["address input", "location picker", "map marker"],
  },
  {
    name: "navigation",
    importName: "Navigation",
    categories: ["location", "maps"],
    tags: ["directions", "navigate", "route", "map"],
    description: "Navigation icon for directions",
    useCases: ["get directions", "navigation app", "route"],
  },
  {
    name: "compass",
    importName: "Compass",
    categories: ["location", "maps"],
    tags: ["direction", "navigate", "orientation", "north"],
    description: "Compass for navigation",
    useCases: ["navigation", "direction finder", "explore"],
  },

  // ─── Devices & Hardware ────────────────────────────────────────────────
  {
    name: "smartphone",
    importName: "Smartphone",
    categories: ["devices"],
    tags: ["mobile", "phone", "ios", "android"],
    description: "Smartphone for mobile",
    useCases: ["mobile app", "responsive design", "iOS/Android"],
  },
  {
    name: "laptop",
    importName: "Laptop",
    categories: ["devices"],
    tags: ["computer", "desktop", "work", "portable"],
    description: "Laptop for computing",
    useCases: ["laptop mockup", "work from home", "portable"],
  },
  {
    name: "monitor",
    importName: "Monitor",
    categories: ["devices"],
    tags: ["desktop", "screen", "display", "computer"],
    description: "Monitor for desktop displays",
    useCases: ["desktop view", "monitor mockup", "screen"],
  },
  {
    name: "headphones",
    importName: "Headphones",
    categories: ["devices", "media"],
    tags: ["audio", "music", "listen", "sound"],
    description: "Headphones for audio",
    useCases: ["music app", "audio player", "listen"],
  },

  // ─── Files & Documents ────────────────────────────────────────────────
  {
    name: "file",
    importName: "File",
    categories: ["files"],
    tags: ["document", "page", "paper", "blank"],
    description: "Generic file icon",
    useCases: ["file upload", "document", "generic file"],
  },
  {
    name: "file-plus",
    importName: "FilePlus",
    categories: ["files", "actions"],
    tags: ["new", "create", "add", "document"],
    description: "File with plus for new documents",
    useCases: ["new document", "create file", "add document"],
  },
  {
    name: "file-minus",
    importName: "FileMinus",
    categories: ["files", "actions"],
    tags: ["remove", "delete", "reduce", "document"],
    description: "File with minus for removing",
    useCases: ["remove file", "delete document"],
  },
  {
    name: "folder-plus",
    importName: "FolderPlus",
    categories: ["files", "actions"],
    tags: ["new folder", "create", "add", "directory"],
    description: "Folder with plus for new folders",
    useCases: ["new folder", "create directory"],
  },

  // ─── Arrows & Directions ──────────────────────────────────────────────
  {
    name: "arrow-up",
    importName: "ArrowUp",
    categories: ["navigation", "arrows"],
    tags: ["up", "top", "ascend", "increase"],
    description: "Up arrow",
    useCases: ["scroll to top", "move up", "increase"],
  },
  {
    name: "arrow-down",
    importName: "ArrowDown",
    categories: ["navigation", "arrows"],
    tags: ["down", "bottom", "descend", "decrease"],
    description: "Down arrow",
    useCases: ["scroll down", "move down", "decrease"],
  },
  {
    name: "maximize",
    importName: "Maximize",
    categories: ["ui", "arrows"],
    tags: ["expand", "fullscreen", "enlarge", "grow"],
    description: "Maximize for fullscreen",
    useCases: ["fullscreen", "expand view", "enlarge"],
  },
  {
    name: "minimize",
    importName: "Minimize",
    categories: ["ui", "arrows"],
    tags: ["collapse", "reduce", "shrink", "compact"],
    description: "Minimize to reduce size",
    useCases: ["minimize window", "collapse", "reduce"],
  },

  // ─── UI Elements ──────────────────────────────────────────────────────
  {
    name: "eye",
    importName: "Eye",
    categories: ["ui"],
    tags: ["view", "show", "visible", "display"],
    description: "Eye for visibility toggle",
    useCases: ["show password", "view content", "visibility"],
  },
  {
    name: "eye-off",
    importName: "EyeOff",
    categories: ["ui"],
    tags: ["hide", "invisible", "conceal", "mask"],
    description: "Eye off for hiding content",
    useCases: ["hide password", "conceal", "private"],
  },
  {
    name: "thumbs-up",
    importName: "ThumbsUp",
    categories: ["ui", "social"],
    tags: ["like", "approve", "good", "positive"],
    description: "Thumbs up for approval",
    useCases: ["like button", "approve", "positive feedback"],
  },
  {
    name: "thumbs-down",
    importName: "ThumbsDown",
    categories: ["ui", "social"],
    tags: ["dislike", "disapprove", "bad", "negative"],
    description: "Thumbs down for disapproval",
    useCases: ["dislike", "reject", "negative feedback"],
  },
  {
    name: "toggle-left",
    importName: "ToggleLeft",
    categories: ["ui"],
    tags: ["switch", "toggle", "off", "inactive"],
    description: "Toggle switch (off state)",
    useCases: ["toggle switch", "on/off control"],
  },
  {
    name: "toggle-right",
    importName: "ToggleRight",
    categories: ["ui"],
    tags: ["switch", "toggle", "on", "active"],
    description: "Toggle switch (on state)",
    useCases: ["toggle switch", "on/off control"],
  },
  {
    name: "sliders",
    importName: "SlidersHorizontal",
    categories: ["ui"],
    tags: ["adjust", "settings", "controls", "parameters"],
    description: "Sliders for adjustments",
    useCases: ["settings panel", "adjust controls", "parameters"],
  },
  {
    name: "layout",
    importName: "Layout",
    categories: ["ui"],
    tags: ["grid", "arrange", "structure", "design"],
    description: "Layout for page structure",
    useCases: ["layout selector", "page design", "grid system"],
  },
  {
    name: "grid",
    importName: "Grid3X3",
    categories: ["ui"],
    tags: ["tiles", "squares", "grid view", "layout"],
    description: "Grid for grid views",
    useCases: ["grid layout", "gallery view", "tiles"],
  },
  {
    name: "list",
    importName: "List",
    categories: ["ui"],
    tags: ["items", "unordered", "bullet", "rows"],
    description: "List for list views",
    useCases: ["list view", "items list", "rows"],
  },

  // ─── Time & Calendar ─────────────────────────────────────────────────
  {
    name: "calendar",
    importName: "Calendar",
    categories: ["time"],
    tags: ["date", "schedule", "event", "planning"],
    description: "Calendar for dates/events",
    useCases: ["date picker", "event scheduling", "calendar view"],
  },
  {
    name: "clock",
    importName: "Clock",
    categories: ["time"],
    tags: ["time", "schedule", "hour", "duration"],
    description: "Clock for time display",
    useCases: ["time picker", "schedule", "duration"],
  },
  {
    name: "timer",
    importName: "Timer",
    categories: ["time"],
    tags: ["countdown", "stopwatch", "timer", "duration"],
    description: "Timer for countdown",
    useCases: ["countdown timer", "stopwatch", "duration"],
  },

  // ─── Misc & Utility ───────────────────────────────────────────────────
  {
    name: "coffee",
    importName: "Coffee",
    categories: ["misc"],
    tags: ["cafe", "drink", "break", "morning"],
    description: "Coffee cup for cafes/breaks",
    useCases: ["cafe website", "restaurant", "morning routine"],
  },
  {
    name: "book",
    importName: "Book",
    categories: ["misc"],
    tags: ["read", "study", "education", "learning"],
    description: "Book for education/reading",
    useCases: ["education site", "reading app", "study materials"],
  },
  {
    name: "gift",
    importName: "Gift",
    categories: ["misc", "ecommerce"],
    tags: ["present", "reward", "bonus", "celebration"],
    description: "Gift box for presents/rewards",
    useCases: ["gift cards", "rewards", "special offers"],
  },
  {
    name: "award",
    importName: "Award",
    categories: ["misc"],
    tags: ["trophy", "achievement", "prize", "winner"],
    description: "Award for achievements",
    useCases: ["achievements", "certificates", "winner"],
  },
  {
    name: "zap",
    importName: "Zap",
    categories: ["ui", "tech"],
    tags: ["lightning", "fast", "power", "energy", "quick"],
    description: "Lightning bolt for speed/power",
    useCases: ["fast action", "power feature", "quick load"],
  },
  {
    name: "flame",
    importName: "Flame",
    categories: ["ui", "misc"],
    tags: ["fire", "hot", "trending", "popular"],
    description: "Flame for trending/hot content",
    useCases: ["trending", "hot deals", "popular items"],
  },
  {
    name: "rocket",
    importName: "Rocket",
    categories: ["ui", "tech"],
    tags: ["launch", "startup", "fast", "growth"],
    description: "Rocket for launch/growth",
    useCases: ["product launch", "startup", "growth metrics"],
  },
  {
    name: "target",
    importName: "Target",
    categories: ["business", "ui"],
    tags: ["goal", "aim", "focus", "objective"],
    description: "Target for goals/objectives",
    useCases: ["goals page", "KPIs", "objectives"],
  },
  {
    name: "lightbulb",
    importName: "Lightbulb",
    categories: ["misc"],
    tags: ["idea", "innovation", "thought", "creative"],
    description: "Lightbulb for ideas/innovation",
    useCases: ["new ideas", "innovation", "creative thinking"],
  },
  {
    name: "puzzle",
    importName: "Puzzle",
    categories: ["misc"],
    tags: ["puzzle", "solve", "challenge", "game"],
    description: "Puzzle piece for challenges",
    useCases: ["problem solving", "challenges", "games"],
  },
];

function searchIcons(query: string, limit = 10): LucideIcon[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);

  const scored = LUCIDE_ICONS.map((icon) => {
    let score = 0;
    const searchText =
      `${icon.name} ${icon.description} ${icon.categories.join(" ")} ${icon.tags.join(" ")} ${icon.useCases.join(" ")}`.toLowerCase();

    for (const word of queryWords) {
      if (icon.name.toLowerCase().includes(word)) score += 10;
      if (icon.tags.some((t) => t.toLowerCase().includes(word))) score += 5;
      if (icon.categories.some((c) => c.toLowerCase().includes(word))) score += 4;
      if (icon.description.toLowerCase().includes(word)) score += 3;
      if (icon.useCases.some((u) => u.toLowerCase().includes(word))) score += 2;
      if (searchText.includes(word)) score += 1;
    }

    return { icon, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.icon);
}

function getIconsByCategory(category: string): LucideIcon[] {
  return LUCIDE_ICONS.filter((icon) =>
    icon.categories.some((c) => c.toLowerCase() === category.toLowerCase())
  );
}

export const lucideIconsTool = tool({
  description: `Search and find the perfect Lucide React icons for your UI design.

Lucide React is a collection of 1000+ beautiful, consistent icons perfect for production-grade UIs.
Use this tool to find icons by name, category, use case, or description.

WHEN TO USE:
- When building any UI that needs icons (buttons, nav, status indicators, etc.)
- When you need specific icons for e-commerce, social media, tech, business, etc.
- When you want to add visual polish with appropriate iconography

HOW TO USE THE RESULTS:
1. Import the icon component from lucide-react
2. Use it in your React components with appropriate sizing and colors
3. Pair with Tailwind classes for styling

EXAMPLE USAGE:
\`\`\`tsx
import { Search, Menu, Heart } from "lucide-react";

export function MyComponent() {
  return (
    <button className="flex items-center gap-2">
      <Search className="h-5 w-5 text-gray-500" />
      Search
    </button>
  );
}
\`\`\`

POPULAR ICON CATEGORIES:
- navigation: menu, x, chevron-down, arrow-left, home, search
- actions: plus, trash-2, edit, check, refresh-cw, upload, download
- media: image, video, play, pause, camera
- communication: mail, message-circle, phone, send, bell
- business: dollar-sign, credit-card, shopping-cart, trending-up, bar-chart-2
- social: user, users, github, twitter, linkedin, instagram
- security: shield, lock, unlock, alert-circle, info
- development: code, terminal, database, server, cloud, zap
- ui: eye, eye-off, toggle-left, sliders, layout, grid, list`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Search query describing the icon you need. Examples: "shopping cart ecommerce", "navigation menu", "user profile", "warning error", "social media twitter", "play video media"',
      ),
    category: z
      .enum([
        "navigation",
        "actions",
        "media",
        "content",
        "communication",
        "business",
        "finance",
        "ecommerce",
        "social",
        "brands",
        "user",
        "security",
        "status",
        "development",
        "tech",
        "weather",
        "location",
        "maps",
        "devices",
        "files",
        "arrows",
        "ui",
        "time",
        "misc",
      ])
      .optional()
      .describe("Filter by icon category"),
    count: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(8)
      .describe("Number of icon recommendations to return"),
  }),

  execute: async ({ query, category, count = 8 }) => {
    let icons: LucideIcon[];

    if (category) {
      icons = getIconsByCategory(category);
      if (query) {
        icons = icons.filter((icon) => {
          const searchText =
            `${icon.name} ${icon.description} ${icon.tags.join(" ")} ${icon.useCases.join(" ")}`.toLowerCase();
          return query.toLowerCase().split(/\s+/).some((word) =>
            searchText.includes(word)
          );
        });
      }
    } else {
      icons = searchIcons(query, count);
    }

    return {
      query,
      category: category || "all",
      count: icons.length,
      icons: icons.slice(0, count).map((icon) => ({
        name: icon.name,
        importStatement: `import { ${icon.importName} } from "lucide-react";`,
        reactUsage: `<${icon.importName} className="h-5 w-5" />`,
        categories: icon.categories,
        tags: icon.tags,
        description: icon.description,
        useCases: icon.useCases,
      })),
      usage:
        "Install lucide-react: npm install lucide-react. Import icons and use with Tailwind classes for sizing (h-4 w-4, h-5 w-5, h-6 w-6) and colors (text-gray-500, text-blue-600).",
    };
  },
});

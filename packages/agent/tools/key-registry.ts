/**
 * Canonical Key Registry
 *
 * Single source of truth for the mapping:
 *   logical need → fixed env var name
 *
 * Rules the agent MUST follow:
 *  - Never invent an env var name for a well-known service.
 *  - Always use the exact `name` from this registry.
 *  - When multiple keys exist for one service (secret + public), all are listed.
 *  - Tags are used for fuzzy lookup: "openai" | "chatgpt" | "gpt" → OPENAI_API_KEY.
 *
 * Adding a new service: add an entry to REGISTRY and export it.
 * Removing a service: mark `deprecated: true` — never delete (backward compat).
 */

export type KeyCategory =
  | "ai"         // AI / LLM / embeddings
  | "payments"   // Payments & billing
  | "database"   // Databases & ORMs
  | "auth"       // Authentication & OAuth
  | "email"      // Email delivery
  | "storage"    // File & object storage
  | "comms"      // SMS, push, real-time comms
  | "search"     // Search & vector DBs
  | "analytics"  // Analytics, monitoring, error tracking
  | "maps"       // Geo & mapping
  | "cms"        // Content management
  | "infra"      // Infrastructure (GitHub, Vercel, etc.)
  | "other";

export interface CanonicalKeyEntry {
  /** The env var name to always use. UPPER_SNAKE_CASE. */
  name: string;
  /** Human-readable provider/service name shown in UI. */
  service: string;
  /** What role this key plays (one sentence). */
  description: string;
  /** URL where the user can generate this key. */
  docUrl: string;
  /** validate_env format preset or "auto". Omit to skip format check. */
  format?: string;
  /** If true, this key is safe to expose in the browser bundle. */
  isPublic?: boolean;
  /** Related keys from the same service (for grouping). */
  relatedKeys?: string[];
  /** Search tags — service name variants, use-case words, abbreviations. */
  tags: string[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const REGISTRY_BY_CATEGORY: Record<KeyCategory, CanonicalKeyEntry[]> = {

  // ── AI / LLM / Embeddings ──────────────────────────────────────────────────

  ai: [
    {
      name: "OPENAI_API_KEY",
      service: "OpenAI",
      description: "OpenAI API key for GPT-4, GPT-4o, DALL-E, Whisper, and embeddings.",
      docUrl: "https://platform.openai.com/api-keys",
      format: "auto",
      tags: ["openai", "gpt", "gpt4", "gpt-4", "chatgpt", "dalle", "whisper", "llm", "ai", "chat"],
    },
    {
      name: "ANTHROPIC_API_KEY",
      service: "Anthropic",
      description: "Anthropic API key for Claude models.",
      docUrl: "https://console.anthropic.com/account/keys",
      format: "auto",
      tags: ["anthropic", "claude", "claude2", "claude3", "llm", "ai"],
    },
    {
      name: "GEMINI_API_KEY",
      service: "Google Gemini",
      description: "Google AI / Gemini API key for Gemini Pro and Flash models.",
      docUrl: "https://aistudio.google.com/apikey",
      format: "auto",
      tags: ["gemini", "google", "googleai", "google-ai", "bard", "llm", "ai"],
    },
    {
      name: "GROQ_API_KEY",
      service: "Groq",
      description: "Groq API key for ultra-fast inference on Llama and Mixtral models.",
      docUrl: "https://console.groq.com/keys",
      tags: ["groq", "llama", "mixtral", "llm", "ai", "fast"],
    },
    {
      name: "MISTRAL_API_KEY",
      service: "Mistral AI",
      description: "Mistral AI API key for Mistral and Mixtral models.",
      docUrl: "https://console.mistral.ai/api-keys",
      tags: ["mistral", "mixtral", "llm", "ai", "european"],
    },
    {
      name: "COHERE_API_KEY",
      service: "Cohere",
      description: "Cohere API key for Command and embed models.",
      docUrl: "https://dashboard.cohere.com/api-keys",
      tags: ["cohere", "command", "embed", "llm", "ai"],
    },
    {
      name: "REPLICATE_API_TOKEN",
      service: "Replicate",
      description: "Replicate API token for open-source AI models (Stable Diffusion, LLaMA, etc.).",
      docUrl: "https://replicate.com/account/api-tokens",
      tags: ["replicate", "stable-diffusion", "image-gen", "llama", "ai"],
    },
    {
      name: "TOGETHER_API_KEY",
      service: "Together AI",
      description: "Together AI API key for hosted open-source models.",
      docUrl: "https://api.together.ai/settings/api-keys",
      tags: ["together", "togetherai", "llm", "ai", "open-source"],
    },
    {
      name: "PERPLEXITY_API_KEY",
      service: "Perplexity",
      description: "Perplexity API key for internet-connected AI search models.",
      docUrl: "https://www.perplexity.ai/settings/api",
      tags: ["perplexity", "sonar", "search", "llm", "ai"],
    },
    {
      name: "XAI_API_KEY",
      service: "xAI (Grok)",
      description: "xAI API key for Grok models.",
      docUrl: "https://console.x.ai",
      tags: ["xai", "x-ai", "grok", "llm", "ai"],
    },
    {
      name: "HUGGINGFACE_API_KEY",
      service: "Hugging Face",
      description: "Hugging Face API key for models and Inference API.",
      docUrl: "https://huggingface.co/settings/tokens",
      tags: ["huggingface", "hf", "transformers", "llm", "ai"],
    },
    {
      name: "ELEVENLABS_API_KEY",
      service: "ElevenLabs",
      description: "ElevenLabs API key for text-to-speech voice synthesis.",
      docUrl: "https://elevenlabs.io/app/settings/api-keys",
      tags: ["elevenlabs", "tts", "voice", "speech", "audio", "ai"],
    },
    {
      name: "STABILITY_API_KEY",
      service: "Stability AI",
      description: "Stability AI API key for Stable Diffusion image generation.",
      docUrl: "https://platform.stability.ai/account/keys",
      tags: ["stability", "stable-diffusion", "sdxl", "image-gen", "ai"],
    },
  ],

  // ── Payments ───────────────────────────────────────────────────────────────

  payments: [
    {
      name: "STRIPE_SECRET_KEY",
      service: "Stripe (server)",
      description: "Stripe secret key for server-side charges, customers, and subscriptions.",
      docUrl: "https://dashboard.stripe.com/apikeys",
      format: "auto",
      relatedKeys: ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
      tags: ["stripe", "payments", "billing", "subscriptions", "checkout"],
    },
    {
      name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      service: "Stripe (client)",
      description: "Stripe publishable key for client-side Elements and Stripe.js.",
      docUrl: "https://dashboard.stripe.com/apikeys",
      format: "auto",
      isPublic: true,
      relatedKeys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      tags: ["stripe", "payments", "publishable", "public", "elements"],
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      service: "Stripe (webhooks)",
      description: "Stripe webhook signing secret for verifying webhook event authenticity.",
      docUrl: "https://dashboard.stripe.com/webhooks",
      relatedKeys: ["STRIPE_SECRET_KEY"],
      tags: ["stripe", "webhook", "payments", "events"],
    },
    {
      name: "LEMON_SQUEEZY_API_KEY",
      service: "Lemon Squeezy",
      description: "Lemon Squeezy API key for digital product payments and subscriptions.",
      docUrl: "https://app.lemonsqueezy.com/settings/api",
      tags: ["lemonsqueezy", "lemon-squeezy", "payments", "digital", "subscriptions"],
    },
    {
      name: "LEMON_SQUEEZY_WEBHOOK_SECRET",
      service: "Lemon Squeezy (webhooks)",
      description: "Lemon Squeezy webhook signing secret.",
      docUrl: "https://app.lemonsqueezy.com/settings/webhooks",
      tags: ["lemonsqueezy", "webhook", "payments"],
    },
    {
      name: "PADDLE_API_KEY",
      service: "Paddle",
      description: "Paddle API key for merchant billing.",
      docUrl: "https://vendors.paddle.com/authentication",
      tags: ["paddle", "payments", "billing"],
    },
  ],

  // ── Database ───────────────────────────────────────────────────────────────

  database: [
    {
      name: "DATABASE_URL",
      service: "Database (generic)",
      description: "Full database connection string used by the ORM (Drizzle, Prisma, etc.).",
      docUrl: "https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING",
      format: "auto",
      tags: ["database", "db", "postgres", "postgresql", "mysql", "sqlite", "orm", "prisma", "drizzle"],
    },
    {
      name: "POSTGRES_URL",
      service: "PostgreSQL",
      description: "PostgreSQL connection string (used by Vercel Postgres and Neon).",
      docUrl: "https://neon.tech/docs/connect/connect-from-any-app",
      format: "auto",
      tags: ["postgres", "postgresql", "neon", "vercel-postgres", "database", "db"],
    },
    {
      name: "MONGODB_URI",
      service: "MongoDB",
      description: "MongoDB connection string (Atlas or self-hosted).",
      docUrl: "https://www.mongodb.com/docs/manual/reference/connection-string",
      tags: ["mongodb", "mongo", "atlas", "nosql", "database"],
    },
    {
      name: "REDIS_URL",
      service: "Redis",
      description: "Redis connection string for caching, queues, and rate limiting.",
      docUrl: "https://upstash.com/docs/redis/overall/getstarted",
      tags: ["redis", "upstash", "cache", "queue", "rate-limit", "kv"],
    },
    {
      name: "UPSTASH_REDIS_REST_URL",
      service: "Upstash Redis",
      description: "Upstash Redis REST URL for serverless-compatible Redis.",
      docUrl: "https://console.upstash.com",
      relatedKeys: ["UPSTASH_REDIS_REST_TOKEN"],
      tags: ["upstash", "redis", "serverless", "cache", "kv"],
    },
    {
      name: "UPSTASH_REDIS_REST_TOKEN",
      service: "Upstash Redis (token)",
      description: "Upstash Redis REST API token.",
      docUrl: "https://console.upstash.com",
      relatedKeys: ["UPSTASH_REDIS_REST_URL"],
      tags: ["upstash", "redis", "serverless", "cache", "kv"],
    },
    {
      name: "SUPABASE_URL",
      service: "Supabase (URL)",
      description: "Supabase project URL (e.g. https://<project>.supabase.co).",
      docUrl: "https://app.supabase.com/project/_/settings/api",
      format: "auto",
      relatedKeys: ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
      tags: ["supabase", "database", "postgres", "auth", "storage"],
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      service: "Supabase (anon/public key)",
      description: "Supabase anonymous key for browser-side queries (row-level security enforced).",
      docUrl: "https://app.supabase.com/project/_/settings/api",
      format: "auto",
      isPublic: true,
      relatedKeys: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      tags: ["supabase", "anon", "public", "database", "auth"],
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      service: "Supabase (service role)",
      description: "Supabase service role key — bypasses RLS, server-only. NEVER expose to the client.",
      docUrl: "https://app.supabase.com/project/_/settings/api",
      format: "auto",
      relatedKeys: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      tags: ["supabase", "service-role", "admin", "server", "database"],
    },
    {
      name: "PLANETSCALE_DATABASE_URL",
      service: "PlanetScale",
      description: "PlanetScale serverless MySQL connection string.",
      docUrl: "https://planetscale.com/docs/concepts/connection-strings",
      tags: ["planetscale", "mysql", "database", "serverless"],
    },
    {
      name: "TURSO_DATABASE_URL",
      service: "Turso",
      description: "Turso libSQL database URL for edge SQLite.",
      docUrl: "https://docs.turso.tech/sdk/ts/quickstart",
      relatedKeys: ["TURSO_AUTH_TOKEN"],
      tags: ["turso", "sqlite", "edge", "libsql", "database"],
    },
    {
      name: "TURSO_AUTH_TOKEN",
      service: "Turso (auth token)",
      description: "Turso database auth token.",
      docUrl: "https://docs.turso.tech/sdk/ts/quickstart",
      relatedKeys: ["TURSO_DATABASE_URL"],
      tags: ["turso", "sqlite", "edge", "database"],
    },
  ],

  // ── Authentication ─────────────────────────────────────────────────────────

  auth: [
    {
      name: "NEXTAUTH_SECRET",
      service: "NextAuth.js / Auth.js v4",
      description: "Random 32+ character secret used to sign NextAuth.js JWT sessions.",
      docUrl: "https://next-auth.js.org/configuration/options#secret",
      format: "jwt-secret",
      relatedKeys: ["NEXTAUTH_URL"],
      tags: ["nextauth", "auth", "session", "jwt", "oauth"],
    },
    {
      name: "NEXTAUTH_URL",
      service: "NextAuth.js / Auth.js v4 (URL)",
      description: "Canonical URL of your site (e.g. http://localhost:3000 in dev).",
      docUrl: "https://next-auth.js.org/configuration/options#nextauth_url",
      format: "url",
      relatedKeys: ["NEXTAUTH_SECRET"],
      tags: ["nextauth", "auth", "url", "oauth"],
    },
    {
      name: "AUTH_SECRET",
      service: "Auth.js v5",
      description: "Random 32+ character secret for Auth.js v5 JWT sessions.",
      docUrl: "https://authjs.dev/reference/core#secret",
      format: "jwt-secret",
      tags: ["authjs", "auth.js", "auth", "session", "jwt", "oauth", "v5"],
    },
    {
      name: "CLERK_SECRET_KEY",
      service: "Clerk (server)",
      description: "Clerk secret key for server-side auth operations.",
      docUrl: "https://dashboard.clerk.com/last-active?path=api-keys",
      relatedKeys: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
      tags: ["clerk", "auth", "user-management", "sessions"],
    },
    {
      name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      service: "Clerk (client)",
      description: "Clerk publishable key for client-side components.",
      docUrl: "https://dashboard.clerk.com/last-active?path=api-keys",
      isPublic: true,
      relatedKeys: ["CLERK_SECRET_KEY"],
      tags: ["clerk", "auth", "public", "client", "user-management"],
    },
    {
      name: "AUTH0_SECRET",
      service: "Auth0 (session secret)",
      description: "Random secret used to encrypt Auth0 SDK session cookies.",
      docUrl: "https://auth0.com/docs/quickstart/webapp/nextjs",
      format: "jwt-secret",
      relatedKeys: ["AUTH0_BASE_URL", "AUTH0_ISSUER_BASE_URL", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"],
      tags: ["auth0", "auth", "oauth", "sso"],
    },
    {
      name: "AUTH0_BASE_URL",
      service: "Auth0 (base URL)",
      description: "Your application's base URL (e.g. http://localhost:3000).",
      docUrl: "https://auth0.com/docs/quickstart/webapp/nextjs",
      format: "url",
      tags: ["auth0", "auth", "url"],
    },
    {
      name: "AUTH0_ISSUER_BASE_URL",
      service: "Auth0 (domain)",
      description: "Auth0 tenant domain (e.g. https://your-tenant.auth0.com).",
      docUrl: "https://manage.auth0.com/dashboard",
      format: "https-url",
      tags: ["auth0", "auth", "domain", "tenant"],
    },
    {
      name: "AUTH0_CLIENT_ID",
      service: "Auth0 (client ID)",
      description: "Auth0 application client ID.",
      docUrl: "https://manage.auth0.com/dashboard",
      tags: ["auth0", "auth", "oauth", "client-id"],
    },
    {
      name: "AUTH0_CLIENT_SECRET",
      service: "Auth0 (client secret)",
      description: "Auth0 application client secret.",
      docUrl: "https://manage.auth0.com/dashboard",
      tags: ["auth0", "auth", "oauth"],
    },
    {
      name: "GITHUB_CLIENT_ID",
      service: "GitHub OAuth (client ID)",
      description: "GitHub OAuth app client ID.",
      docUrl: "https://github.com/settings/developers",
      relatedKeys: ["GITHUB_CLIENT_SECRET"],
      tags: ["github", "oauth", "auth", "social-login"],
    },
    {
      name: "GITHUB_CLIENT_SECRET",
      service: "GitHub OAuth (client secret)",
      description: "GitHub OAuth app client secret.",
      docUrl: "https://github.com/settings/developers",
      relatedKeys: ["GITHUB_CLIENT_ID"],
      tags: ["github", "oauth", "auth", "social-login"],
    },
    {
      name: "GOOGLE_CLIENT_ID",
      service: "Google OAuth (client ID)",
      description: "Google OAuth 2.0 client ID for sign-in with Google.",
      docUrl: "https://console.cloud.google.com/apis/credentials",
      relatedKeys: ["GOOGLE_CLIENT_SECRET"],
      tags: ["google", "oauth", "auth", "social-login", "signin"],
    },
    {
      name: "GOOGLE_CLIENT_SECRET",
      service: "Google OAuth (client secret)",
      description: "Google OAuth 2.0 client secret.",
      docUrl: "https://console.cloud.google.com/apis/credentials",
      relatedKeys: ["GOOGLE_CLIENT_ID"],
      tags: ["google", "oauth", "auth", "social-login"],
    },
    {
      name: "JWT_SECRET",
      service: "JWT (custom)",
      description: "Secret key for signing custom JWTs. Must be at least 32 characters.",
      docUrl: "https://jwt.io/introduction",
      format: "jwt-secret",
      tags: ["jwt", "auth", "token", "session", "signing"],
    },
  ],

  // ── Email ──────────────────────────────────────────────────────────────────

  email: [
    {
      name: "RESEND_API_KEY",
      service: "Resend",
      description: "Resend API key for transactional email delivery.",
      docUrl: "https://resend.com/api-keys",
      format: "auto",
      tags: ["resend", "email", "transactional", "send-email"],
    },
    {
      name: "SENDGRID_API_KEY",
      service: "SendGrid",
      description: "SendGrid API key for email delivery and marketing.",
      docUrl: "https://app.sendgrid.com/settings/api_keys",
      format: "auto",
      tags: ["sendgrid", "email", "transactional", "twilio-sendgrid"],
    },
    {
      name: "POSTMARK_API_TOKEN",
      service: "Postmark",
      description: "Postmark server API token for transactional email.",
      docUrl: "https://account.postmarkapp.com/servers",
      tags: ["postmark", "email", "transactional"],
    },
    {
      name: "MAILGUN_API_KEY",
      service: "Mailgun",
      description: "Mailgun API key for email delivery.",
      docUrl: "https://app.mailgun.com/settings/api_security",
      tags: ["mailgun", "email", "transactional"],
    },
    {
      name: "LOOPS_API_KEY",
      service: "Loops",
      description: "Loops API key for product email automation.",
      docUrl: "https://app.loops.so/settings?page=api",
      tags: ["loops", "email", "automation", "marketing"],
    },
  ],

  // ── File / Object Storage ──────────────────────────────────────────────────

  storage: [
    {
      name: "AWS_ACCESS_KEY_ID",
      service: "AWS (access key)",
      description: "AWS IAM access key ID for S3, SES, and other AWS services.",
      docUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
      relatedKeys: ["AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET_NAME"],
      tags: ["aws", "s3", "amazon", "storage", "cloud"],
    },
    {
      name: "AWS_SECRET_ACCESS_KEY",
      service: "AWS (secret key)",
      description: "AWS IAM secret access key.",
      docUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
      relatedKeys: ["AWS_ACCESS_KEY_ID", "AWS_REGION", "AWS_S3_BUCKET_NAME"],
      tags: ["aws", "s3", "amazon", "storage", "cloud"],
    },
    {
      name: "AWS_REGION",
      service: "AWS (region)",
      description: "AWS region code (e.g. us-east-1, eu-west-1).",
      docUrl: "https://docs.aws.amazon.com/general/latest/gr/rande.html",
      tags: ["aws", "s3", "amazon", "region"],
    },
    {
      name: "AWS_S3_BUCKET_NAME",
      service: "AWS S3 (bucket)",
      description: "Name of the S3 bucket for file uploads.",
      docUrl: "https://s3.console.aws.amazon.com",
      tags: ["aws", "s3", "bucket", "storage"],
    },
    {
      name: "CLOUDINARY_CLOUD_NAME",
      service: "Cloudinary (cloud name)",
      description: "Cloudinary cloud name (shown in dashboard).",
      docUrl: "https://console.cloudinary.com",
      relatedKeys: ["CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
      tags: ["cloudinary", "images", "media", "storage", "cdn"],
    },
    {
      name: "CLOUDINARY_API_KEY",
      service: "Cloudinary (API key)",
      description: "Cloudinary API key for media upload and transformation.",
      docUrl: "https://console.cloudinary.com",
      relatedKeys: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_SECRET"],
      tags: ["cloudinary", "images", "media", "storage"],
    },
    {
      name: "CLOUDINARY_API_SECRET",
      service: "Cloudinary (API secret)",
      description: "Cloudinary API secret — server-only.",
      docUrl: "https://console.cloudinary.com",
      relatedKeys: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY"],
      tags: ["cloudinary", "images", "media", "storage"],
    },
    {
      name: "UPLOADTHING_TOKEN",
      service: "UploadThing",
      description: "UploadThing API token for file uploads.",
      docUrl: "https://uploadthing.com/dashboard",
      tags: ["uploadthing", "upload", "files", "storage"],
    },
  ],

  // ── Communications ─────────────────────────────────────────────────────────

  comms: [
    {
      name: "TWILIO_ACCOUNT_SID",
      service: "Twilio (account SID)",
      description: "Twilio account SID for SMS, voice, and WhatsApp.",
      docUrl: "https://console.twilio.com",
      format: "auto",
      relatedKeys: ["TWILIO_AUTH_TOKEN"],
      tags: ["twilio", "sms", "phone", "voice", "whatsapp", "comms"],
    },
    {
      name: "TWILIO_AUTH_TOKEN",
      service: "Twilio (auth token)",
      description: "Twilio auth token — server-only. NEVER expose to the client.",
      docUrl: "https://console.twilio.com",
      format: "auto",
      relatedKeys: ["TWILIO_ACCOUNT_SID"],
      tags: ["twilio", "sms", "phone", "voice", "comms"],
    },
    {
      name: "TWILIO_PHONE_NUMBER",
      service: "Twilio (phone number)",
      description: "Twilio phone number for outbound SMS (e.g. +15555551234).",
      docUrl: "https://console.twilio.com/us1/develop/phone-numbers/manage/active",
      tags: ["twilio", "sms", "phone"],
    },
    {
      name: "NEXT_PUBLIC_PUSHER_KEY",
      service: "Pusher (client key)",
      description: "Pusher app key for client-side channel subscriptions.",
      docUrl: "https://dashboard.pusher.com/apps",
      isPublic: true,
      relatedKeys: ["PUSHER_APP_ID", "PUSHER_APP_SECRET", "NEXT_PUBLIC_PUSHER_CLUSTER"],
      tags: ["pusher", "websocket", "real-time", "events", "pubsub"],
    },
    {
      name: "PUSHER_APP_ID",
      service: "Pusher (app ID)",
      description: "Pusher app ID for server-side event triggering.",
      docUrl: "https://dashboard.pusher.com/apps",
      relatedKeys: ["PUSHER_APP_SECRET", "NEXT_PUBLIC_PUSHER_KEY"],
      tags: ["pusher", "websocket", "real-time"],
    },
    {
      name: "PUSHER_APP_SECRET",
      service: "Pusher (secret)",
      description: "Pusher app secret for server-side event authentication.",
      docUrl: "https://dashboard.pusher.com/apps",
      relatedKeys: ["PUSHER_APP_ID", "NEXT_PUBLIC_PUSHER_KEY"],
      tags: ["pusher", "websocket", "real-time"],
    },
    {
      name: "LIVEKIT_API_KEY",
      service: "LiveKit (API key)",
      description: "LiveKit API key for real-time audio/video rooms.",
      docUrl: "https://cloud.livekit.io",
      relatedKeys: ["LIVEKIT_API_SECRET", "LIVEKIT_URL"],
      tags: ["livekit", "webrtc", "video", "audio", "real-time"],
    },
    {
      name: "LIVEKIT_API_SECRET",
      service: "LiveKit (secret)",
      description: "LiveKit API secret — server-only.",
      docUrl: "https://cloud.livekit.io",
      relatedKeys: ["LIVEKIT_API_KEY", "LIVEKIT_URL"],
      tags: ["livekit", "webrtc", "video", "audio", "real-time"],
    },
    {
      name: "LIVEKIT_URL",
      service: "LiveKit (URL)",
      description: "LiveKit server WebSocket URL (e.g. wss://your-project.livekit.cloud).",
      docUrl: "https://cloud.livekit.io",
      tags: ["livekit", "webrtc", "url"],
    },
  ],

  // ── Search / Vector DBs ────────────────────────────────────────────────────

  search: [
    {
      name: "PINECONE_API_KEY",
      service: "Pinecone",
      description: "Pinecone API key for vector search and similarity queries.",
      docUrl: "https://app.pinecone.io/organizations/-/projects/-/keys",
      format: "auto",
      relatedKeys: ["PINECONE_INDEX_NAME"],
      tags: ["pinecone", "vector", "embeddings", "search", "rag", "ai"],
    },
    {
      name: "PINECONE_INDEX_NAME",
      service: "Pinecone (index)",
      description: "Name of the Pinecone index to query/write.",
      docUrl: "https://app.pinecone.io",
      tags: ["pinecone", "vector", "index"],
    },
    {
      name: "ALGOLIA_APP_ID",
      service: "Algolia (app ID)",
      description: "Algolia application ID for full-text search.",
      docUrl: "https://www.algolia.com/account/api-keys",
      relatedKeys: ["ALGOLIA_ADMIN_KEY", "NEXT_PUBLIC_ALGOLIA_SEARCH_KEY"],
      tags: ["algolia", "search", "full-text"],
    },
    {
      name: "ALGOLIA_ADMIN_KEY",
      service: "Algolia (admin key)",
      description: "Algolia admin API key for indexing — server-only.",
      docUrl: "https://www.algolia.com/account/api-keys",
      relatedKeys: ["ALGOLIA_APP_ID"],
      tags: ["algolia", "search", "admin"],
    },
    {
      name: "NEXT_PUBLIC_ALGOLIA_SEARCH_KEY",
      service: "Algolia (search key)",
      description: "Algolia search-only API key — safe to expose to the browser.",
      docUrl: "https://www.algolia.com/account/api-keys",
      isPublic: true,
      relatedKeys: ["ALGOLIA_APP_ID"],
      tags: ["algolia", "search", "public", "client"],
    },
    {
      name: "WEAVIATE_URL",
      service: "Weaviate (URL)",
      description: "Weaviate cluster URL for vector search.",
      docUrl: "https://console.weaviate.cloud",
      relatedKeys: ["WEAVIATE_API_KEY"],
      tags: ["weaviate", "vector", "search", "rag"],
    },
    {
      name: "WEAVIATE_API_KEY",
      service: "Weaviate (API key)",
      description: "Weaviate API key for authenticated cluster access.",
      docUrl: "https://console.weaviate.cloud",
      tags: ["weaviate", "vector", "search"],
    },
    {
      name: "QDRANT_URL",
      service: "Qdrant (URL)",
      description: "Qdrant cluster URL for vector search.",
      docUrl: "https://cloud.qdrant.io",
      relatedKeys: ["QDRANT_API_KEY"],
      tags: ["qdrant", "vector", "search", "embeddings"],
    },
    {
      name: "QDRANT_API_KEY",
      service: "Qdrant (API key)",
      description: "Qdrant API key for cloud cluster access.",
      docUrl: "https://cloud.qdrant.io",
      tags: ["qdrant", "vector", "search"],
    },
  ],

  // ── Analytics / Monitoring ─────────────────────────────────────────────────

  analytics: [
    {
      name: "NEXT_PUBLIC_POSTHOG_KEY",
      service: "PostHog",
      description: "PostHog project API key for product analytics and feature flags.",
      docUrl: "https://us.posthog.com/settings/project-details",
      isPublic: true,
      relatedKeys: ["NEXT_PUBLIC_POSTHOG_HOST"],
      tags: ["posthog", "analytics", "feature-flags", "product-analytics"],
    },
    {
      name: "NEXT_PUBLIC_POSTHOG_HOST",
      service: "PostHog (host)",
      description: "PostHog host URL (https://us.posthog.com or self-hosted).",
      docUrl: "https://posthog.com",
      isPublic: true,
      format: "https-url",
      tags: ["posthog", "analytics"],
    },
    {
      name: "SENTRY_DSN",
      service: "Sentry",
      description: "Sentry DSN for server-side error tracking.",
      docUrl: "https://sentry.io/settings/projects/",
      relatedKeys: ["NEXT_PUBLIC_SENTRY_DSN"],
      tags: ["sentry", "errors", "monitoring", "observability"],
    },
    {
      name: "NEXT_PUBLIC_SENTRY_DSN",
      service: "Sentry (client DSN)",
      description: "Sentry DSN for client-side browser error tracking.",
      docUrl: "https://sentry.io/settings/projects/",
      isPublic: true,
      tags: ["sentry", "errors", "monitoring", "client"],
    },
    {
      name: "MIXPANEL_TOKEN",
      service: "Mixpanel",
      description: "Mixpanel project token for event analytics.",
      docUrl: "https://mixpanel.com/settings/project",
      tags: ["mixpanel", "analytics", "events"],
    },
    {
      name: "SEGMENT_WRITE_KEY",
      service: "Segment",
      description: "Segment write key for unified data tracking.",
      docUrl: "https://segment.com/docs/connections/find-writekey",
      tags: ["segment", "analytics", "cdp", "data"],
    },
  ],

  // ── Maps / Geo ─────────────────────────────────────────────────────────────

  maps: [
    {
      name: "NEXT_PUBLIC_MAPBOX_TOKEN",
      service: "Mapbox",
      description: "Mapbox public access token for maps and geocoding.",
      docUrl: "https://account.mapbox.com/access-tokens",
      isPublic: true,
      tags: ["mapbox", "maps", "geo", "geocoding", "directions"],
    },
    {
      name: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
      service: "Google Maps",
      description: "Google Maps JavaScript API key for maps and places.",
      docUrl: "https://console.cloud.google.com/apis/credentials",
      isPublic: true,
      tags: ["google-maps", "maps", "geo", "places", "directions"],
    },
  ],

  // ── CMS ────────────────────────────────────────────────────────────────────

  cms: [
    {
      name: "SANITY_PROJECT_ID",
      service: "Sanity (project ID)",
      description: "Sanity project ID (visible in sanity.config.ts).",
      docUrl: "https://www.sanity.io/manage",
      relatedKeys: ["SANITY_DATASET", "SANITY_API_TOKEN"],
      tags: ["sanity", "cms", "content"],
    },
    {
      name: "SANITY_DATASET",
      service: "Sanity (dataset)",
      description: "Sanity dataset name (typically 'production').",
      docUrl: "https://www.sanity.io/manage",
      tags: ["sanity", "cms", "dataset"],
    },
    {
      name: "SANITY_API_TOKEN",
      service: "Sanity (write token)",
      description: "Sanity API token for server-side writes (mutations).",
      docUrl: "https://www.sanity.io/manage",
      tags: ["sanity", "cms", "write", "mutations"],
    },
    {
      name: "CONTENTFUL_SPACE_ID",
      service: "Contentful (space ID)",
      description: "Contentful space ID for content delivery.",
      docUrl: "https://app.contentful.com/account/spaces",
      relatedKeys: ["CONTENTFUL_ACCESS_TOKEN"],
      tags: ["contentful", "cms", "content"],
    },
    {
      name: "CONTENTFUL_ACCESS_TOKEN",
      service: "Contentful (access token)",
      description: "Contentful Content Delivery API access token.",
      docUrl: "https://app.contentful.com/account/spaces",
      tags: ["contentful", "cms", "content"],
    },
  ],

  // ── Infrastructure ─────────────────────────────────────────────────────────

  infra: [
    {
      name: "GITHUB_TOKEN",
      service: "GitHub (personal access token)",
      description: "GitHub personal access token for API access, CI, and automation.",
      docUrl: "https://github.com/settings/tokens",
      format: "auto",
      tags: ["github", "git", "ci", "automation", "api"],
    },
    {
      name: "VERCEL_ACCESS_TOKEN",
      service: "Vercel",
      description: "Vercel personal access token for deployments and project management.",
      docUrl: "https://vercel.com/account/tokens",
      tags: ["vercel", "deploy", "hosting"],
    },
    {
      name: "ENCRYPTION_KEY",
      service: "App encryption",
      description: "Master encryption key for encrypting secrets at rest. Generate with: openssl rand -hex 32",
      docUrl: "https://nodejs.org/api/crypto.html",
      tags: ["encryption", "security", "crypto", "key"],
    },
  ],

  // ── Other ──────────────────────────────────────────────────────────────────

  other: [
    {
      name: "NEXT_PUBLIC_APP_URL",
      service: "App URL",
      description: "Public URL of the application (e.g. https://myapp.com). Used for OG tags, canonical URLs, etc.",
      docUrl: "",
      isPublic: true,
      format: "https-url",
      tags: ["url", "app-url", "base-url", "canonical", "og"],
    },
    {
      name: "CRON_SECRET",
      service: "Cron job secret",
      description: "Secret used to authenticate requests to cron job endpoints.",
      docUrl: "",
      format: "jwt-secret",
      tags: ["cron", "webhook", "secret", "security"],
    },
  ],
};

// ─── Flat list and indexes ────────────────────────────────────────────────────

/** All registered keys as a flat array. */
export const REGISTRY: CanonicalKeyEntry[] = Object.values(REGISTRY_BY_CATEGORY).flat();

/** Fast O(1) lookup by exact canonical name. */
const byName = new Map<string, CanonicalKeyEntry>(
  REGISTRY.map((e) => [e.name, e]),
);

/** Tag index for fuzzy search: tag → entries. */
const byTag = new Map<string, CanonicalKeyEntry[]>();
for (const entry of REGISTRY) {
  for (const tag of entry.tags) {
    const existing = byTag.get(tag) ?? [];
    existing.push(entry);
    byTag.set(tag, existing);
  }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Returns the registry entry for a canonical name, or undefined. */
export function getCanonicalEntry(name: string): CanonicalKeyEntry | undefined {
  return byName.get(name);
}

/** Returns true when `name` is a known canonical env var name. */
export function isCanonicalName(name: string): boolean {
  return byName.has(name);
}

/**
 * Search the registry by a natural-language query (service name, tag, or
 * canonical name). Returns the best matches, most relevant first.
 *
 * Examples:
 *   findCanonicalKeys("openai")       → [OPENAI_API_KEY]
 *   findCanonicalKeys("payments")     → [STRIPE_SECRET_KEY, ...]
 *   findCanonicalKeys("STRIPE")       → [STRIPE_SECRET_KEY, ...]
 */
export function findCanonicalKeys(query: string): CanonicalKeyEntry[] {
  const q = query.toLowerCase().replace(/[^a-z0-9_-]/g, "");

  // 1. Exact name match
  const exact = byName.get(query.toUpperCase());
  if (exact) return [exact];

  // 2. Tag match
  const tagMatches = byTag.get(q) ?? [];

  // 3. Partial name match (canonical name contains query)
  const nameMatches = REGISTRY.filter(
    (e) => e.name.toLowerCase().includes(q) && !tagMatches.includes(e),
  );

  // 4. Service name match
  const serviceMatches = REGISTRY.filter(
    (e) =>
      e.service.toLowerCase().includes(q) &&
      !tagMatches.includes(e) &&
      !nameMatches.includes(e),
  );

  return [...tagMatches, ...nameMatches, ...serviceMatches];
}

/**
 * Given a list of names the agent wants to use, return:
 *  - `canonical`: names found in the registry
 *  - `unknown`: names not in the registry (project-specific — OK)
 *  - `suggestions`: for unknown names, registry entries that might be what was intended
 */
export function auditRequestedNames(names: string[]): {
  canonical: string[];
  unknown: string[];
  suggestions: Array<{ requested: string; alternatives: CanonicalKeyEntry[] }>;
} {
  const canonical: string[] = [];
  const unknown: string[] = [];
  const suggestions: Array<{ requested: string; alternatives: CanonicalKeyEntry[] }> = [];

  for (const name of names) {
    if (isCanonicalName(name)) {
      canonical.push(name);
    } else {
      unknown.push(name);
      // Try to find what the agent might have meant
      const words = name.toLowerCase().split(/[_\s]+/);
      const alts = new Map<string, CanonicalKeyEntry>();
      for (const word of words) {
        if (word.length < 3) continue;
        for (const entry of findCanonicalKeys(word)) {
          alts.set(entry.name, entry);
        }
      }
      if (alts.size > 0) {
        suggestions.push({ requested: name, alternatives: [...alts.values()].slice(0, 3) });
      }
    }
  }

  return { canonical, unknown, suggestions };
}

/**
 * Build the canonical names reference table for the system prompt.
 * Groups entries by category and returns a Markdown table string.
 */
export function buildRegistryMarkdownTable(): string {
  const CATEGORY_LABELS: Record<KeyCategory, string> = {
    ai: "AI / LLM",
    payments: "Payments",
    database: "Database",
    auth: "Auth",
    email: "Email",
    storage: "Storage",
    comms: "Communications",
    search: "Search / Vector",
    analytics: "Analytics",
    maps: "Maps",
    cms: "CMS",
    infra: "Infrastructure",
    other: "Other",
  };

  const sections: string[] = [];

  for (const [cat, entries] of Object.entries(REGISTRY_BY_CATEGORY) as [KeyCategory, CanonicalKeyEntry[]][]) {
    const rows = entries.map((e) => {
      const publicBadge = e.isPublic ? " *(client-safe)*" : "";
      return `| \`${e.name}\`${publicBadge} | ${e.service} | ${e.description} |`;
    });
    sections.push(
      `**${CATEGORY_LABELS[cat]}**\n| Name | Service | Purpose |\n|---|---|---|\n${rows.join("\n")}`,
    );
  }

  return sections.join("\n\n");
}

// Node/Vercel runtime. No local database or mock identity bindings are exposed.
export const env = {} as typeof import('cloudflare:workers').env;
export const isCloudflareRuntime = false;

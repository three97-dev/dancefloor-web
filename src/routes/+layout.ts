// Copy must be readable with JavaScript disabled, so every route is
// server-rendered and prerendered.
export const prerender = true;
export const ssr = true;

// Emit directory-style output (pricing/index.html rather than pricing.html).
// Extensionless resolution is host-specific; this works identically on GitHub
// Pages, Netlify, S3 or a plain file server.
export const trailingSlash = 'always';

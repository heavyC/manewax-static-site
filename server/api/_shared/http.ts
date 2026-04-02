const DEFAULT_ALLOWED_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "Stripe-Signature",
  "X-Cart-Session-Id",
  "X-User-Id",
  "X-Clerk-User-Id",
].join(", ");

export function getOptionalUserId(request: Request) {
  return request.headers.get("x-clerk-user-id")?.trim() || request.headers.get("x-user-id")?.trim() || null;
}

export function getCartSessionId(request: Request) {
  return request.headers.get("x-cart-session-id")?.trim() || null;
}

function getConfiguredOrigins() {
  const rawOrigins = process.env.ALLOWED_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "*";
  const origins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : ["*"];
}

function resolveAllowedOrigin(request?: Request) {
  const configuredOrigins = getConfiguredOrigins();
  if (configuredOrigins.includes("*")) {
    return "*";
  }

  const requestOrigin = request?.headers.get("origin")?.trim();
  if (requestOrigin && configuredOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return configuredOrigins[0];
}

export function withCors(response: Response, request?: Request) {
  const headers = new Headers(response.headers);
  const allowedOrigin = resolveAllowedOrigin(request);

  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS);
  headers.set("Access-Control-Allow-Credentials", allowedOrigin === "*" ? "false" : "true");
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function jsonResponse(body: unknown, init?: ResponseInit, request?: Request) {
  const headers = new Headers(init?.headers);

  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }

  return withCors(Response.json(body, { ...init, headers }), request);
}

export function noContent(request?: Request) {
  return withCors(new Response(null, { status: 204 }), request);
}

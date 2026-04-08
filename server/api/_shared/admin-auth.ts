import { createClerkClient, verifyToken } from "@clerk/nextjs/server";
import { jsonResponse } from "@/server/api/_shared/http";

export type DashboardRole = "viewer" | "admin";

export type DashboardAccess = {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: DashboardRole;
};

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

function normalizeRole(value: unknown): DashboardRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "admin" || normalized === "viewer") {
    return normalized;
  }

  return null;
}

function resolveDashboardRole(user: {
  privateMetadata?: Record<string, unknown>;
  publicMetadata?: Record<string, unknown>;
}) {
  const normalizedRoles = [
    normalizeRole(user.privateMetadata?.dashboardRole),
    normalizeRole(user.privateMetadata?.role),
    normalizeRole(user.publicMetadata?.dashboardRole),
    normalizeRole(user.publicMetadata?.role),
  ].filter((value): value is DashboardRole => Boolean(value));

  if (normalizedRoles.includes("admin")) {
    return "admin" as const;
  }

  if (normalizedRoles.includes("viewer")) {
    return "viewer" as const;
  }

  return null;
}

function collectAuthorizedParties() {
  const rawValues = [process.env.NEXT_PUBLIC_APP_URL, process.env.ALLOWED_ORIGIN]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((value) => trimTrailingSlash(value.trim()))
    .filter(Boolean);

  return Array.from(new Set(rawValues));
}

function readClerkUserIdHeader(request: Request) {
  const value = request.headers.get("x-clerk-user-id")?.trim();
  return value || null;
}

function isLocalDevelopmentRequest(request: Request) {
  try {
    const url = new URL(request.url);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function requireDashboardAccess(
  request: Request,
  options?: { requireAdmin?: boolean }
): Promise<{ access: DashboardAccess } | { response: Response }> {
  const token = readBearerToken(request);
  const localUserId = isLocalDevelopmentRequest(request) ? readClerkUserIdHeader(request) : null;

  if (!token && !localUserId) {
    return {
      response: jsonResponse({ error: "Please sign in to access the dashboard." }, { status: 401 }, request),
    };
  }

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    return {
      response: jsonResponse(
        { error: "Clerk is not configured for the dashboard backend." },
        { status: 500 },
        request
      ),
    };
  }

  try {
    const authorizedParties = collectAuthorizedParties();
    const clerk = createClerkClient({ secretKey });
    const authErrors: string[] = [];

    let userId = localUserId;

    if (!userId && token) {
      let verified = await verifyToken(token, {
        secretKey,
        ...(authorizedParties.length > 0 ? { authorizedParties } : {}),
      });

      userId = typeof (verified.data as { sub?: unknown } | undefined)?.sub === "string"
        ? (verified.data as { sub: string }).sub
        : null;

      if (!userId && Array.isArray(verified.errors)) {
        authErrors.push(
          ...verified.errors.map((error) => (error instanceof Error ? error.message : String(error)))
        );

        verified = await verifyToken(token, { secretKey });
        userId = typeof (verified.data as { sub?: unknown } | undefined)?.sub === "string"
          ? (verified.data as { sub: string }).sub
          : null;

        if (!userId && Array.isArray(verified.errors)) {
          authErrors.push(
            ...verified.errors.map((error) => (error instanceof Error ? error.message : String(error)))
          );
        }
      }

      if (!userId) {
        const requestState = await clerk.authenticateRequest(request, {
          acceptsToken: "session_token",
          ...(authorizedParties.length > 0 ? { authorizedParties } : {}),
        });

        if (requestState.isAuthenticated) {
          userId = requestState.toAuth().userId;
        } else {
          if (requestState.reason) {
            authErrors.push(requestState.reason);
          }
          if (requestState.message) {
            authErrors.push(requestState.message);
          }
        }
      }
    }

    if (!userId) {
      const details = authErrors.filter(Boolean).join("; ") || "Session token could not be verified.";

      return {
        response: jsonResponse(
          { error: "Your session is invalid or expired.", details },
          { status: 401 },
          request
        ),
      };
    }

    const user = await clerk.users.getUser(userId);
    const role = resolveDashboardRole(user);

    if (!role) {
      return {
        response: jsonResponse(
          { error: "This Clerk account does not have dashboard access." },
          { status: 403 },
          request
        ),
      };
    }

    if (options?.requireAdmin && role !== "admin") {
      return {
        response: jsonResponse({ error: "Admin access is required for this action." }, { status: 403 }, request),
      };
    }

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null;

    return {
      access: {
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        displayName,
        role,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      response: jsonResponse(
        { error: "Dashboard authentication failed.", details: message },
        { status: 401 },
        request
      ),
    };
  }
}

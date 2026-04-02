import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import * as cartRoute from "@/server/api/cart/route";
import * as createSessionRoute from "@/server/api/checkout/create-session/route";
import * as validatePromoRoute from "@/server/api/checkout/validate-promo/route";
import * as webhookRoute from "@/server/api/checkout/webhook/route";
import * as productsRoute from "@/server/api/products/route";
import * as productBySlugRoute from "@/server/api/products/[slug]/route";
import * as testDbRoute from "@/server/api/test-db/route";
import { noContent, withCors } from "@/server/api/_shared/http";

type RouteMatch = {
  method: string;
  pattern: RegExp;
  handler: (request: Request, match: RegExpMatchArray) => Promise<Response> | Response;
};

const routes: RouteMatch[] = [
  { method: "GET", pattern: /^\/api\/cart\/?$/, handler: (request) => cartRoute.GET(request) },
  { method: "POST", pattern: /^\/api\/cart\/?$/, handler: (request) => cartRoute.POST(request) },
  { method: "PATCH", pattern: /^\/api\/cart\/?$/, handler: (request) => cartRoute.PATCH(request) },
  { method: "DELETE", pattern: /^\/api\/cart\/?$/, handler: (request) => cartRoute.DELETE(request) },
  {
    method: "POST",
    pattern: /^\/api\/checkout\/create-session\/?$/,
    handler: (request) => createSessionRoute.POST(request),
  },
  {
    method: "POST",
    pattern: /^\/api\/checkout\/validate-promo\/?$/,
    handler: (request) => validatePromoRoute.POST(request),
  },
  {
    method: "POST",
    pattern: /^\/api\/checkout\/webhook\/?$/,
    handler: (request) => webhookRoute.POST(request),
  },
  { method: "GET", pattern: /^\/api\/products\/?$/, handler: (request) => productsRoute.GET(request) },
  {
    method: "GET",
    pattern: /^\/api\/products\/([^/]+)\/?$/,
    handler: (request, match) =>
      productBySlugRoute.GET(request, {
        params: Promise.resolve({ slug: decodeURIComponent(match[1] ?? "") }),
      }),
  },
  { method: "GET", pattern: /^\/api\/test-db\/?$/, handler: () => testDbRoute.GET() },
];

function buildHeaders(rawHeaders: APIGatewayProxyEventV2["headers"]) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(rawHeaders ?? {})) {
    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  return headers;
}

function buildRequest(event: APIGatewayProxyEventV2) {
  const headers = buildHeaders(event.headers);
  const host = headers.get("x-forwarded-host") ?? event.requestContext.domainName ?? "localhost";
  const protocol = headers.get("x-forwarded-proto") ?? "https";
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const url = `${protocol}://${host}${event.rawPath}${query}`;

  const body = event.body
    ? event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body
    : undefined;

  return new Request(url, {
    method: event.requestContext.http.method,
    headers,
    body,
  });
}

async function responseToLambda(response: Response): Promise<APIGatewayProxyResultV2> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const request = buildRequest(event);
  const method = event.requestContext.http.method.toUpperCase();

  if (method === "OPTIONS") {
    return responseToLambda(noContent(request));
  }

  const route = routes.find((candidate) => candidate.method === method && candidate.pattern.test(event.rawPath));

  if (!route) {
    return responseToLambda(
      withCors(
        Response.json({ error: `No route matched ${method} ${event.rawPath}` }, { status: 404 }),
        request
      )
    );
  }

  const match = event.rawPath.match(route.pattern);
  if (!match) {
    return responseToLambda(
      withCors(Response.json({ error: "Route parameters could not be resolved" }, { status: 500 }), request)
    );
  }

  try {
    const response = await route.handler(request, match);
    return responseToLambda(withCors(response, request));
  } catch (error) {
    return responseToLambda(
      withCors(
        Response.json(
          {
            error: "Unhandled API error",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        ),
        request
      )
    );
  }
}

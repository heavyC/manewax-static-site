import "dotenv/config";

import { createServer, type IncomingHttpHeaders, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { handler } from "./lambda/handler";

const port = Number(process.env.LOCAL_API_PORT ?? "3001");

function normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      normalized[key] = value.join(", ");
      continue;
    }

    if (typeof value === "string") {
      normalized[key] = value;
    }
  }

  return normalized;
}

async function readBody(request: AsyncIterable<Buffer | string>) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function buildEvent(method: string, url: URL, headers: Record<string, string>, body: Buffer): APIGatewayProxyEventV2 {
  const host = headers.host ?? `localhost:${port}`;

  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: url.pathname,
    rawQueryString: url.search.startsWith("?") ? url.search.slice(1) : url.search,
    cookies: [],
    headers,
    requestContext: {
      accountId: "local",
      apiId: "local",
      domainName: host,
      domainPrefix: "local",
      http: {
        method,
        path: url.pathname,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: headers["user-agent"] ?? "local-api",
      },
      requestId: randomUUID(),
      routeKey: "$default",
      stage: "$default",
      time: new Date().toUTCString(),
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
    body: body.length > 0 ? body.toString("utf8") : undefined,
  };
}

function writeResponse(response: ServerResponse, result: APIGatewayProxyResultV2) {
  if (typeof result === "string") {
    response.statusCode = 200;
    response.end(result);
    return;
  }

  for (const [key, value] of Object.entries(result.headers ?? {})) {
    if (typeof value === "string" || typeof value === "number") {
      response.setHeader(key, value);
    }
  }

  if (Array.isArray(result.cookies) && result.cookies.length > 0) {
    response.setHeader("Set-Cookie", result.cookies);
  }

  response.statusCode = result.statusCode ?? 200;
  response.end(result.body ?? "");
}

const server = createServer(async (request, response) => {
  try {
    const method = request.method?.toUpperCase() ?? "GET";
    const host = request.headers.host ?? `localhost:${port}`;
    const url = new URL(request.url ?? "/", `http://${host}`);
    const headers = normalizeHeaders(request.headers);
    const body = await readBody(request);

    const result = await handler(buildEvent(method, url, headers, body));
    writeResponse(response, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    response.statusCode = 500;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: "Local API server failed", details: message }));
  }
});

server.listen(port, () => {
  console.log(`Manewax local API running at http://localhost:${port}/api`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

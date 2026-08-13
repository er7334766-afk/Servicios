import crypto from "node:crypto";

const WORKSPACE_ID = process.env.LOG_ANALYTICS_WORKSPACE_ID;
const WORKSPACE_KEY = process.env.LOG_ANALYTICS_WORKSPACE_KEY;
const LOG_TYPE = process.env.LOG_ANALYTICS_LOG_TYPE ?? "ServiciosSecurity";

function hasLogAnalyticsConfig() {
  return Boolean(WORKSPACE_ID && WORKSPACE_KEY);
}

export async function sendToLogAnalytics(event: string, details: Record<string, unknown> = {}) {
  if (!hasLogAnalyticsConfig()) {
    return false;
  }

  try {
    const payload = [{
      time: new Date().toISOString(),
      event,
      details,
      source: "backend-services",
    }];

    const body = JSON.stringify(payload);
    const date = new Date().toUTCString();
    const contentLength = Buffer.byteLength(body, "utf8");
    const method = "POST";
    const resource = "/api/logs";
    const contentType = "application/json";

    const stringToSign = [
      method,
      String(contentLength),
      contentType,
      `x-ms-date:${date}`,
      resource,
    ].join("\n");

    const decodedKey = Buffer.from(String(WORKSPACE_KEY), "base64");
    const signature = crypto
      .createHmac("sha256", decodedKey)
      .update(stringToSign, "utf8")
      .digest("base64");

    const auth = `SharedKey ${WORKSPACE_ID}:${signature}`;

    const response = await fetch(`https://${WORKSPACE_ID}.ods.opinsights.azure.com/api/logs?api-version=2016-04-24`, {
      method,
      headers: {
        "Content-Type": contentType,
        "Log-Type": LOG_TYPE,
        "x-ms-date": date,
        Authorization: auth,
        "time-generated-field": "time",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Log Analytics warning:", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("No se pudo enviar a Log Analytics:", error);
    return false;
  }
}

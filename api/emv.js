/**
 * EMV 待办专用 Vercel Serverless API。
 * 读取另一份 Notion 数据库：
 * Artist / Handle / Event / Account Type / View Post / Posted Time / Status。
 * Status 为 Active 的记录不进入待办清单。
 * Sprint Status / Sort Priority 仅作 Notion 侧自动化参考，前端会按 Posted Time 实时重算并置顶。
 * 密钥只读 process.env，不会写进前端或响应体。
 */

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";
const EMV_CACHE_MS = 60_000;

let emvCache = null;

function sanitizeEnvValue(value) {
  let trimmed = String(value || "").trim();
  while (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function readEnv(name) {
  return sanitizeEnvValue(process.env[name] || "");
}

function isPlaceholderValue(value) {
  return (
    !value ||
    value.includes("your_notion") ||
    value.includes("your_32_char") ||
    value === "your_notion_integration_secret_here" ||
    value === "your_32_char_database_id_here" ||
    value === "your_32_char_emv_database_id_here"
  );
}

function getEmvDatabaseId() {
  // 正式变量名是 NOTION_EMV_ID；旧名 NOTION_EMV_DATABASE_ID 仍兼容
  return readEnv("NOTION_EMV_ID") || readEnv("NOTION_EMV_DATABASE_ID");
}

function isConfigured() {
  const apiKey = readEnv("NOTION_API_KEY");
  const databaseId = getEmvDatabaseId();
  return Boolean(
    apiKey &&
      databaseId &&
      !isPlaceholderValue(apiKey) &&
      !isPlaceholderValue(databaseId),
  );
}

function normalizeNotionId(id) {
  const trimmed = sanitizeEnvValue(id);
  if (trimmed.includes("-")) return trimmed;
  const hex = trimmed.replace(/[^a-fA-F0-9]/g, "");
  if (hex.length !== 32) return trimmed;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getPropertyNames() {
  return {
    artist: readEnv("NOTION_EMV_PROP_ARTIST") || "Artist",
    handle: readEnv("NOTION_EMV_PROP_HANDLE") || "Handle",
    event: readEnv("NOTION_EMV_PROP_EVENT") || "Event",
    accountType: readEnv("NOTION_EMV_PROP_ACCOUNT_TYPE") || "Account Type",
    viewPost: readEnv("NOTION_EMV_PROP_VIEW_POST") || "View Post",
    postedTime: readEnv("NOTION_EMV_PROP_POSTED_TIME") || "Posted Time",
    status: readEnv("NOTION_EMV_PROP_STATUS") || "Status",
  };
}

function isHiddenEmvStatus(status) {
  // Notion 可能是 Status、Select 或公式结果；只隐藏 Archived 状态
  return String(status || "")
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .includes("archived");
}

class NotionSyncError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "NotionSyncError";
    this.code = code;
    this.status = status;
  }
}

function sanitizePublicError(message) {
  const apiKey = readEnv("NOTION_API_KEY");
  let text = String(message || "Unknown Notion sync error");
  if (apiKey && apiKey.length > 8) {
    text = text.split(apiKey).join("[redacted]");
  }
  return text.replace(/ntn_[A-Za-z0-9]+/g, "[redacted]").replace(/secret_[A-Za-z0-9]+/g, "[redacted]");
}

async function notionRequest(path, init) {
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${readEnv("NOTION_API_KEY")}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init && init.headers ? init.headers : {}),
    },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new NotionSyncError(
      (body && body.message) || `Notion API returned ${response.status}`,
      body && body.code,
      (body && body.status) || response.status,
    );
  }

  return body;
}

async function resolveDataSourceId(databaseId) {
  const configuredDataSourceId = readEnv("NOTION_EMV_DATA_SOURCE_ID");
  if (configuredDataSourceId) {
    return normalizeNotionId(configuredDataSourceId);
  }

  try {
    const database = await notionRequest(`/databases/${databaseId}`);
    const dataSourceId =
      database &&
      database.data_sources &&
      database.data_sources[0] &&
      database.data_sources[0].id;
    if (dataSourceId) return dataSourceId;
    throw new NotionSyncError(
      "No data source found on this EMV Notion database. Share it with the integration, or set NOTION_EMV_DATA_SOURCE_ID.",
      "data_source_missing",
      404,
    );
  } catch (error) {
    if (
      !(error instanceof NotionSyncError) ||
      (error.status !== 404 && error.code !== "object_not_found")
    ) {
      throw error;
    }
    try {
      await notionRequest(`/data_sources/${databaseId}`);
      return databaseId;
    } catch {
      throw error;
    }
  }
}

function normalizePropName(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findProperty(properties, name) {
  if (!properties || !name) return undefined;
  if (properties[name]) return properties[name];
  const target = normalizePropName(name);
  if (!target) return undefined;
  const key = Object.keys(properties).find((item) => normalizePropName(item) === target);
  return key ? properties[key] : undefined;
}

function firstPropertyOfType(properties, type) {
  return Object.values(properties || {}).find((property) => property && property.type === type);
}

function getPlainText(prop) {
  if (!prop) return "";
  if (prop.type === "title") {
    return (prop.title || []).map((item) => item.plain_text).join("").trim();
  }
  if (prop.type === "rich_text") {
    return (prop.rich_text || []).map((item) => item.plain_text).join("").trim();
  }
  return "";
}

function getDisplayText(prop) {
  if (!prop) return "";
  if (prop.type === "multi_select") {
    return (prop.multi_select || [])
      .map((item) => item.name.trim())
      .filter(Boolean)
      .join(" / ");
  }
  if (prop.type === "select" && prop.select && prop.select.name) {
    return prop.select.name.trim();
  }
  if (prop.type === "status" && prop.status && prop.status.name) {
    return prop.status.name.trim();
  }
  if (prop.type === "people") {
    return (prop.people || [])
      .map((person) => (person && person.name ? person.name.trim() : ""))
      .filter(Boolean)
      .join(" / ");
  }
  if (prop.type === "formula" && prop.formula) {
    if (prop.formula.type === "string") return (prop.formula.string || "").trim();
    if (prop.formula.type === "number" && prop.formula.number != null) {
      return String(prop.formula.number);
    }
    return "";
  }
  if (prop.type === "url") return (prop.url || "").trim();
  if (prop.type === "number" && prop.number != null) return String(prop.number);
  if (prop.type === "date" && prop.date && prop.date.start) return String(prop.date.start);
  return getPlainText(prop);
}

function getDateStart(prop) {
  if (!prop || prop.type !== "date" || !prop.date) return "";
  return String(prop.date.start || "").trim();
}

function getUrl(prop) {
  if (!prop) return "";
  if (prop.type === "url") return (prop.url && prop.url.trim()) || "";
  if (prop.type === "rich_text") {
    for (const item of prop.rich_text || []) {
      const href =
        (item && item.href && item.href.trim()) ||
        (item && item.text && item.text.link && item.text.link.url && item.text.link.url.trim());
      if (href) return href;
    }
  }
  const text = getDisplayText(prop);
  if (/^https?:\/\//i.test(text)) return text;
  return "";
}

function mapNotionPageToTask(page) {
  const properties = page.properties || {};
  const names = getPropertyNames();

  const artistProp =
    findProperty(properties, names.artist) || firstPropertyOfType(properties, "title");
  const event = getDisplayText(findProperty(properties, names.event));
  const artist = getDisplayText(artistProp) || getPlainText(artistProp);
  if (!event && !artist) return null;

  const status = getDisplayText(
    findProperty(properties, names.status) || findProperty(properties, "Sprint Status"),
  );
  // Active 表示这条不需要出现在待办里（例如已在互动中）
  if (isHiddenEmvStatus(status)) return null;

  return {
    id: page.id,
    event,
    artist,
    handle: getDisplayText(findProperty(properties, names.handle)),
    accountType: getDisplayText(findProperty(properties, names.accountType)),
    postedTime: getDateStart(findProperty(properties, names.postedTime)),
    postLink: getUrl(findProperty(properties, names.viewPost)),
    status,
  };
}

function isQueryablePage(value) {
  return Boolean(value && typeof value === "object" && value.object === "page" && value.properties);
}

async function getEmvTasksFromNotion() {
  if (emvCache && emvCache.expiresAt > Date.now()) {
    return emvCache.tasks;
  }

  const databaseId = normalizeNotionId(getEmvDatabaseId());
  const dataSourceId = await resolveDataSourceId(databaseId);
  const tasks = [];
  let cursor;

  do {
    // 不传 sorts，也不在本地重排，沿用 Notion 返回顺序（库内自动化负责排序）
    const payload = {
      start_cursor: cursor,
      page_size: 100,
    };

    const response = await notionRequest(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    for (const result of response.results || []) {
      if (!isQueryablePage(result)) continue;
      const task = mapNotionPageToTask(result);
      if (task) tasks.push(task);
    }

    cursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (cursor);

  emvCache = {
    tasks,
    expiresAt: Date.now() + EMV_CACHE_MS,
  };
  return tasks;
}

function sendJson(res, status, body, cacheControl) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    cacheControl || "no-store, no-cache, must-revalidate",
  );
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!isConfigured()) {
    sendJson(res, 503, {
      error: "EMV Notion is not configured",
      detail: "Set NOTION_API_KEY and NOTION_EMV_ID in server environment variables.",
    });
    return;
  }

  try {
    const tasks = await getEmvTasksFromNotion();
    sendJson(
      res,
      200,
      { tasks, source: "notion" },
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  } catch (error) {
    console.error("[API /emv] Notion fetch failed:", error && error.message);
    sendJson(res, 500, {
      error: "Failed to load EMV tasks from Notion",
      detail: sanitizePublicError(error && error.message),
      code: error instanceof NotionSyncError ? error.code : undefined,
    });
  }
};

/**
 * SCHEDULE 专用 Vercel Serverless API。
 * Notion 密钥只读 process.env，绝不会写进前端或响应体。
 *
 * 本地：npx vercel dev
 * 线上：在 Vercel → Settings → Environment Variables 配置同名变量
 */

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";
const SCHEDULE_CACHE_MS = 60_000;

const DEFAULT_PROFILE = {
  name: "EmiBonnieAny Schedule",
  subtitle: "All Events Schedule for MimiNini&Any",
  avatarSrc: "/public/images/schedule/avatar.jpg",
  avatarPosition: "65% center",
};

const FLAG_TIMEZONES = {
  "🇹🇭": "Asia/Bangkok",
  "🇨🇳": "Asia/Shanghai",
  "🇭🇰": "Asia/Hong_Kong",
  "🇲🇴": "Asia/Macau",
  "🇹🇼": "Asia/Taipei",
  "🇰🇷": "Asia/Seoul",
  "🇯🇵": "Asia/Tokyo",
  "🇸🇬": "Asia/Singapore",
  "🇵🇭": "Asia/Manila",
  "🇻🇳": "Asia/Ho_Chi_Minh",
  "🇫🇷": "Europe/Paris",
  "🇮🇹": "Europe/Rome",
  "🇬🇧": "Europe/London",
  "🇩🇪": "Europe/Berlin",
  "🇺🇸": "America/New_York",
  "🇦🇺": "Australia/Sydney",
};

const TITLE_FLAG_PATTERN = /^(\uD83C[\uDDE6-\uDDFF]\uD83C[\uDDE6-\uDDFF])\s*/;
const DEFAULT_EVENT_TIMEZONE = "Asia/Shanghai";

/** 简易内存缓存，减轻 Notion 压力 */
let scheduleCache = null;

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
    value === "your_32_char_database_id_here"
  );
}

function isConfigured() {
  const apiKey = readEnv("NOTION_API_KEY");
  const databaseId = readEnv("NOTION_DATABASE_ID");
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
    title: readEnv("NOTION_PROP_TITLE") || "Title",
    date: readEnv("NOTION_PROP_DATE") || "Date",
    location: readEnv("NOTION_PROP_LOCATION") || "Location",
    guests: readEnv("NOTION_PROP_GUESTS") || "People",
    trendingKeyword: readEnv("NOTION_PROP_KEYWORD") || "Trending Keyword",
    hashtag: readEnv("NOTION_PROP_HASHTAG") || "Hashtag",
    officialUrl: readEnv("NOTION_PROP_OFFICIAL_URL") || "Official Post",
  };
}

class NotionSyncError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "NotionSyncError";
    this.code = code;
    this.status = status;
  }
}

/** 去掉可能误带进错误文案里的密钥片段，避免泄露到客户端 */
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
  const configuredDataSourceId = readEnv("NOTION_DATA_SOURCE_ID");
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
      "No data source found on this Notion database. Share the database with the integration, or set NOTION_DATA_SOURCE_ID.",
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
  if (prop.type === "formula" && prop.formula) {
    if (prop.formula.type === "string") return (prop.formula.string || "").trim();
    if (prop.formula.type === "number" && prop.formula.number != null) {
      return String(prop.formula.number);
    }
    return "";
  }
  return getPlainText(prop);
}

function linkFromRichTextItem(item) {
  const href =
    (item && item.href && item.href.trim()) ||
    (item && item.text && item.text.link && item.text.link.url && item.text.link.url.trim());
  return href || undefined;
}

function getRichTextWithLink(prop) {
  if (!prop || prop.type !== "rich_text") {
    return { text: getPlainText(prop) };
  }
  let url;
  const text = (prop.rich_text || [])
    .map((item) => {
      if (!url) url = linkFromRichTextItem(item);
      return item.plain_text;
    })
    .join("")
    .trim();
  return { text, url };
}

function getUrl(prop) {
  if (!prop || prop.type !== "url") return undefined;
  const url = prop.url && prop.url.trim();
  return url || undefined;
}

function getGuests(prop) {
  if (!prop) return [];
  if (prop.type === "multi_select") {
    return (prop.multi_select || []).map((item) => item.name.trim()).filter(Boolean);
  }
  if (prop.type === "select" && prop.select && prop.select.name) {
    return [prop.select.name.trim()].filter(Boolean);
  }
  if (prop.type === "people") {
    return (prop.people || [])
      .map((person) => (person && person.name ? person.name.trim() : ""))
      .filter(Boolean);
  }
  const text = getPlainText(prop);
  if (!text) return [];
  return text
    .split(/\s*\/\s*|\s*,\s*/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function formatTime12h(hour24, minute) {
  const period = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function getEventTimeZoneFromTitle(title) {
  const match = String(title || "").match(TITLE_FLAG_PATTERN);
  if (!match) return DEFAULT_EVENT_TIMEZONE;
  return FLAG_TIMEZONES[match[1]] || DEFAULT_EVENT_TIMEZONE;
}

function parseNotionWallClock(notionStart) {
  const dateOnly = notionStart.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) return { date: dateOnly[1], hasTime: false };

  const withTime = notionStart.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!withTime) return { date: notionStart.slice(0, 10), hasTime: false };

  return {
    date: withTime[1],
    hour: Number.parseInt(withTime[2], 10),
    minute: Number.parseInt(withTime[3], 10),
    hasTime: true,
  };
}

function zonedLocalToUtc(isoDate, hour24, minute, timeZone) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour24, minute, 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  let ms = desiredUtc;
  for (let i = 0; i < 4; i += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(ms)).map((part) => [part.type, part.value]),
    );
    const shownUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    ms += desiredUtc - shownUtc;
  }

  return new Date(ms);
}

function parseEventDateTimeFromNotion(notionStart, title) {
  if (!notionStart) return { time: "TBA" };

  const eventTimeZone = getEventTimeZoneFromTitle(title);
  const wallClock = parseNotionWallClock(notionStart);
  if (!wallClock.hasTime) {
    return { date: wallClock.date, time: "TBA", eventTimeZone };
  }

  const instant = zonedLocalToUtc(
    wallClock.date,
    wallClock.hour,
    wallClock.minute,
    eventTimeZone,
  );

  return {
    date: wallClock.date,
    time: formatTime12h(wallClock.hour, wallClock.minute),
    startsAt: instant.toISOString(),
    eventTimeZone,
  };
}

function mapNotionPageToEvent(page) {
  const properties = page.properties || {};
  const props = getPropertyNames();

  const titleProp = properties[props.title] || firstPropertyOfType(properties, "title");
  const title = getPlainText(titleProp);
  const locationField = getRichTextWithLink(properties[props.location]);
  const location = locationField.text || "TBA";
  const locationUrl = locationField.url;

  const dateCandidate = properties[props.date];
  const dateProp =
    dateCandidate && dateCandidate.type === "date"
      ? dateCandidate
      : firstPropertyOfType(properties, "date");
  const notionStart =
    dateProp && dateProp.type === "date" && dateProp.date ? dateProp.date.start : undefined;
  const parsed = parseEventDateTimeFromNotion(notionStart, title);

  if (!title || !parsed.date) return null;

  const hashtagField = getRichTextWithLink(properties[props.hashtag]);
  const officialUrl = getUrl(properties[props.officialUrl]) || "";

  return {
    id: page.id,
    date: parsed.date,
    title,
    location,
    locationUrl,
    time: parsed.time,
    startsAt: parsed.startsAt,
    eventTimeZone: parsed.eventTimeZone,
    guests: getGuests(properties[props.guests]),
    trendingKeyword: getDisplayText(properties[props.trendingKeyword]),
    hashtag: hashtagField.text,
    hashtagUrl: hashtagField.url,
    officialUrl,
  };
}

function isQueryablePage(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.object === "page" &&
      value.properties,
  );
}

async function getScheduleEventsFromNotion() {
  if (scheduleCache && scheduleCache.expiresAt > Date.now()) {
    return scheduleCache.events;
  }

  const databaseId = normalizeNotionId(readEnv("NOTION_DATABASE_ID"));
  const dataSourceId = await resolveDataSourceId(databaseId);
  const events = [];
  let cursor;
  let usedSort = true;

  do {
    const payload = {
      start_cursor: cursor,
      page_size: 100,
    };
    if (usedSort) {
      payload.sorts = [{ timestamp: "created_time", direction: "ascending" }];
    }

    let response;
    try {
      response = await notionRequest(`/data_sources/${dataSourceId}/query`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (
        usedSort &&
        error instanceof NotionSyncError &&
        (error.code === "validation_error" || error.status === 400)
      ) {
        usedSort = false;
        cursor = undefined;
        continue;
      }
      throw error;
    }

    for (const result of response.results || []) {
      if (!isQueryablePage(result)) continue;
      const event = mapNotionPageToEvent(result);
      if (event) events.push(event);
    }

    cursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (cursor);

  events.sort((left, right) => {
    const leftKey = left.startsAt || left.date;
    const rightKey = right.startsAt || right.date;
    return leftKey.localeCompare(rightKey);
  });

  scheduleCache = {
    events,
    expiresAt: Date.now() + SCHEDULE_CACHE_MS,
  };

  return events;
}

function sendJson(res, status, body, cacheControl) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    cacheControl || "no-store, no-cache, must-revalidate",
  );
  // 明确禁止把本接口缓存到共享 CDN 时夹带密钥场景；仅成功响应可用短缓存
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!isConfigured()) {
    sendJson(res, 503, {
      error: "Notion is not configured",
      detail: "Set NOTION_API_KEY and NOTION_DATABASE_ID in server environment variables.",
    });
    return;
  }

  try {
    const events = await getScheduleEventsFromNotion();
    sendJson(
      res,
      200,
      {
        profile: DEFAULT_PROFILE,
        events,
        source: "notion",
      },
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  } catch (error) {
    console.error("[API /schedule] Notion fetch failed:", error && error.message);
    sendJson(res, 500, {
      error: "Failed to load schedule from Notion",
      detail: sanitizePublicError(error && error.message),
      code: error instanceof NotionSyncError ? error.code : undefined,
    });
  }
};

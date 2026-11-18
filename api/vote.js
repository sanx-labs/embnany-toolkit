/**
 * VOTE tracker API. Notion credentials are read only from server environment variables.
 */

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";
const VOTE_CACHE_MS = 60_000;

let voteCache = null;

function readEnv(name) {
  return String(process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

function getDatabaseId() {
  return readEnv("NOTION_VOTE_DATABASE_ID") || readEnv("NOTION_VOTE_ID");
}

function isConfigured() {
  const apiKey = readEnv("NOTION_API_KEY");
  const databaseId = getDatabaseId();
  return Boolean(
    apiKey &&
      databaseId &&
      !apiKey.includes("your_notion") &&
      !databaseId.includes("your_32_char"),
  );
}

function normalizeNotionId(id) {
  const value = String(id || "").trim();
  if (value.includes("-")) return value;
  const hex = value.replace(/[^a-fA-F0-9]/g, "");
  if (hex.length !== 32) return value;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getPropertyNames() {
  return {
    title: readEnv("NOTION_VOTE_PROP_TITLE") || "Title",
    status: readEnv("NOTION_VOTE_PROP_STATUS") || "Status",
    period: readEnv("NOTION_VOTE_PROP_PERIOD") || "Voting Period",
    platform: readEnv("NOTION_VOTE_PROP_PLATFORM") || "Platform",
    frequency: readEnv("NOTION_VOTE_PROP_FREQUENCY") || "Frequency",
    artist: readEnv("NOTION_VOTE_PROP_ARTIST") || "Artist",
    organizer: readEnv("NOTION_VOTE_PROP_ORGANIZER") || "Organizer",
    voteUrl: readEnv("NOTION_VOTE_PROP_VOTE_URL") || "Vote URL",
    viewResults: readEnv("NOTION_VOTE_PROP_VIEW_RESULTS") || "View Results",
  };
}

function findProperty(properties, name) {
  if (!properties || !name) return undefined;
  if (properties[name]) return properties[name];
  const target = String(name).replace(/\s+/g, " ").trim().toLowerCase();
  const key = Object.keys(properties).find(
    (item) => item.replace(/\s+/g, " ").trim().toLowerCase() === target,
  );
  return key ? properties[key] : undefined;
}

function getText(property) {
  if (!property) return "";
  if (property.type === "title") {
    return (property.title || []).map((item) => item.plain_text || "").join("").trim();
  }
  if (property.type === "rich_text") {
    return (property.rich_text || []).map((item) => item.plain_text || "").join("").trim();
  }
  return "";
}

function getOption(property) {
  if (!property) return "";
  if (property.type === "status" && property.status) return String(property.status.name || "").trim();
  if (property.type === "select" && property.select) return String(property.select.name || "").trim();
  if (property.type === "multi_select" && Array.isArray(property.multi_select)) {
    return property.multi_select
      .map((option) => String(option && option.name || "").trim())
      .filter(Boolean)
      .join(", ");
  }
  return getText(property);
}

function getDateRange(property) {
  if (!property || property.type !== "date" || !property.date) {
    return { start: "", end: "" };
  }
  return {
    start: String(property.date.start || "").trim(),
    end: String(property.date.end || "").trim(),
  };
}

function getUrl(property) {
  if (!property) return "";
  let value = "";
  if (property.type === "url") {
    value = property.url;
  } else if (property.type === "rich_text" || property.type === "title") {
    const items = property[property.type] || [];
    const linkedItem = items.find((item) => item && item.href);
    value = linkedItem ? linkedItem.href : items.map((item) => item && item.plain_text || "").join("");
  } else if (property.type === "formula" && property.formula) {
    value = property.formula.type === "url" ? property.formula.url : property.formula.string;
  }
  value = String(value || "").trim();
  return /^https?:\/\//i.test(value) ? value : "";
}

function mapPage(page) {
  const properties = page.properties || {};
  const names = getPropertyNames();
  const titleProperty = findProperty(properties, names.title);
  const title = getText(titleProperty);
  if (!title) return null;

  const period = getDateRange(findProperty(properties, names.period));
  return {
    id: page.id,
    title,
    status: getOption(findProperty(properties, names.status)),
    period,
    platform: getOption(findProperty(properties, names.platform)),
    frequency: getOption(findProperty(properties, names.frequency)),
    artist: getOption(findProperty(properties, names.artist)),
    organizer: getOption(findProperty(properties, names.organizer)),
    organizerUrl: getUrl(findProperty(properties, names.organizer)),
    voteUrl: getUrl(findProperty(properties, names.voteUrl)),
    viewResultsUrl: getUrl(findProperty(properties, names.viewResults)),
  };
}

function getStatusPriority(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "ongoing") return 0;
  if (value === "upcoming") return 1;
  if (value === "announced") return 2;
  if (value === "ended") return 3;
  return 4;
}

function sortVotes(votes) {
  return votes.sort((left, right) => {
    const statusOrder = getStatusPriority(left.status) - getStatusPriority(right.status);
    if (statusOrder) return statusOrder;
    const leftEnd = Date.parse(left.period.end) || Number.POSITIVE_INFINITY;
    const rightEnd = Date.parse(right.period.end) || Number.POSITIVE_INFINITY;
    return leftEnd - rightEnd;
  });
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

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body && body.message) || `Notion API returned ${response.status}`);
  }
  return body;
}

async function resolveDataSourceId(databaseId) {
  const configuredId = readEnv("NOTION_VOTE_DATA_SOURCE_ID");
  if (configuredId) return normalizeNotionId(configuredId);

  const database = await notionRequest(`/databases/${databaseId}`);
  const dataSourceId = database && database.data_sources && database.data_sources[0]
    ? database.data_sources[0].id
    : "";
  if (!dataSourceId) throw new Error("No data source found on the VOTE Notion database.");
  return dataSourceId;
}

async function fetchVotes() {
  if (voteCache && voteCache.expiresAt > Date.now()) return voteCache.votes;

  const databaseId = normalizeNotionId(getDatabaseId());
  const dataSourceId = await resolveDataSourceId(databaseId);
  const votes = [];
  let cursor;

  do {
    const payload = await notionRequest(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: JSON.stringify({ start_cursor: cursor, page_size: 100 }),
    });
    for (const page of payload.results || []) {
      if (!page || page.object !== "page" || !page.properties) continue;
      const vote = mapPage(page);
      if (vote) votes.push(vote);
    }
    cursor = payload.has_more ? payload.next_cursor || undefined : undefined;
  } while (cursor);

  sortVotes(votes);
  voteCache = { votes, expiresAt: Date.now() + VOTE_CACHE_MS };
  return votes;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!isConfigured()) {
    sendJson(res, 503, {
      error: "VOTE Notion is not configured",
      detail: "Set NOTION_API_KEY and NOTION_VOTE_DATABASE_ID in server environment variables.",
    });
    return;
  }

  try {
    sendJson(res, 200, { votes: await fetchVotes(), source: "notion" });
  } catch (error) {
    const apiKey = readEnv("NOTION_API_KEY");
    const detail = String(error && error.message || "Unknown Notion sync error")
      .split(apiKey)
      .join("[redacted]");
    console.error("[API /vote] Notion fetch failed:", detail);
    sendJson(res, 500, { error: "Failed to load votes from Notion" });
  }
};

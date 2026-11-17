(function () {
  "use strict";

  const root = document.getElementById("module-vote");
  const list = document.getElementById("vote-list");
  const state = document.getElementById("vote-state");
  if (!root || !list || !state) return;

  const API_URL = "/api/vote";
  const DEFAULT_TEXT = {
    loading: "Loading votes…",
    loadError: "Unable to load vote campaigns.",
    retry: "Try again",
    empty: "No vote campaigns available.",
    hostedBy: "Hosted by {name}",
    artistLabel: "Artist: {name}",
    frequencyLabel: "Frequency: {value}",
    voteNow: "Vote Now",
    viewResults: "View Results",
    noPeriod: "Voting period not announced",
    daysLeft: "{count}d left",
    hoursLeft: "{count}h left",
    minutesLeft: "{count}m left",
    daysHoursLeft: "{days}d {hours}h left",
    daysHoursMinutesLeft: "{days}d {hours}h {minutes}m left",
    hoursMinutesLeft: "{hours}h {minutes}m left",
    status: {
      ongoing: "Ongoing",
      upcoming: "Upcoming",
      announced: "Announced",
      ended: "Ended",
    },
  };
  const TEXT_BY_LANGUAGE = {
    th: {
      ...DEFAULT_TEXT,
      loading: "กำลังโหลดรายการโหวต…",
      loadError: "ไม่สามารถโหลดรายการโหวตได้",
      retry: "ลองอีกครั้ง",
      empty: "ไม่มีรายการโหวตในขณะนี้",
      hostedBy: "จัดโดย {name}",
      artistLabel: "ศิลปิน: {name}",
      frequencyLabel: "ความถี่: {value}",
      voteNow: "โหวตเลย",
      viewResults: "ดูผลลัพธ์",
      noPeriod: "ยังไม่ประกาศช่วงเวลาโหวต",
      daysLeft: "เหลือ {count} วัน",
      hoursLeft: "เหลือ {count} ชั่วโมง",
      minutesLeft: "เหลือ {count} นาที",
      daysHoursLeft: "เหลือ {days} วัน {hours} ชั่วโมง",
      daysHoursMinutesLeft: "เหลือ {days} วัน {hours} ชั่วโมง {minutes} นาที",
      hoursMinutesLeft: "เหลือ {hours} ชั่วโมง {minutes} นาที",
      status: {
        ongoing: "กำลังดำเนินการ",
        upcoming: "เร็ว ๆ นี้",
        announced: "ประกาศผลแล้ว",
        ended: "สิ้นสุดแล้ว",
      },
    },
    zh: {
      ...DEFAULT_TEXT,
      loading: "正在加载投票活动…",
      loadError: "投票活动加载失败。",
      retry: "重试",
      empty: "暂无投票活动。",
      hostedBy: "主办方：{name}",
      artistLabel: "艺人：{name}",
      frequencyLabel: "投票频率：{value}",
      voteNow: "立即投票",
      viewResults: "查看结果",
      noPeriod: "投票时间暂未公布",
      daysLeft: "剩余 {count} 天",
      hoursLeft: "剩余 {count} 小时",
      minutesLeft: "剩余 {count} 分钟",
      daysHoursLeft: "剩余 {days} 天 {hours} 小时",
      daysHoursMinutesLeft: "剩余 {days} 天 {hours} 小时 {minutes} 分钟",
      hoursMinutesLeft: "剩余 {hours} 小时 {minutes} 分钟",
      status: {
        ongoing: "进行中",
        upcoming: "即将开始",
        announced: "已公布结果",
        ended: "已结束",
      },
    },
  };

  /** @type {Array<VoteCampaign>} */
  let campaigns = [];
  let language = document.documentElement.lang || "en";
  let text = TEXT_BY_LANGUAGE[language] || DEFAULT_TEXT;
  let loaded = false;
  let loading = false;
  let loadError = false;
  let countdownTimer = null;

  /**
   * @typedef {Object} VoteCampaign
   * @property {string} id
   * @property {string} title
   * @property {string} status
   * @property {{start: string, end: string}} period
   * @property {string} platform
   * @property {string} frequency
   * @property {string} artist
   * @property {string} organizer
   * @property {string} voteUrl
   * @property {string} viewResultsUrl
   */

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function interpolate(template, values) {
    return String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
  }

  function parseDate(value) {
    const raw = String(value || "").trim();
    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function parseEndDate(value) {
    const raw = String(value || "").trim();
    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
        23,
        59,
        59,
        999,
      );
    }
    return parseDate(raw);
  }

  function formatPeriodDate(value, options) {
    const date = parseDate(value);
    if (!date) return "";
    return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : language === "th" ? "th-TH" : "en-US", options)
      .format(date);
  }

  function formatPeriod(period) {
    const start = formatPeriodDate(period && period.start, { month: "short", day: "numeric" });
    const end = formatPeriodDate(period && period.end, {
      month: "short",
      day: "numeric",
      ...(period && period.start && period.end ? {} : { year: "numeric" }),
    });
    if (!start && !end) return text.noPeriod;
    if (!start) return end;
    if (!end) return start;
    const startDate = parseDate(period.start);
    const endDate = parseDate(period.end);
    const year = startDate && endDate && startDate.getFullYear() !== endDate.getFullYear()
      ? `, ${formatPeriodDate(period.start, { year: "numeric" })}`
      : "";
    return `${start}${year} – ${end}`;
  }

  function normalizeStatus(status, end) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "announced") return "announced";
    if (value === "ended") return "ended";
    const endDate = parseEndDate(end);
    if (endDate && endDate.getTime() <= Date.now()) return "ended";
    if (value === "ongoing") return "ongoing";
    if (value === "upcoming") return "upcoming";
    return "unknown";
  }

  function countdownLabel(end) {
    const endDate = parseEndDate(end);
    if (!endDate) return "";
    const remaining = endDate.getTime() - Date.now();
    if (remaining <= 0) return text.status.ended;
    const totalMinutes = Math.ceil(remaining / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days) return interpolate(text.daysHoursMinutesLeft, { days, hours, minutes });
    if (hours) return interpolate(text.hoursMinutesLeft, { hours, minutes });
    return interpolate(text.minutesLeft, { count: Math.max(1, totalMinutes) });
  }

  function statusRank(status) {
    const rank = { ongoing: 0, upcoming: 1, announced: 2, ended: 3 };
    return rank[status] ?? 4;
  }

  function sortCampaigns(items) {
    return items.slice().sort((left, right) => {
      const leftStatus = normalizeStatus(left.status, left.period && left.period.end);
      const rightStatus = normalizeStatus(right.status, right.period && right.period.end);
      const statusDifference = statusRank(leftStatus) - statusRank(rightStatus);
      if (statusDifference) return statusDifference;
      const leftEnd = parseEndDate(left.period && left.period.end);
      const rightEnd = parseEndDate(right.period && right.period.end);
      return (leftEnd ? leftEnd.getTime() : Infinity) - (rightEnd ? rightEnd.getTime() : Infinity);
    });
  }

  function getSafeUrl(value) {
    const url = String(value || "").trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function formatPlatformName(value) {
    return String(value || "")
      .split(",")
      .map((name) => {
        const platformName = name.trim();
        return platformName.toLowerCase() === "x" ? "X (Twitter)" : platformName;
      })
      .filter(Boolean)
      .join(", ");
  }

  function renderCampaign(campaign) {
    const status = normalizeStatus(campaign.status, campaign.period && campaign.period.end);
    const statusLabel = text.status[status] || String(campaign.status || "").trim() || "—";
    const platform = formatPlatformName(campaign.platform);
    const frequency = String(campaign.frequency || "").trim();
    const artist = String(campaign.artist || "").trim();
    const organizer = String(campaign.organizer || "").trim();
    const voteUrl = getSafeUrl(campaign.voteUrl);
    const viewResultsUrl = getSafeUrl(campaign.viewResultsUrl);
    const end = String(campaign.period && campaign.period.end || "");
    const period = formatPeriod(campaign.period || {});
    const card = document.createElement("article");
    card.className = "vote-card";
    card.innerHTML = `
      <h2 class="vote-card-title">${escapeHtml(campaign.title || "Untitled vote")}</h2>
      ${organizer ? `<p class="vote-organizer">${escapeHtml(interpolate(text.hostedBy, { name: organizer }))}</p>` : ""}
      ${artist ? `<p class="vote-artist">${escapeHtml(interpolate(text.artistLabel, { name: artist }))}</p>` : ""}
      <div class="vote-meta-group">
        <div class="vote-meta">
          <span class="vote-status" data-status="${escapeHtml(status)}">
            <span class="vote-status-dot" aria-hidden="true"></span>${escapeHtml(statusLabel)}
          </span>
          ${platform ? `<span class="vote-platform">${escapeHtml(platform)}</span>` : ""}
        </div>
        ${frequency ? `
          <div class="vote-meta-secondary">
            <span class="vote-frequency" aria-label="${escapeHtml(interpolate(text.frequencyLabel, { value: frequency }))}">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M13.2 5.3A5.5 5.5 0 0 0 3.8 3.8L2.7 5M2.7 5V2.8M2.7 5h2.2M2.8 10.7a5.5 5.5 0 0 0 9.4 1.5l1.1-1.2m0 0v2.2m0-2.2h-2.2"/>
              </svg>
              <span>${escapeHtml(interpolate(text.frequencyLabel, { value: frequency }))}</span>
            </span>
          </div>
        ` : ""}
      </div>
      <div class="vote-timeline">
        <span class="vote-period">${escapeHtml(period)}</span>
        <span class="vote-countdown${status === "ended" ? " is-ended" : ""}" data-vote-end="${escapeHtml(end)}">${escapeHtml(countdownLabel(end))}</span>
      </div>
      <div class="vote-actions">
        ${voteUrl ? `<a class="vote-action vote-action-primary" href="${escapeHtml(voteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.voteNow)} ↗</a>` : ""}
        ${viewResultsUrl ? `<a class="vote-action vote-action-secondary" href="${escapeHtml(viewResultsUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.viewResults)} ↗</a>` : ""}
      </div>
    `;
    return card;
  }

  function renderState(message, isError) {
    state.hidden = false;
    state.innerHTML = `${escapeHtml(message)}${isError ? `<button type="button" class="vote-retry" data-vote-retry>${escapeHtml(text.retry)}</button>` : ""}`;
  }

  function render() {
    if (loading) {
      list.innerHTML = Array.from({ length: 3 }, () => `
        <article class="vote-card vote-skeleton" aria-hidden="true">
          <div class="vote-skeleton-line short"></div>
          <div class="vote-skeleton-line title"></div>
          <div class="vote-skeleton-line"></div>
          <div class="vote-skeleton-line action"></div>
        </article>
      `).join("");
      state.hidden = true;
      return;
    }
    state.hidden = true;
    state.textContent = "";
    if (loadError) {
      list.innerHTML = "";
      renderState(text.loadError, true);
      return;
    }
    const sorted = sortCampaigns(campaigns);
    list.innerHTML = "";
    sorted.forEach((campaign) => list.appendChild(renderCampaign(campaign)));
    if (!sorted.length && loaded) renderState(text.empty, false);
  }

  async function loadCampaigns(force) {
    if (loading || (loaded && !force)) return;
    loading = true;
    loadError = false;
    render();
    try {
      const response = await fetch(`${API_URL}?_=${Date.now()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload && payload.error || `VOTE API returned ${response.status}`);
      campaigns = Array.isArray(payload && payload.votes) ? payload.votes : [];
      loaded = true;
    } catch (error) {
      console.error("[VOTE] failed to load campaigns", error);
      campaigns = [];
      loaded = true;
      loadError = true;
    } finally {
      loading = false;
      render();
    }
  }

  function maybeLoad() {
    if (root.classList.contains("is-active") || !root.hasAttribute("hidden")) {
      loadCampaigns(false);
    }
  }

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-vote-retry]")) loadCampaigns(true);
  });

  document.addEventListener("site-language-change", (event) => {
    language = event.detail && event.detail.lang || "en";
    text = event.detail && event.detail.voteText
      ? { ...text, ...event.detail.voteText }
      : TEXT_BY_LANGUAGE[language] || DEFAULT_TEXT;
    render();
  });

  const observer = new MutationObserver(maybeLoad);
  observer.observe(root, { attributes: true, attributeFilter: ["hidden", "class"] });
  maybeLoad();

  countdownTimer = setInterval(() => {
    if (loaded && !loadError) render();
  }, 60_000);
  window.addEventListener("beforeunload", () => clearInterval(countdownTimer), { once: true });
})();

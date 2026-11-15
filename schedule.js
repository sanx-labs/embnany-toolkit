(function () {
  "use strict";

  const root = document.getElementById("module-schedule");
  if (!root) return;

  // 优先走服务端 /api/schedule（密钥只在 Vercel/本地 env），失败再回退本地样例
  const LIVE_URL = "/api/schedule";
  const FALLBACK_URL = "/public/schedule/events.json";
  const MONTH_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const ZH_MONTH_LABELS = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];
  const SCHEDULE_TEXT = {
    en: {
      loading: "Loading schedule…",
      noEvents: "No events scheduled for this month.",
      syncFailed: "Live Notion sync failed: {reason} Showing local sample data.",
      tba: "TBA",
    },
    th: {
      loading: "กำลังโหลดตารางกิจกรรม…",
      noEvents: "เดือนนี้ไม่มีกำหนดกิจกรรม",
      syncFailed: "ซิงก์ Notion แบบเรียลไทม์ไม่สำเร็จ: {reason} กำลังแสดงข้อมูลตัวอย่างในเครื่อง",
      tba: "ยังไม่ระบุ",
    },
    zh: {
      loading: "正在加载日程…",
      noEvents: "本月暂无活动。",
      syncFailed: "Notion 实时同步失败：{reason}。已显示本地示例数据。",
      tba: "待定",
    },
  };
  const CHEVRON_LEFT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  const CHEVRON_RIGHT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  const CLOCK_ICON =
    '<svg class="sched-icon is-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const USERS_ICON =
    '<svg class="sched-icon is-stroke" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>';

  const els = {
    prev: document.getElementById("sched-prev"),
    next: document.getElementById("sched-next"),
    monthBtn: document.getElementById("sched-month-label"),
    monthText: document.getElementById("sched-month-text"),
    picker: document.getElementById("sched-picker"),
    pickerYear: document.getElementById("sched-picker-year"),
    pickerGrid: document.getElementById("sched-picker-grid"),
    pickerPrev: document.getElementById("sched-year-prev"),
    pickerNext: document.getElementById("sched-year-next"),
    backdrop: document.getElementById("sched-picker-backdrop"),
    list: document.getElementById("sched-list"),
  };

  let events = [];
  let currentMonth = startOfMonth(new Date());
  let pickerYear = currentMonth.getFullYear();
  let pickerOpen = false;
  let loaded = false;
  let loading = false;
  let syncNotice = "";
  let language = document.documentElement.lang;
  let officialPostLabel = language === "zh"
    ? "官方动态"
    : language === "th"
      ? "โพสต์อย่างเป็นทางการ"
      : "Official Post";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function monthKey(date) {
    return date.getFullYear() + "-" + date.getMonth();
  }

  function parseEventDate(isoDate) {
    return new Date(isoDate + "T12:00:00");
  }

  function isChinese() {
    return language === "zh";
  }

  function getMonthLabels() {
    if (language === "zh") return ZH_MONTH_LABELS;
    if (language === "th") {
      const formatter = new Intl.DateTimeFormat("th-TH", { month: "long" });
      return MONTH_LABELS.map((_, month) => formatter.format(new Date(2026, month, 1)));
    }
    return MONTH_LABELS;
  }

  function formatPickerYear(year) {
    if (language === "th") {
      return new Intl.DateTimeFormat("th-TH", { year: "numeric" }).format(
        new Date(year, 0, 1),
      );
    }
    return String(year);
  }

  function getScheduleText(key) {
    return (SCHEDULE_TEXT[language] || SCHEDULE_TEXT.en)[key];
  }

  function isSameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function isPastEventDate(isoDate) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return parseEventDate(isoDate).getTime() < todayStart.getTime();
  }

  function parseEventTimeMinutes(time) {
    const trimmed = String(time || "").trim();
    if (!trimmed || trimmed.toUpperCase() === "TBA") return Number.POSITIVE_INFINITY;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return Number.POSITIVE_INFINITY;
    let hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  function sortEventsByTime(list) {
    return list.slice().sort((a, b) => {
      const aMs = a.startsAt ? new Date(a.startsAt).getTime() : parseEventTimeMinutes(a.time);
      const bMs = b.startsAt ? new Date(b.startsAt).getTime() : parseEventTimeMinutes(b.time);
      return aMs - bMs;
    });
  }

  function formatEventTime(event) {
    if (!event.startsAt) {
      const time = event.time || "TBA";
      if (time.toUpperCase() === "TBA") return getScheduleText("tba");
      if (!isChinese() && language !== "th") return time;
      const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return time;
      let hour = Number.parseInt(match[1], 10);
      const period = match[3].toUpperCase();
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      if (language === "th") {
        return `${String(hour).padStart(2, "0")}:${match[2]} น.`;
      }
      return `${hour < 12 ? "上午" : "下午"} ${hour % 12 || 12}:${match[2]}`;
    }
    const instant = new Date(event.startsAt);
    if (Number.isNaN(instant.getTime())) return event.time || getScheduleText("tba");
    const locale = language === "zh" ? "zh-CN" : language === "th" ? "th-TH" : "en-US";
    return instant.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: language !== "th",
    }) + (language === "th" ? " น." : "");
  }

  function splitHashtagTags(raw) {
    return String(raw || "")
      .split(/\s*\/\s*/)
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  function monthsWithEvents() {
    const keys = new Set();
    events.forEach((event) => {
      keys.add(monthKey(parseEventDate(event.date)));
    });
    return keys;
  }

  // 当前月没有活动时，落到最近有数据的月份，避免打开就是空状态
  function pickInitialMonth() {
    const today = startOfMonth(new Date());
    const keys = monthsWithEvents();
    if (!keys.size || keys.has(monthKey(today))) return today;
    const dated = events
      .map((event) => startOfMonth(parseEventDate(event.date)))
      .sort((a, b) => a.getTime() - b.getTime());
    const upcoming = dated.find((date) => date.getTime() >= today.getTime());
    return upcoming || dated[dated.length - 1];
  }

  function sortEventsForMonth(monthEvents, viewedMonth) {
    const sorted = monthEvents.slice().sort(
      (a, b) => parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime(),
    );
    const today = new Date();
    if (!isSameMonth(viewedMonth, today)) return sorted;

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const upcoming = [];
    const past = [];
    sorted.forEach((event) => {
      if (parseEventDate(event.date).getTime() < todayStart) past.push(event);
      else upcoming.push(event);
    });
    return upcoming.concat(past);
  }

  function groupEventsByDate(list) {
    const byDate = new Map();
    const dateOrder = [];
    list.forEach((event) => {
      if (!byDate.has(event.date)) {
        dateOrder.push(event.date);
        byDate.set(event.date, []);
      }
      byDate.get(event.date).push(event);
    });
    return dateOrder.map((date) => ({
      date,
      events: sortEventsByTime(byDate.get(date)),
    }));
  }

  function formatMonthLabel(date) {
    if (isChinese()) return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    if (language === "th") {
      return new Intl.DateTimeFormat("th-TH", {
        month: "short",
        year: "numeric",
      }).format(date);
    }
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function formatDateParts(isoDate) {
    const date = parseEventDate(isoDate);
    if (isChinese()) {
      return {
        day: date.toLocaleDateString("zh-CN", { day: "2-digit" }),
        month: `${date.getMonth() + 1}月`,
      };
    }
    if (language === "th") {
      return {
        day: date.toLocaleDateString("th-TH", { day: "2-digit" }),
        month: date.toLocaleDateString("th-TH", { month: "short" }),
      };
    }
    return {
      day: date.toLocaleDateString("en-US", { day: "2-digit" }),
      month: date.toLocaleDateString("en-US", { month: "short" }),
    };
  }

  function setPickerOpen(open) {
    pickerOpen = open;
    if (els.picker) els.picker.hidden = !open;
    if (els.backdrop) els.backdrop.hidden = !open;
    if (els.monthBtn) els.monthBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      pickerYear = currentMonth.getFullYear();
      renderPicker();
    }
  }

  function renderPicker() {
    if (!els.pickerYear || !els.pickerGrid) return;
    els.pickerYear.textContent = formatPickerYear(pickerYear);
    const selectedYear = currentMonth.getFullYear();
    const selectedMonth = currentMonth.getMonth();
    const dotted = monthsWithEvents();
    els.pickerGrid.innerHTML = getMonthLabels().map((label, month) => {
      const selected = pickerYear === selectedYear && month === selectedMonth;
      const hasEvents = dotted.has(pickerYear + "-" + month);
      const dot = hasEvents && !selected ? '<span class="sched-picker-dot" aria-hidden="true"></span>' : "";
      return (
        '<button type="button" class="sched-picker-month' +
        (selected ? " is-selected" : "") +
        '" data-sched-month="' +
        month +
        '" aria-label="' +
        escapeHtml(label) +
        '">' +
        label +
        dot +
        "</button>"
      );
    }).join("");
  }

  function renderEventEntry(event) {
    const trendingKeyword = String(event.trendingKeyword || "").trim();
    const hashtag = String(event.hashtag || "").trim();
    const guests = Array.isArray(event.guests) ? event.guests.filter(Boolean) : [];
    const location = event.locationUrl
      ? '<a href="' + escapeHtml(event.locationUrl) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(event.location || "") +
        "</a>"
      : "<span>" + escapeHtml(event.location || "") + "</span>";
    const official = String(event.officialUrl || "").trim()
      ? '<a class="sched-official" href="' + escapeHtml(event.officialUrl) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(officialPostLabel) +
        "</a>"
      : "";
    const tags = splitHashtagTags(hashtag)
      .map((tag) => {
        const inner = escapeHtml(tag);
        if (event.hashtagUrl) {
          return (
            '<a class="sched-tag" href="' +
            escapeHtml(event.hashtagUrl) +
            '" target="_blank" rel="noopener noreferrer">' +
            inner +
            "</a>"
          );
        }
        return '<span class="sched-tag">' + inner + "</span>";
      })
      .join("");
    const trending =
      trendingKeyword || hashtag
        ? '<div class="sched-trend">' +
          (trendingKeyword
            ? '<div class="sched-meta-row"><img class="sched-icon is-trend" src="/public/images/schedule/trending-keyword.png" alt="" aria-hidden="true"><p>' +
              escapeHtml(trendingKeyword) +
              "</p></div>"
            : "") +
          (hashtag
            ? '<div class="sched-meta-row"><img class="sched-icon is-tag" src="/public/images/schedule/tag-hashtag.png" alt="" aria-hidden="true"><div class="sched-tags">' +
              tags +
              "</div></div>"
            : "") +
          "</div>"
        : "";

    return (
      '<div class="sched-entry">' +
      '<h2 class="sched-event-title">' +
      escapeHtml(event.title || "") +
      "</h2>" +
      '<div class="sched-meta">' +
      '<div class="sched-meta-row">' +
      CLOCK_ICON +
      "<span>" +
      escapeHtml(formatEventTime(event)) +
      "</span></div>" +
      '<div class="sched-meta-row is-location"><img class="sched-icon is-pin" src="/public/images/schedule/location-pin.png" alt="" aria-hidden="true"><p>' +
      location +
      "</p></div>" +
      (guests.length
        ? '<div class="sched-meta-row is-guests">' +
          USERS_ICON +
          "<p>" +
          escapeHtml(guests.join(" / ")) +
          "</p></div>"
        : "") +
      "</div>" +
      official +
      trending +
      "</div>"
    );
  }

  function renderList() {
    if (!els.list) return;
    if (loading) {
      els.list.innerHTML =
        '<p class="sched-empty">' +
        getScheduleText("loading") +
        "</p>";
      return;
    }
    const noticeText = !syncNotice
      ? ""
      : getScheduleText("syncFailed").replace("{reason}", syncNotice);
    const notice = noticeText
      ? '<p class="sched-empty">' + escapeHtml(noticeText) + "</p>"
      : "";
    const key = monthKey(currentMonth);
    const monthEvents = events.filter((event) => monthKey(parseEventDate(event.date)) === key);
    const groups = groupEventsByDate(sortEventsForMonth(monthEvents, currentMonth));
    if (!groups.length) {
      els.list.innerHTML =
        notice +
        '<p class="sched-empty">' +
        getScheduleText("noEvents") +
        "</p>";
      return;
    }
    els.list.innerHTML =
      notice +
      groups
        .map((group) => {
          const parts = formatDateParts(group.date);
          const pastClass = isPastEventDate(group.date) ? " is-past" : "";
          return (
            '<article class="sched-card' +
            pastClass +
            '">' +
            '<div class="sched-date"><span class="sched-date-day">' +
            escapeHtml(parts.day) +
            '</span><span class="sched-date-month">' +
            escapeHtml(parts.month) +
            "</span></div>" +
            '<div class="sched-entries">' +
            group.events.map(renderEventEntry).join("") +
            "</div></article>"
          );
        })
        .join("");
  }

  function syncMonthLabel() {
    if (els.monthText) els.monthText.textContent = formatMonthLabel(currentMonth);
  }

  function setMonth(date) {
    currentMonth = startOfMonth(date);
    syncMonthLabel();
    renderList();
    setPickerOpen(false);
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function fetchSchedulePayload(url) {
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        payload && typeof payload.detail === "string" ? payload.detail.trim() : "";
      throw new Error(detail || "schedule api " + response.status);
    }
    return payload || {};
  }

  async function loadEvents() {
    if (loaded || loading) return;
    loading = true;
    renderList();
    try {
      let data;
      syncNotice = "";
      try {
        data = await fetchSchedulePayload(LIVE_URL);
        syncNotice = data.source === "notion" ? "" : "";
      } catch (liveError) {
        console.warn("[SCHEDULE] live Notion API unavailable, using local fallback", liveError);
        const reason =
          liveError instanceof Error && liveError.message
            ? liveError.message
            : "Notion sync unavailable";
        syncNotice = reason;
        data = await fetchSchedulePayload(FALLBACK_URL);
      }
      events = Array.isArray(data.events) ? data.events : [];
      currentMonth = pickInitialMonth();
      loaded = true;
    } catch (err) {
      console.error("[SCHEDULE] failed to load events", err);
      events = [];
      syncNotice =
        err instanceof Error && err.message
          ? "Unable to load schedule: " + err.message
          : "Unable to load schedule.";
      loaded = true;
    } finally {
      loading = false;
      syncMonthLabel();
      renderList();
    }
  }

  function maybeLoad() {
    if (root.classList.contains("is-active") || !root.hasAttribute("hidden")) {
      loadEvents();
    }
  }

  if (els.prev) {
    els.prev.innerHTML = CHEVRON_LEFT;
    els.prev.addEventListener("click", () => {
      setMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    });
  }
  if (els.next) {
    els.next.innerHTML = CHEVRON_RIGHT;
    els.next.addEventListener("click", () => {
      setMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    });
  }
  if (els.monthBtn) {
    els.monthBtn.addEventListener("click", () => setPickerOpen(!pickerOpen));
  }
  if (els.pickerPrev) {
    els.pickerPrev.innerHTML = CHEVRON_LEFT;
    els.pickerPrev.addEventListener("click", () => {
      pickerYear -= 1;
      renderPicker();
    });
  }
  if (els.pickerNext) {
    els.pickerNext.innerHTML = CHEVRON_RIGHT;
    els.pickerNext.addEventListener("click", () => {
      pickerYear += 1;
      renderPicker();
    });
  }
  if (els.pickerGrid) {
    els.pickerGrid.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-sched-month]");
      if (!btn) return;
      setMonth(new Date(pickerYear, Number(btn.dataset.schedMonth), 1));
    });
  }
  if (els.backdrop) {
    els.backdrop.addEventListener("click", () => setPickerOpen(false));
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setPickerOpen(false);
  });
  document.addEventListener("site-language-change", (event) => {
    language = event.detail && event.detail.lang ? event.detail.lang : "en";
    if (event.detail && event.detail.officialPost) {
      officialPostLabel = event.detail.officialPost;
    }
    syncMonthLabel();
    if (pickerOpen) renderPicker();
    renderList();
  });
  const tabBtn = document.querySelector('#app-navbar [data-app-tab="schedule"]');
  if (tabBtn) tabBtn.addEventListener("click", () => loadEvents());
  window.addEventListener("hashchange", maybeLoad);

  // 等主导航把 hidden 去掉后再加载
  const observer = new MutationObserver(maybeLoad);
  observer.observe(root, { attributes: true, attributeFilter: ["hidden", "class"] });
  maybeLoad();
})();

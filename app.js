(function () {
  "use strict";

  const LANG_FILES = {
    en: "/public/prompts/en.txt",
    th: "/public/prompts/th.txt",
    zh: "/public/prompts/zh.txt",
  };

  const UI_LANGS = ["en", "th", "zh"];
  const SITE_LANG_KEY = "site_lang";
  const MESSAGES_URL = "/public/i18n/messages.json";

  // 字典拉取失败时的兜底，保证 t() 不会把 key 直接显示到界面
  const FALLBACK_MESSAGES = {
    en: {
      navAria: "站点模块",
      navTrend: "TREND",
      navEmv: "EMV",
      navStreaming: "STREAMING",
      navVoting: "VOTING",
      navSchedule: "SCHEDULE",
      langSwitcherAria: "切换语言",
      previewLabel: "文案预览",
      previewAria: "文案编辑",
      charCount: "{n} 字符",
      placeholder: "点击「随机文案」生成内容",
      randomBtn: "随机文案",
      tweetBtn: "一键发推",
      reportBtn: "举报",
      contactBefore: "有问题或反馈？通过 X 联系 ",
      copyAria: "复制",
      copiedAria: "已复制",
      comingSoon: "Coming Soon / 正在开发中",
      comingSoonHint: "该模块正在搭建，请先使用 TREND。",
      boosting: "打榜目标",
      eventSelectAria: "选择活动",
      emv: {
        tabs: {
          uncompleted: "Pending",
          completed: "Completed",
          skipped: "Skipped",
          all: "All",
        },
        actions: {
          openPost: "Open Post",
          markDone: "Mark Done",
          skip: "Skip",
          undo: "Undo",
        },
        labels: {
          artist: "Artist",
          handle: "Handle",
          accountType: "Account Type",
          status: "Status",
          postedTime: "Posted Time",
          guide: "How to do it",
          expandGuide: "Show interaction guide",
          collapseGuide: "Hide interaction guide",
          emptyPending: "🎉 All EMV tasks for this round are done.",
          emptyList: "No tasks in this view",
          refresh: "Refresh",
          loading: "Loading tasks…",
          loadError: "Failed to load tasks. Please try again.",
          progress: "{done} / {total}",
          progressHint: "{pending} pending · {skipped} skipped",
          localNote: "Progress is saved in this browser only.",
        },
        sprint: {
          peak24h: "24h Peak Sprint",
          prime48h: "48h Prime Boosting",
          extended72h: "72h Extended Window",
          archived: "Archived",
          pending: "Pending",
        },
      },
      schedule: {
        officialPost: "Official Post",
        timeZone: "(Local Time)",
        loading: "Loading schedule…",
        noEvents: "No events scheduled for this month.",
        syncFailed: "Live Notion sync failed: {reason} Showing local sample data.",
        tba: "TBA",
        monthNavigationAria: "Month navigation",
        prevMonthAria: "Previous month",
        nextMonthAria: "Next month",
        selectMonthAria: "Select year and month",
        pickerDialogAria: "Select year and month",
        prevYearAria: "Previous year",
        nextYearAria: "Next year",
        closeCalendarAria: "Close calendar",
        eventScheduleAria: "Event schedule",
      },
      defense: {
        tabs: {
          uncompleted: "未完成",
          completed: "已完成",
          skipped: "跳过",
          all: "全部",
        },
        actions: {
          openPost: "打开原帖",
          markDone: "标记完成",
          skip: "跳过",
          undo: "撤销",
        },
        labels: {
          author: "作者",
          guide: "建议指引",
          emptyPending: "🎉 太棒了！当前待办已全部清扫完毕",
          emptyList: "暂无记录",
          refresh: "刷新",
          loading: "正在加载线索…",
          loadError: "加载失败，请稍后重试",
          progress: "{done} / {total}",
          progressHint: "待办 {pending} · 跳过 {skipped}",
        },
      },
    },
    th: {
      emv: {
        tabs: {
          uncompleted: "รอดำเนินการ",
          completed: "เสร็จสิ้น",
          skipped: "ข้าม",
          all: "ทั้งหมด",
        },
        actions: {
          openPost: "เปิดโพสต์",
          markDone: "ทำเครื่องหมายว่าเสร็จ",
          skip: "ข้าม",
          undo: "เลิกทำ",
        },
        labels: {
          artist: "ศิลปิน",
          handle: "แฮนเดิล",
          accountType: "ประเภทบัญชี",
          status: "สถานะ",
          postedTime: "เวลาโพสต์",
          guide: "วิธีทำ",
          expandGuide: "แสดงคู่มือการมีส่วนร่วม",
          collapseGuide: "ซ่อนคู่มือการมีส่วนร่วม",
          emptyPending: "🎉 เคลียร์ภารกิจ EMV รอบนี้ครบแล้ว",
          emptyList: "ไม่มีรายการในมุมนี้",
          refresh: "รีเฟรช",
          loading: "กำลังโหลดภารกิจ…",
          loadError: "โหลดภารกิจไม่สำเร็จ กรุณาลองอีกครั้ง",
          progress: "{done} / {total}",
          progressHint: "รอดำเนินการ {pending} · ข้าม {skipped}",
          localNote: "ความคืบหน้าเก็บไว้ในเบราว์เซอร์นี้เท่านั้น",
        },
        sprint: {
          peak24h: "ช่วงเร่งด่วน 24 ชม.",
          prime48h: "ช่วงดันยอด 48 ชม.",
          extended72h: "ช่วงต่อเนื่อง 72 ชม.",
          archived: "สิ้นสุดแล้ว",
          pending: "รอดำเนินการ",
        },
      },
      schedule: {
        officialPost: "โพสต์อย่างเป็นทางการ",
        timeZone: "(เวลาท้องถิ่น)",
        loading: "กำลังโหลดตารางกิจกรรม…",
        noEvents: "เดือนนี้ไม่มีกำหนดกิจกรรม",
        syncFailed: "ซิงก์ Notion แบบเรียลไทม์ไม่สำเร็จ: {reason} กำลังแสดงข้อมูลตัวอย่างในเครื่อง",
        tba: "ยังไม่ระบุ",
        monthNavigationAria: "การนำทางเดือน",
        prevMonthAria: "เดือนก่อนหน้า",
        nextMonthAria: "เดือนถัดไป",
        selectMonthAria: "เลือกปีและเดือน",
        pickerDialogAria: "เลือกปีและเดือน",
        prevYearAria: "ปีก่อนหน้า",
        nextYearAria: "ปีถัดไป",
        closeCalendarAria: "ปิดปฏิทิน",
        eventScheduleAria: "ตารางกิจกรรม",
      },
    },
    zh: {
      navAria: "站点模块",
      navTrend: "TREND",
      navEmv: "EMV",
      navStreaming: "STREAMING",
      navVoting: "VOTING",
      navSchedule: "SCHEDULE",
      langSwitcherAria: "切换语言",
      previewLabel: "文案预览",
      previewAria: "文案编辑",
      charCount: "{n} 字符",
      placeholder: "点击“随机文案”生成内容",
      randomBtn: "随机文案",
      tweetBtn: "发布推文",
      reportBtn: "举报",
      contactBefore: "有问题或反馈？通过 X 联系 ",
      copyAria: "复制",
      copiedAria: "已复制",
      comingSoon: "即将推出",
      comingSoonHint: "该模块正在开发中，请先使用 TREND。",
      boosting: "打榜目标",
      eventSelectAria: "选择活动",
      emv: {
        tabs: {
          uncompleted: "未完成",
          completed: "已完成",
          skipped: "跳过",
          all: "全部",
        },
        actions: {
          openPost: "打开原帖",
          markDone: "标记完成",
          skip: "跳过",
          undo: "撤销",
        },
        labels: {
          artist: "艺人",
          handle: "账号",
          accountType: "账号类型",
          status: "状态",
          postedTime: "发布时间",
          guide: "怎么做",
          expandGuide: "展开互动指南",
          collapseGuide: "收起互动指南",
          emptyPending: "🎉 本轮 EMV 待办已全部完成",
          emptyList: "该分类下暂无任务",
          refresh: "刷新",
          loading: "正在加载任务…",
          loadError: "加载失败，请稍后重试",
          progress: "{done} / {total}",
          progressHint: "待办 {pending} · 跳过 {skipped}",
          localNote: "进度只保存在本机浏览器，换设备不会同步",
        },
        sprint: {
          peak24h: "24h 黄金冲刺",
          prime48h: "48h 核心冲量",
          extended72h: "72h 长尾延续",
          archived: "已结束",
          pending: "待定",
        },
      },
      schedule: {
        officialPost: "官方动态",
        timeZone: "（当地时间）",
        loading: "正在加载日程…",
        noEvents: "本月暂无活动。",
        syncFailed: "Notion 实时同步失败：{reason}。已显示本地示例数据。",
        tba: "待定",
        monthNavigationAria: "月份导航",
        prevMonthAria: "上个月",
        nextMonthAria: "下个月",
        selectMonthAria: "选择年月",
        pickerDialogAria: "选择年份和月份",
        prevYearAria: "上一年",
        nextYearAria: "下一年",
        closeCalendarAria: "关闭日历",
        eventScheduleAria: "活动日程",
      },
      defense: {
        tabs: {
          uncompleted: "未完成",
          completed: "已完成",
          skipped: "已跳过",
          all: "全部",
        },
        actions: {
          openPost: "打开原帖",
          markDone: "标记完成",
          skip: "跳过",
          undo: "撤销",
        },
        labels: {
          author: "作者",
          guide: "指引",
          emptyPending: "🎉 太棒了！当前待办已全部完成。",
          emptyList: "暂无记录",
          refresh: "刷新",
          loading: "正在加载线索…",
          loadError: "加载失败，请稍后重试。",
          progress: "{done} / {total}",
          progressHint: "待办 {pending} · 已跳过 {skipped}",
        },
      },
    },
  };

  // DEFENSE 线索源：由 config.js 覆盖；接入 Notion 前先读本地空列表
  const DEFENSE_DEFAULT_DATA_URL = "/public/defense/clues.json";
  const DEFENSE_DEFAULT_FALLBACK_URL = "/public/defense/clues.json";
  const DEFENSE_DONE_KEY = "defense-done-v1";
  const DEFENSE_SKIP_KEY = "defense-skip-v1";
  const DEFENSE_OPEN_KEY = "defense-open-v1";
  const DEFENSE_TAB_KEY = "defense-tab-v1";
  const DEFENSE_TABS = ["uncompleted", "completed", "skipped", "all"];
  const EMV_LIVE_URL = "/api/emv";
  const EMV_FALLBACK_URL = "/public/emv/tasks.json";
  const EMV_DONE_KEY = "emv-done-v1";
  const EMV_SKIP_KEY = "emv-skip-v1";
  const EMV_OPEN_KEY = "emv-open-v1";
  const EMV_TAB_KEY = "emv-tab-v1";
  const EMV_GUIDE_KEY = "emv-guide-open-v1";
  const EMV_TABS = ["uncompleted", "completed", "skipped", "all"];
  const EMV_SPRINT_TICK_MS = 60 * 1000;

  const EVENT_IDS = ["EmiBonnie", "Emi", "Bonnie", "Any", "EmiBonnieAny", "EmiAny", "BonnieAny"];
  // 旧下拉 id 映射到 config.js 里的正式键名
  const EVENT_ALIASES = {
    EmBn: "EmiBonnie",
    EmAny: "EmiAny",
    BnAny: "BonnieAny",
    EmBnAny: "EmiBonnieAny",
  };
  const EVENT_KEY = "trendx-event";
  const FALLBACK_EVENT_CONFIGS = {
    EmiBonnie: {
      name: "EmiBonnie",
      keywords: "BONNIE SHOPEE EMI",
      hashtags: "#ShopeeLivexEmiBonnie",
    },
    Emi: {
      name: "Emi",
      keywords: "NA",
      hashtags: "#NA",
    },
    Bonnie: {
      name: "Bonnie",
      keywords: "NA",
      hashtags: "#NA",
    },
    Any: {
      name: "Any",
      keywords: "NA",
      hashtags: "#NA",
    },
    EmiBonnieAny: {
      name: "EmiBonnieAny",
      keywords: "NA",
      hashtags: "#NA",
    },
    EmiAny: {
      name: "EmiAny",
      keywords: "NA",
      hashtags: "#NA",
    },
    BonnieAny: {
      name: "BonnieAny",
      keywords: "NA",
      hashtags: "#NA",
    },
  };

  const promptCache = new Map();
  const CONFIG_POLL_MS = 2000;
  const APP_TAB_KEY = "embnany-app-tab";
  const APP_TABS = ["trend", "emv", "streaming", "voting", "schedule"];
  // 旧地址 #defense / #vote 落到 VOTING
  const APP_TAB_ALIASES = { defense: "voting", vote: "voting" };
  const CHECK_ICON_SVG =
    '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" width="16" height="16"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 0 0-1.414 0L8 12.586 4.707 9.293a1 1 0 1 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l8-8a1 1 0 0 0 0-1.414z" clip-rule="evenodd"/></svg>';

  let EVENT_CONFIGS = { ...FALLBACK_EVENT_CONFIGS };
  let defaultEventId = "EmiBonnie";
  let currentEventId = "EmiBonnie";
  let CONFIG = { keywords: "", hashtags: "" };
  let lastRandomLine = null;
  let previewIsGenerated = false;
  let messages = {};
  let currentLang = "en";
  let currentAppTab = "trend";

  let defenseDataUrl = DEFENSE_DEFAULT_DATA_URL;
  let defenseFallbackUrl = DEFENSE_DEFAULT_FALLBACK_URL;
  let defenseClues = [];
  let defenseLoaded = false;
  let defenseLoading = false;
  let defenseLoadError = false;
  let defenseView = "uncompleted";
  let defenseDone = {};
  let defenseSkip = {};
  let defenseOpen = {};

  let emvTasks = [];
  let emvLoaded = false;
  let emvLoading = false;
  let emvLoadError = false;
  let emvView = "uncompleted";
  let emvDone = {};
  let emvSkip = {};
  let emvOpen = {};
  let emvSprintTimer = null;

  const $ = (id) => document.getElementById(id);

  const preview = $("preview");
  const charCount = $("char-count");
  const btnRandom = $("btn-random");
  const btnTweet = $("btn-tweet");
  const iconRefresh = $("icon-refresh");
  const btnCopy = $("btn-copy");
  const appNavbar = $("app-navbar");
  const eventPicker = $("event-picker");
  const eventTrigger = $("event-trigger");
  const eventMenu = $("event-menu");
  const eventTriggerLabel = $("event-trigger-label");

  const graphemeSegmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

  /** Normalize line endings so each physical Enter counts as one `\n`. */
  function normalizeTweetText(text) {
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  /**
   * Match X/Twitter weighted character rules:
   * - Each newline (`\n`) = 1 character
   * - Most emoji graphemes = 2 characters
   * - Other graphemes = 1 character
   */
  function countTwitterChars(text) {
    const normalized = normalizeTweetText(text);
    if (!normalized) return 0;

    if (!graphemeSegmenter) {
      return normalized.length;
    }

    let count = 0;
    for (const { segment } of graphemeSegmenter.segment(normalized)) {
      if (segment === "\n") {
        count += 1;
      } else if (/\p{Extended_Pictographic}/u.test(segment)) {
        count += 2;
      } else {
        count += 1;
      }
    }
    return count;
  }

  function getPreviewText() {
    return preview.value.trim();
  }

  function formatHashtags(raw) {
    return raw
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join("\n");
  }

  function syncPreviewState() {
    btnTweet.disabled = getPreviewText().length === 0;
    updateCharCount();
  }

  /** 支持扁平 key，也支持点路径读取嵌套字典（如 defense.tabs.uncompleted）。 */
  function lookupMessage(dict, key) {
    if (!dict || key == null) return undefined;
    if (Object.prototype.hasOwnProperty.call(dict, key)) {
      const direct = dict[key];
      if (typeof direct === "string") return direct;
    }
    const parts = String(key).split(".");
    let cur = dict;
    for (const part of parts) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[part];
    }
    return typeof cur === "string" ? cur : undefined;
  }

  function t(key, params) {
    const dict = messages[currentLang] || messages.en || {};
    const fallback = messages.en || {};
    let value =
      lookupMessage(dict, key) ??
      lookupMessage(fallback, key) ??
      key;
    if (params && typeof params === "object") {
      value = String(value).replace(/\{(\w+)\}/g, (_, name) =>
        params[name] == null ? "" : String(params[name])
      );
    }
    return value;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readJsonMap(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function writeJsonMap(storageKey, value) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (err) {
      console.error(err);
    }
  }

  /** 根据浏览器语言选择支持的界面语言，未支持时回落到英文。 */
  function matchNavigatorLang() {
    const codes = (navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language]
    ).map((code) => String(code || "").toLowerCase());

    for (const code of codes) {
      const matched = UI_LANGS.find((lang) => code === lang || code.startsWith(lang + "-"));
      if (matched) return matched;
    }
    return "en";
  }

  function detectSiteLang() {
    const saved = localStorage.getItem(SITE_LANG_KEY);
    if (UI_LANGS.includes(saved)) return saved;
    const detected = matchNavigatorLang();
    localStorage.setItem(SITE_LANG_KEY, detected);
    return detected;
  }

  function bustCache(url) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}_=${Date.now()}`;
  }

  async function loadMessages() {
    const res = await fetch(bustCache(MESSAGES_URL), { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load i18n dictionary");
    messages = await res.json();
    if (!messages.en) messages = FALLBACK_MESSAGES;
  }

  function syncLangSwitcher() {
    document.querySelectorAll("#lang-switcher [data-lang]").forEach((btn) => {
      const active = btn.dataset.lang === currentLang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function applyI18n() {
    document.documentElement.lang = currentLang;
    document.body.dataset.uiLang = currentLang;
    if (preview) preview.setAttribute("lang", currentLang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      if (el.getAttribute("aria-label") === t("copiedAria")) return;
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
    syncEmvGuidePanel();

    syncLangSwitcher();
    syncPreviewState();
    // 列表文案由 JS 渲染，语言切换后需要重绘
    if ($("defense-list")) renderDefenseList();
    if ($("emv-list")) renderEmvList();
    // 通知 SCHEDULE 模块同步语言（含当地时间后缀等动态文案）
    document.dispatchEvent(
      new CustomEvent("site-language-change", {
        detail: {
          lang: currentLang,
          officialPost: t("schedule.officialPost"),
          scheduleText: {
            loading: t("schedule.loading"),
            noEvents: t("schedule.noEvents"),
            syncFailed: t("schedule.syncFailed"),
            tba: t("schedule.tba"),
            timeZone: t("schedule.timeZone"),
          },
        },
      })
    );
  }

  function switchLang(lang) {
    if (!UI_LANGS.includes(lang)) lang = "en";
    const changed = lang !== currentLang;
    currentLang = lang;
    localStorage.setItem(SITE_LANG_KEY, lang);
    applyI18n();

    if (changed) {
      lastRandomLine = null;
      previewIsGenerated = false;
      setPreview("");
    }
  }

  function updateCharCount() {
    charCount.textContent = t("charCount", { n: countTwitterChars(preview.value) });
  }

  function setPreview(text) {
    preview.value = text;
    syncPreviewState();
  }

  async function loadPrompts(lang) {
    if (promptCache.has(lang)) {
      return promptCache.get(lang);
    }

    const url = LANG_FILES[lang];
    // 这类文案会在生产站点被浏览器/CDN 缓存，必须加时间戳和 no-store，避免“改了内容但页面还拿旧稿”。
    const res = await fetch(bustCache(url), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load prompts: ${url}`);
    }

    const text = await res.text();
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    promptCache.set(lang, lines);
    return lines;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function unescapeConfigValue(s) {
    return s
      .replace(/\\\\/g, "\\")
      .replace(/\\"/g, '"')
      .replace(/\\r/g, "\r")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  function readQuotedField(block, field) {
    const match = block.match(new RegExp(`${field}:\\s*"((?:\\\\.|[^"\\\\])*)"`));
    return match ? unescapeConfigValue(match[1]) : "";
  }

  /** 从 config.js 文本里拆出各活动的 keywords / hashtags，方便每天改文件后热更新。 */
  function parseEventConfigs(text) {
    const events = {};
    EVENT_IDS.forEach((id) => {
      const blockMatch = text.match(
        new RegExp(`(?:^|[\\s,{])${id}\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`)
      );
      const inner = blockMatch ? blockMatch[1] : "";
      const fallback = FALLBACK_EVENT_CONFIGS[id] || { name: id, keywords: "", hashtags: "" };
      events[id] = {
        name: readQuotedField(inner, "name") || fallback.name,
        keywords: readQuotedField(inner, "keywords") || fallback.keywords,
        hashtags: readQuotedField(inner, "hashtags") || fallback.hashtags,
      };
    });
    const defaultMatch = text.match(/DEFAULT_EVENT\s*=\s*"(\w+)"/);
    const parsedDefault = defaultMatch ? normalizeEventId(defaultMatch[1]) : "EmiBonnie";
    // DEFENSE 数据源也从 config.js 热更新，改 URL 无需重新部署前端逻辑
    const defenseDataMatch = text.match(/DEFENSE_DATA_URL\s*=\s*"((?:\\.|[^"\\])*)"/);
    const defenseFallbackMatch = text.match(/DEFENSE_FALLBACK_URL\s*=\s*"((?:\\.|[^"\\])*)"/);
    return {
      events,
      defaultEvent: parsedDefault,
      defenseDataUrl: defenseDataMatch
        ? unescapeConfigValue(defenseDataMatch[1])
        : DEFENSE_DEFAULT_DATA_URL,
      defenseFallbackUrl: defenseFallbackMatch
        ? unescapeConfigValue(defenseFallbackMatch[1])
        : DEFENSE_DEFAULT_FALLBACK_URL,
    };
  }

  function eventSignature(events) {
    return EVENT_IDS.map((id) => {
      const item = events[id] || {};
      return `${id}:${item.keywords}\0${item.hashtags}`;
    }).join("|");
  }

  function setEventMenuOpen(open) {
    if (!eventTrigger || !eventMenu) return;
    eventTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    eventMenu.toggleAttribute("hidden", !open);
  }

  function getEventMeta(eventId) {
    return (
      EVENT_CONFIGS[eventId] ||
      FALLBACK_EVENT_CONFIGS[eventId] ||
      { name: eventId, keywords: "", hashtags: "" }
    );
  }

  function normalizeEventId(eventId) {
    const mapped = EVENT_ALIASES[eventId] || eventId;
    return EVENT_IDS.includes(mapped) ? mapped : defaultEventId;
  }

  function syncEventSwitcher() {
    const meta = getEventMeta(currentEventId);
    if (eventTriggerLabel) {
      eventTriggerLabel.textContent = meta.name || currentEventId;
    }
    document.querySelectorAll("#event-menu [data-event-id]").forEach((btn) => {
      const active = btn.dataset.eventId === currentEventId;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function applyEvent(eventId, options) {
    const rebuild = !options || options.rebuild !== false;
    // 只有用户点选选项时才收起菜单；配置热更新不能把下拉关掉
    const closeMenu = Boolean(options && options.closeMenu);
    eventId = normalizeEventId(eventId);
    currentEventId = eventId;
    const event = getEventMeta(eventId);
    CONFIG = {
      keywords: event.keywords || "",
      hashtags: event.hashtags || "",
    };
    localStorage.setItem(EVENT_KEY, eventId);
    syncEventSwitcher();
    if (closeMenu) setEventMenuOpen(false);
    if (rebuild && previewIsGenerated && lastRandomLine) {
      setPreview(buildTweet(lastRandomLine));
    }
  }

  function fillEventMenu() {
    if (!eventMenu) return;
    eventMenu.innerHTML = "";
    EVENT_IDS.forEach((id) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "event-option";
      option.setAttribute("role", "option");
      option.dataset.eventId = id;
      option.textContent = getEventMeta(id).name || id;
      eventMenu.appendChild(option);
    });
    syncEventSwitcher();
  }

  async function loadConfig() {
    const url = bustCache("/config.js");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load config.js");
    }
    return parseEventConfigs(await res.text());
  }

  async function refreshConfig() {
    try {
      const next = await loadConfig();
      const changed = eventSignature(next.events) !== eventSignature(EVENT_CONFIGS)
        || next.defaultEvent !== defaultEventId;
      const defenseUrlChanged =
        next.defenseDataUrl !== defenseDataUrl
        || next.defenseFallbackUrl !== defenseFallbackUrl;
      EVENT_CONFIGS = next.events;
      defaultEventId = next.defaultEvent;
      defenseDataUrl = next.defenseDataUrl || DEFENSE_DEFAULT_DATA_URL;
      defenseFallbackUrl = next.defenseFallbackUrl || DEFENSE_DEFAULT_FALLBACK_URL;
      applyEvent(currentEventId, { rebuild: changed, closeMenu: false });
      if (defenseUrlChanged && (defenseLoaded || currentAppTab === "defense")) {
        await loadDefenseClues({ force: true });
      }
      return changed || defenseUrlChanged;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  function buildTweet(randomLine) {
    const parts = [randomLine];
    const tailParts = [];

    if (CONFIG.keywords) {
      tailParts.push(CONFIG.keywords);
    }

    if (CONFIG.hashtags) {
      tailParts.push(formatHashtags(CONFIG.hashtags));
    }

    if (tailParts.length) {
      parts.push(tailParts.join("\n"));
    }

    return parts.join("\n\n");
  }

  async function generateRandomTweet() {
    iconRefresh.classList.add("spin-once");
    iconRefresh.addEventListener(
      "animationend",
      () => iconRefresh.classList.remove("spin-once"),
      { once: true }
    );

    btnRandom.disabled = true;
    try {
      const lines = await loadPrompts(currentLang);
      if (!lines.length) {
        setPreview("");
        return;
      }
      const line = pickRandom(lines);
      lastRandomLine = line;
      previewIsGenerated = true;
      setPreview(buildTweet(line));
    } catch (err) {
      console.error(err);
      lastRandomLine = null;
      previewIsGenerated = false;
      setPreview(`⚠ ${err.message}`);
    } finally {
      btnRandom.disabled = false;
    }
  }

  function postTweet() {
    const text = getPreviewText();
    if (!text) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(normalizeTweetText(preview.value).trim())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyText(text, button) {
    if (!text) {
      if (button) {
        button.disabled = true;
        setTimeout(() => (button.disabled = false), 500);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      try {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.setAttribute("readonly", "");
        temp.style.position = "fixed";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      } catch (e) {
        console.error("Copy failed", e);
        return;
      }
    }

    if (!button) return;
    const label = button.querySelector("[data-i18n]");
    if (label) {
      label.textContent = t("copiedAria");
      setTimeout(() => {
        label.textContent = t(label.dataset.i18n);
      }, 1400);
      return;
    }

    const original = button.innerHTML;
    button.innerHTML = CHECK_ICON_SVG;
    button.setAttribute("aria-label", t("copiedAria"));
    setTimeout(() => {
      button.innerHTML = original;
      button.setAttribute("aria-label", t("copyAria"));
    }, 1400);
  }

  function normalizeAppTab(tab) {
    const mapped = APP_TAB_ALIASES[tab] || tab;
    return APP_TABS.includes(mapped) ? mapped : "";
  }

  /** 解析地址栏 hash，合法值为 trend / emv / streaming / voting / schedule。 */
  function resolveRoute() {
    const hash = location.hash.replace("#", "");
    const savedApp = localStorage.getItem(APP_TAB_KEY);
    const fromHash = normalizeAppTab(hash);
    const saved = normalizeAppTab(savedApp) || "trend";

    if (fromHash) {
      return { appTab: fromHash, writeHash: fromHash !== hash };
    }

    return { appTab: saved, writeHash: true };
  }

  function syncHash() {
    if (location.hash.replace("#", "") !== currentAppTab) {
      history.replaceState(null, "", `#${currentAppTab}`);
    }
  }

  function switchAppTab(tab, options) {
    const writeHash = !options || options.writeHash !== false;
    tab = normalizeAppTab(tab) || "trend";
    currentAppTab = tab;

    document.querySelectorAll(".app-module").forEach((panel) => {
      const active = panel.dataset.appTab === tab;
      panel.classList.toggle("is-active", active);
      panel.toggleAttribute("hidden", !active);
    });
    document.querySelectorAll("#app-navbar [data-app-tab]").forEach((btn) => {
      const active = btn.dataset.appTab === tab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    localStorage.setItem(APP_TAB_KEY, tab);
    if (writeHash) syncHash();

    // 进入模块后再拉清单，避免拖慢 TREND 首屏
    if (tab === "emv") ensureEmvReady();
    if (tab === "voting") ensureDefenseReady();
  }

  /* ================= EMV：Notion 帖子待办（UI 对齐 clue-list） ================= */

  function emvStateOf(task) {
    const id = task && task.id;
    if (!id) return "uncompleted";
    if (emvDone[id]) return "completed";
    if (emvSkip[id]) return "skipped";
    return "uncompleted";
  }

  function isHiddenEmvStatus(status) {
    // 只隐藏 Archived 帖子；Active 状态仍显示在 EMV 列表中
    return String(status || "")
      .split("/")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
      .includes("archived");
  }

  function getEmvPostedTimeMs(postedTime) {
    const raw = String(postedTime || "").trim();
    if (!raw) return NaN;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : NaN;
  }

  // 用浏览器当前时间重算冲刺阶段，不依赖 Notion 构建时的 Sprint Status / Sort Priority
  function getEmvSprint(task) {
    const postedMs = getEmvPostedTimeMs(task && task.postedTime);
    if (!Number.isFinite(postedMs)) {
      return { key: "pending", sortPriority: 99, hours: null };
    }
    const hours = (Date.now() - postedMs) / 3600000;
    if (hours <= 24) return { key: "peak24h", sortPriority: 1, hours };
    if (hours <= 48) return { key: "prime48h", sortPriority: 2, hours };
    if (hours <= 72) return { key: "extended72h", sortPriority: 3, hours };
    return { key: "archived", sortPriority: 4, hours };
  }

  function formatEmvStatusLabel(raw) {
    const text = String(raw || "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return "";
    const lower = text.toLowerCase();
    if (/(24h|peak sprint|黄金冲刺|เร่งด่วน 24)/i.test(lower)) return t("emv.sprint.peak24h");
    if (/(48h|prime boosting|核心冲量|ดันยอด 48)/i.test(lower)) return t("emv.sprint.prime48h");
    if (/(72h|extended window|长尾|ต่อเนื่อง 72)/i.test(lower)) return t("emv.sprint.extended72h");
    if (/(archived|已结束|สิ้นสุด)/i.test(lower)) return t("emv.sprint.archived");
    if (/(pending|待定|รอดำเนินการ)/i.test(lower)) return t("emv.sprint.pending");
    return text;
  }

  function compareEmvTasks(left, right) {
    const leftSprint = getEmvSprint(left);
    const rightSprint = getEmvSprint(right);
    if (leftSprint.sortPriority !== rightSprint.sortPriority) {
      return leftSprint.sortPriority - rightSprint.sortPriority;
    }
    const leftPosted = getEmvPostedTimeMs(left && left.postedTime);
    const rightPosted = getEmvPostedTimeMs(right && right.postedTime);
    const leftKey = Number.isFinite(leftPosted) ? leftPosted : 0;
    const rightKey = Number.isFinite(rightPosted) ? rightPosted : 0;
    return rightKey - leftKey;
  }

  function startEmvSprintTicker() {
    if (emvSprintTimer) return;
    emvSprintTimer = setInterval(() => {
      const panel = $("module-emv");
      if (!panel || panel.hidden || !emvLoaded) return;
      renderEmvList();
    }, EMV_SPRINT_TICK_MS);
  }

  function loadEmvLocalState() {
    emvDone = readJsonMap(EMV_DONE_KEY);
    emvSkip = readJsonMap(EMV_SKIP_KEY);
    const savedTab = localStorage.getItem(EMV_TAB_KEY);
    emvView = EMV_TABS.includes(savedTab) ? savedTab : "uncompleted";
  }

  function isEmvGuideOpen() {
    const btn = $("emv-guide-toggle");
    return Boolean(btn && btn.getAttribute("aria-expanded") === "true");
  }

  function syncEmvGuidePanel() {
    const btn = $("emv-guide-toggle");
    const panel = $("emv-guide-panel");
    if (!btn || !panel) return;
    const open = isEmvGuideOpen();
    panel.hidden = !open;
    btn.setAttribute("aria-label", open ? t("emv.labels.collapseGuide") : t("emv.labels.expandGuide"));
  }

  function setEmvGuideOpen(open) {
    const btn = $("emv-guide-toggle");
    if (!btn) return;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    localStorage.setItem(EMV_GUIDE_KEY, open ? "1" : "0");
    syncEmvGuidePanel();
  }

  function syncEmvTabs() {
    document.querySelectorAll("#emv-tabs [data-emv-tab]").forEach((btn) => {
      const active = btn.dataset.emvTab === emvView;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function setEmvView(view) {
    if (!EMV_TABS.includes(view)) view = "uncompleted";
    emvView = view;
    localStorage.setItem(EMV_TAB_KEY, view);
    syncEmvTabs();
    renderEmvList();
  }

  function getFilteredEmvTasks() {
    const list =
      emvView === "all"
        ? emvTasks.slice()
        : emvTasks.filter((task) => emvStateOf(task) === emvView);
    // 筛选后仍按实时冲刺权重置顶，同阶段内最新帖在前
    list.sort(compareEmvTasks);
    return list;
  }

  function renderEmvProgress() {
    const textEl = $("emv-progress-text");
    const hintEl = $("emv-progress-hint");
    const barEl = $("emv-progress-bar");
    const total = emvTasks.length;
    const done = emvTasks.filter((task) => emvStateOf(task) === "completed").length;
    const skipped = emvTasks.filter((task) => emvStateOf(task) === "skipped").length;
    const pending = Math.max(0, total - done - skipped);
    const percent = total ? Math.round((done / total) * 100) : 0;
    if (textEl) textEl.textContent = t("emv.labels.progress", { done, total }) + " · " + percent + "%";
    if (hintEl) hintEl.textContent = t("emv.labels.progressHint", { pending, skipped });
    if (barEl) barEl.style.width = percent + "%";
  }

  function renderEmvEmpty(visibleCount) {
    const emptyEl = $("emv-empty");
    const emptyText = $("emv-empty-text");
    if (!emptyEl || !emptyText) return;

    if (!emvLoaded) {
      emptyEl.hidden = false;
      emptyText.textContent = emvLoadError ? t("emv.labels.loadError") : t("emv.labels.loading");
      return;
    }
    if (visibleCount > 0) {
      emptyEl.hidden = true;
      emptyText.textContent = "";
      return;
    }
    emptyEl.hidden = false;
    emptyText.textContent =
      emvView === "uncompleted" ? t("emv.labels.emptyPending") : t("emv.labels.emptyList");
  }

  function formatEmvPostedTime(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const hasTime = /T\d{2}:\d{2}/.test(value);
    const locale =
      currentLang === "zh" ? "zh-CN" : currentLang === "th" ? "th-TH" : "en-US";
    return date.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(hasTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
    });
  }

  function renderEmvCard(task) {
    const state = emvStateOf(task);
    const sprint = getEmvSprint(task);
    const eventName = String(task.event || "").trim() || String(task.artist || "").trim();
    const handle = String(task.handle || "").trim();
    const accountType = String(task.accountType || "").trim();
    const statusLabel = formatEmvStatusLabel(task.status);
    const postedTime = formatEmvPostedTime(task.postedTime);
    const postLink = String(task.postLink || "").trim();

    const card = document.createElement("article");
    card.className =
      "defense-card" +
      (state === "completed" ? " is-done" : "") +
      (state === "skipped" ? " is-skipped" : "");
    card.dataset.emvId = task.id;
    card.dataset.emvSprint = sprint.key;
    card.dataset.emvSort = String(sprint.sortPriority);

    const badges = [];
    if (state === "completed") {
      badges.push(
        `<span class="defense-badge is-status is-status-done">${escapeHtml(t("emv.tabs.completed"))}</span>`
      );
    } else if (state === "skipped") {
      badges.push(`<span class="defense-badge is-status">${escapeHtml(t("emv.tabs.skipped"))}</span>`);
    }
    if (handle) {
      badges.push(
        `<span class="defense-badge">${escapeHtml(t("emv.labels.handle"))} · ${escapeHtml(handle)}</span>`
      );
    }
    if (accountType) {
      badges.push(
        `<span class="defense-badge">${escapeHtml(t("emv.labels.accountType"))} · ${escapeHtml(accountType)}</span>`
      );
    }
    const statusText = statusLabel || t("emv.sprint." + sprint.key);
    if (statusText) {
      badges.push(
        `<span class="defense-badge">${escapeHtml(t("emv.labels.status"))} · ${escapeHtml(statusText)}</span>`
      );
    }

    const openButton = postLink
      ? `<button type="button" class="defense-action is-primary" data-emv-action="open">${escapeHtml(t("emv.actions.openPost"))}</button>`
      : "";
    const skipButton = `<button type="button" class="defense-action${postLink ? "" : " is-primary"}" data-emv-action="skip">${escapeHtml(t("emv.actions.skip"))}</button>`;
    const undoButton = `<button type="button" class="defense-action${postLink ? "" : " is-primary"}" data-emv-action="undo">${escapeHtml(t("emv.actions.undo"))}</button>`;
    // 完成改由左侧钩按钮完成，这里只保留「打开原帖」和「跳过」并排，少占一行。
    const actionButtons =
      state === "uncompleted"
        ? `<div class="defense-actions-row">${openButton}${skipButton}</div>`
        : `<div class="defense-actions-row">${openButton}${undoButton}</div>`;

    const tickAction = state === "uncompleted" ? "done" : "undo";
    const tickLabel =
      state === "completed" || state === "skipped"
        ? t("emv.actions.undo")
        : t("emv.actions.markDone");

    card.innerHTML = `
      <div class="defense-card-top">
        <button type="button" class="defense-tick${state === "completed" ? " is-checked" : ""}" data-emv-action="${tickAction}" aria-pressed="${state === "completed" ? "true" : "false"}" aria-label="${escapeHtml(tickLabel)}">✓</button>
        <div class="defense-card-body">
          <h3 class="defense-card-title">${escapeHtml(eventName)}</h3>
          ${badges.length ? `<div class="defense-badges">${badges.join("")}</div>` : ""}
          ${postedTime ? `<p class="defense-meta emv-time">${escapeHtml(t("emv.labels.postedTime"))} · ${escapeHtml(postedTime)}</p>` : ""}
          <div class="defense-actions">${actionButtons}</div>
        </div>
      </div>
    `;
    return card;
  }

  function renderEmvList() {
    const listEl = $("emv-list");
    if (!listEl) return;
    syncEmvTabs();
    renderEmvProgress();
    const items = getFilteredEmvTasks();
    listEl.innerHTML = "";
    items.forEach((task) => listEl.appendChild(renderEmvCard(task)));
    renderEmvEmpty(items.length);
  }

  function markEmvDone(taskId) {
    if (!taskId) return;
    emvDone[taskId] = { at: new Date().toISOString().slice(0, 16).replace("T", " ") };
    delete emvSkip[taskId];
    writeJsonMap(EMV_DONE_KEY, emvDone);
    writeJsonMap(EMV_SKIP_KEY, emvSkip);
    renderEmvList();
  }

  function markEmvSkip(taskId) {
    if (!taskId) return;
    emvSkip[taskId] = 1;
    delete emvDone[taskId];
    writeJsonMap(EMV_DONE_KEY, emvDone);
    writeJsonMap(EMV_SKIP_KEY, emvSkip);
    renderEmvList();
  }

  function undoEmvStatus(taskId) {
    if (!taskId) return;
    delete emvDone[taskId];
    delete emvSkip[taskId];
    writeJsonMap(EMV_DONE_KEY, emvDone);
    writeJsonMap(EMV_SKIP_KEY, emvSkip);
    renderEmvList();
  }

  function findEmvTask(taskId) {
    return emvTasks.find((item) => item.id === taskId) || null;
  }

  function openEmvPost(task) {
    if (!task || !task.postLink) return;
    window.open(task.postLink, "_blank", "noopener,noreferrer");
  }

  async function fetchEmvPayload(url) {
    const response = await fetch(bustCache(url), { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload && typeof payload.detail === "string" ? payload.detail.trim() : "";
      throw new Error(detail || "emv api " + response.status);
    }
    return payload || {};
  }

  async function loadEmvTasks(options) {
    const force = Boolean(options && options.force);
    if (emvLoading) return;
    if (emvLoaded && !force) {
      renderEmvList();
      return;
    }

    emvLoading = true;
    emvLoadError = false;
    const refreshBtn = $("emv-refresh");
    if (refreshBtn) refreshBtn.classList.add("is-spinning");
    if (!emvTasks.length) renderEmvList();

    try {
      let payload;
      try {
        payload = await fetchEmvPayload(EMV_LIVE_URL);
      } catch (liveError) {
        console.warn("[EMV] live Notion API unavailable, using local fallback", liveError);
        payload = await fetchEmvPayload(EMV_FALLBACK_URL);
      }
      const tasks = Array.isArray(payload)
        ? payload
        : Array.isArray(payload && payload.tasks)
          ? payload.tasks
          : [];
      emvTasks = tasks.filter(
        (item) =>
          item &&
          item.id &&
          (String(item.event || "").trim() || String(item.artist || "").trim()) &&
          !isHiddenEmvStatus(item.status),
      );
      emvLoaded = true;
      emvLoadError = false;
      renderEmvList();
    } catch (err) {
      console.error(err);
      emvTasks = [];
      emvLoaded = true;
      emvLoadError = true;
      renderEmvList();
    } finally {
      emvLoading = false;
      if (refreshBtn) {
        setTimeout(() => refreshBtn.classList.remove("is-spinning"), 560);
      }
    }
  }

  function ensureEmvReady() {
    loadEmvLocalState();
    syncEmvTabs();
    setEmvGuideOpen(localStorage.getItem(EMV_GUIDE_KEY) === "1");
    startEmvSprintTicker();
    loadEmvTasks();
  }

  function bindEmvEvents() {
    const toggle = $("emv-guide-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        setEmvGuideOpen(!isEmvGuideOpen());
      });
    }
    const tabs = $("emv-tabs");
    if (tabs) {
      tabs.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-emv-tab]");
        if (btn) setEmvView(btn.dataset.emvTab);
      });
    }
    const refreshBtn = $("emv-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => loadEmvTasks({ force: true }));
    }
    const listEl = $("emv-list");
    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const actionBtn = e.target.closest("[data-emv-action]");
        const card = e.target.closest("[data-emv-id]");
        if (!actionBtn || !card) return;
        const taskId = card.dataset.emvId;
        const action = actionBtn.dataset.emvAction;
        if (action === "open") openEmvPost(findEmvTask(taskId));
        else if (action === "done") markEmvDone(taskId);
        else if (action === "skip") markEmvSkip(taskId);
        else if (action === "undo") undoEmvStatus(taskId);
      });
    }
  }

  /* ================= DEFENSE：待办清单 ================= */

  function defenseStateOf(clue) {
    const id = clue && clue.id;
    if (!id) return "uncompleted";
    if (defenseDone[id]) return "completed";
    if (defenseSkip[id]) return "skipped";
    return "uncompleted";
  }

  function loadDefenseLocalState() {
    defenseDone = readJsonMap(DEFENSE_DONE_KEY);
    defenseSkip = readJsonMap(DEFENSE_SKIP_KEY);
    defenseOpen = readJsonMap(DEFENSE_OPEN_KEY);
    const savedTab = localStorage.getItem(DEFENSE_TAB_KEY);
    defenseView = DEFENSE_TABS.includes(savedTab) ? savedTab : "uncompleted";
  }

  function syncDefenseTabs() {
    document.querySelectorAll("#defense-tabs [data-defense-tab]").forEach((btn) => {
      const active = btn.dataset.defenseTab === defenseView;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function setDefenseView(view) {
    if (!DEFENSE_TABS.includes(view)) view = "uncompleted";
    defenseView = view;
    localStorage.setItem(DEFENSE_TAB_KEY, view);
    syncDefenseTabs();
    renderDefenseList();
  }

  function getFilteredDefenseClues() {
    // 新抓到的排在上面：按 fetch_date 倒序，同日再按编号倒序
    const sorted = defenseClues.slice().sort((a, b) => {
      const byFetch = String(b.fetch_date || "").localeCompare(String(a.fetch_date || ""));
      if (byFetch) return byFetch;
      return String(b.no || "").localeCompare(String(a.no || ""));
    });

    if (defenseView === "all") return sorted;
    return sorted.filter((clue) => defenseStateOf(clue) === defenseView);
  }

  function scoreBadgeClass(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return "";
    if (n >= 80) return " is-score-hi";
    if (n >= 50) return " is-score-mid";
    return "";
  }

  function renderDefenseEmpty(visibleCount) {
    const emptyEl = $("defense-empty");
    const emptyText = $("defense-empty-text");
    if (!emptyEl || !emptyText) return;

    // 首次加载未完成时显示 loading；已加载过的空列表要显示空态，不能一直转圈
    if (!defenseLoaded) {
      emptyEl.hidden = false;
      emptyText.textContent = defenseLoadError
        ? t("defense.labels.loadError")
        : t("defense.labels.loading");
      return;
    }

    if (visibleCount > 0) {
      emptyEl.hidden = true;
      emptyText.textContent = "";
      return;
    }

    emptyEl.hidden = false;
    emptyText.textContent =
      defenseView === "uncompleted"
        ? t("defense.labels.emptyPending")
        : t("defense.labels.emptyList");
  }

  function renderDefenseCard(clue) {
    const state = defenseStateOf(clue);
    const opened = Boolean(defenseOpen[clue.id]);
    const timeText = String(clue.post_time || clue.fetch_date || "").slice(0, 16);
    const authorLabel = t("defense.labels.author");
    const reasons = Array.isArray(clue.reasons) ? clue.reasons : [];
    const keywords = Array.isArray(clue.kws) ? clue.kws.filter(Boolean).slice(0, 4) : [];
    const title = clue.title || clue.no || clue.id || "";

    const card = document.createElement("article");
    card.className =
      "defense-card" +
      (state === "completed" ? " is-done" : "") +
      (state === "skipped" ? " is-skipped" : "");
    card.dataset.clueId = clue.id;

    const badges = [];
    if (state === "completed") {
      badges.push(
        `<span class="defense-badge is-status is-status-done">${escapeHtml(t("defense.tabs.completed"))}</span>`
      );
    } else if (state === "skipped") {
      badges.push(
        `<span class="defense-badge is-status">${escapeHtml(t("defense.tabs.skipped"))}</span>`
      );
    }
    if (clue.hit_zone) {
      badges.push(`<span class="defense-badge">${escapeHtml(clue.hit_zone)}</span>`);
    }
    if (clue.score != null && clue.score !== "") {
      badges.push(
        `<span class="defense-badge${scoreBadgeClass(clue.score)}">${escapeHtml(String(clue.score))}</span>`
      );
    }
    keywords.forEach((kw) => {
      badges.push(`<span class="defense-badge">${escapeHtml(kw)}</span>`);
    });

    const actionButtons =
      state === "uncompleted"
        ? `
          <button type="button" class="defense-action is-primary" data-defense-action="open">${escapeHtml(t("defense.actions.openPost"))}</button>
          <div class="defense-actions-row">
            <button type="button" class="defense-action" data-defense-action="done">${escapeHtml(t("defense.actions.markDone"))}</button>
            <button type="button" class="defense-action" data-defense-action="skip">${escapeHtml(t("defense.actions.skip"))}</button>
          </div>
          <button type="button" class="defense-action" data-defense-action="guide">${escapeHtml(t("defense.labels.guide"))}</button>
        `
        : `
          <button type="button" class="defense-action is-primary" data-defense-action="open">${escapeHtml(t("defense.actions.openPost"))}</button>
          <div class="defense-actions-row">
            <button type="button" class="defense-action" data-defense-action="undo">${escapeHtml(t("defense.actions.undo"))}</button>
            <button type="button" class="defense-action" data-defense-action="guide">${escapeHtml(t("defense.labels.guide"))}</button>
          </div>
        `;

    const tickAction = state === "uncompleted" ? "done" : "undo";
    const tickLabel =
      state === "completed" || state === "skipped"
        ? t("defense.actions.undo")
        : t("defense.actions.markDone");

    card.innerHTML = `
      <div class="defense-card-top">
        <button type="button" class="defense-tick${state === "completed" ? " is-checked" : ""}" data-defense-action="${tickAction}" aria-pressed="${state === "completed" ? "true" : "false"}" aria-label="${escapeHtml(tickLabel)}">✓</button>
        <div class="defense-card-body">
          ${clue.no ? `<p class="defense-card-no">${escapeHtml(clue.no)}</p>` : ""}
          <h3 class="defense-card-title">${escapeHtml(title)}</h3>
          ${badges.length ? `<div class="defense-badges">${badges.join("")}</div>` : ""}
          <p class="defense-meta">${escapeHtml(timeText)}${timeText ? " · " : ""}${escapeHtml(authorLabel)} ${escapeHtml(clue.author || "-")}</p>
          <div class="defense-actions">${actionButtons}</div>
          <div class="defense-guide" ${opened ? "" : "hidden"}>
            <p class="defense-guide-title">${escapeHtml(t("defense.labels.guide"))}</p>
            ${clue.snippet ? `<p class="defense-guide-snip">${escapeHtml(clue.snippet)}</p>` : ""}
            ${
              reasons.length
                ? `<ul class="defense-guide-reasons">${reasons
                    .map((reason) => `<li>${escapeHtml(reason)}</li>`)
                    .join("")}</ul>`
                : ""
            }
          </div>
        </div>
      </div>
    `;

    return card;
  }

  function renderDefenseList() {
    const listEl = $("defense-list");
    if (!listEl) return;

    syncDefenseTabs();
    const items = getFilteredDefenseClues();
    listEl.innerHTML = "";
    items.forEach((clue) => {
      listEl.appendChild(renderDefenseCard(clue));
    });
    renderDefenseEmpty(items.length);
  }

  function markDefenseDone(clueId) {
    if (!clueId) return;
    defenseDone[clueId] = {
      at: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    delete defenseSkip[clueId];
    writeJsonMap(DEFENSE_DONE_KEY, defenseDone);
    writeJsonMap(DEFENSE_SKIP_KEY, defenseSkip);
    renderDefenseList();
  }

  function markDefenseSkip(clueId) {
    if (!clueId) return;
    defenseSkip[clueId] = 1;
    delete defenseDone[clueId];
    writeJsonMap(DEFENSE_DONE_KEY, defenseDone);
    writeJsonMap(DEFENSE_SKIP_KEY, defenseSkip);
    renderDefenseList();
  }

  function undoDefenseStatus(clueId) {
    if (!clueId) return;
    delete defenseDone[clueId];
    delete defenseSkip[clueId];
    writeJsonMap(DEFENSE_DONE_KEY, defenseDone);
    writeJsonMap(DEFENSE_SKIP_KEY, defenseSkip);
    renderDefenseList();
  }

  function toggleDefenseGuide(clueId) {
    if (!clueId) return;
    if (defenseOpen[clueId]) delete defenseOpen[clueId];
    else defenseOpen[clueId] = 1;
    writeJsonMap(DEFENSE_OPEN_KEY, defenseOpen);
    renderDefenseList();
  }

  function openDefensePost(clue) {
    if (!clue || !clue.url) return;
    window.open(clue.url, "_blank", "noopener,noreferrer");
  }

  function findDefenseClue(clueId) {
    return defenseClues.find((item) => item.id === clueId) || null;
  }

  async function fetchDefenseJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load defense data: ${url}`);
    return res.json();
  }

  async function loadDefenseClues(options) {
    const force = Boolean(options && options.force);
    if (defenseLoading) return;
    if (defenseLoaded && !force) {
      renderDefenseList();
      return;
    }

    defenseLoading = true;
    defenseLoadError = false;
    const refreshBtn = $("defense-refresh");
    if (refreshBtn) refreshBtn.classList.add("is-spinning");
    if (!defenseClues.length) renderDefenseList();

    try {
      let payload = null;
      try {
        payload = await fetchDefenseJson(defenseDataUrl);
      } catch (primaryErr) {
        console.warn(primaryErr);
        if (defenseFallbackUrl && defenseFallbackUrl !== defenseDataUrl) {
          payload = await fetchDefenseJson(defenseFallbackUrl);
        } else {
          throw primaryErr;
        }
      }

      const clues = Array.isArray(payload)
        ? payload
        : Array.isArray(payload && payload.clues)
          ? payload.clues
          : [];
      defenseClues = clues.filter((item) => item && item.id);
      defenseLoaded = true;
      defenseLoadError = false;
      renderDefenseList();
    } catch (err) {
      console.error(err);
      defenseClues = [];
      defenseLoaded = true;
      defenseLoadError = true;
      renderDefenseList();
    } finally {
      defenseLoading = false;
      if (refreshBtn) {
        // 等动画结束再移除 class，避免瞬间被清掉看不到旋转
        setTimeout(() => refreshBtn.classList.remove("is-spinning"), 560);
      }
    }
  }

  function ensureDefenseReady() {
    loadDefenseLocalState();
    syncDefenseTabs();
    loadDefenseClues();
  }

  function bindDefenseEvents() {
    const tabs = $("defense-tabs");
    if (tabs) {
      tabs.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-defense-tab]");
        if (btn) setDefenseView(btn.dataset.defenseTab);
      });
    }

    const refreshBtn = $("defense-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        loadDefenseClues({ force: true });
      });
    }

    const listEl = $("defense-list");
    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const actionBtn = e.target.closest("[data-defense-action]");
        const card = e.target.closest("[data-clue-id]");
        if (!actionBtn || !card) return;

        const clueId = card.dataset.clueId;
        const clue = findDefenseClue(clueId);
        const action = actionBtn.dataset.defenseAction;

        if (action === "open") openDefensePost(clue);
        else if (action === "done") {
          // 勾选框在已完成状态再点一次 = 撤销
          if (defenseStateOf(clue) === "completed") undoDefenseStatus(clueId);
          else markDefenseDone(clueId);
        } else if (action === "skip") markDefenseSkip(clueId);
        else if (action === "undo") undoDefenseStatus(clueId);
        else if (action === "guide") toggleDefenseGuide(clueId);
      });
    }
  }

  btnRandom.addEventListener("click", generateRandomTweet);
  btnTweet.addEventListener("click", postTweet);
  if (btnCopy) {
    btnCopy.addEventListener("click", () => copyText(preview.value || "", btnCopy));
  }
  preview.addEventListener("input", () => {
    previewIsGenerated = false;
    syncPreviewState();
  });
  if (eventTrigger) {
    eventTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = eventTrigger.getAttribute("aria-expanded") !== "true";
      setEventMenuOpen(open);
    });
  }

  if (eventMenu) {
    eventMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      const option = e.target.closest("[data-event-id]");
      if (option) applyEvent(option.dataset.eventId, { closeMenu: true });
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("#lang-switcher [data-lang]");
    if (button) switchLang(button.dataset.lang);
  });

  document.addEventListener("click", (e) => {
    if (eventPicker && !eventPicker.contains(e.target)) {
      setEventMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setEventMenuOpen(false);
    }
  });

  if (appNavbar) {
    appNavbar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-app-tab]");
      if (btn) switchAppTab(btn.dataset.appTab);
    });
  }

  window.addEventListener("hashchange", () => {
    const route = resolveRoute();
    switchAppTab(route.appTab, { writeHash: false });
  });

  async function init() {
    try {
      await loadMessages();
    } catch (err) {
      console.error(err);
      messages = FALLBACK_MESSAGES;
    }
    currentLang = detectSiteLang();
    loadDefenseLocalState();
    bindDefenseEvents();
    loadEmvLocalState();
    bindEmvEvents();
    applyI18n();

    const savedEvent = localStorage.getItem(EVENT_KEY);
    currentEventId = savedEvent ? normalizeEventId(savedEvent) : defaultEventId;
    fillEventMenu();
    applyEvent(currentEventId, { rebuild: false });

    const route = resolveRoute();
    switchAppTab(route.appTab, { writeHash: false });
    if (route.writeHash) syncHash();

    await refreshConfig();
    setInterval(refreshConfig, CONFIG_POLL_MS);
    window.addEventListener("focus", refreshConfig);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshConfig();
      }
    });
  }

  init();
})();

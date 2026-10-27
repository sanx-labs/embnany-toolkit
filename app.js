(function () {
  "use strict";

  const LANG_FILES = {
    "zh-CN": "/public/prompts/zh-CN.txt",
    "zh-TW": "/public/prompts/zh-TW.txt",
    en: "/public/prompts/en.txt",
    th: "/public/prompts/th.txt",
  };

  const UI_LANGS = ["zh-CN", "zh-TW", "en", "th"];
  const SITE_LANG_KEY = "site_lang";
  const MESSAGES_URL = "/public/i18n/messages.json";
  const LANG_SHORT = {
    "zh-CN": "简中",
    "zh-TW": "繁中",
    en: "EN",
    th: "ไทย",
  };

  // 字典拉取失败时的兜底，保证 t() 不会把 key 直接显示到界面
  const FALLBACK_MESSAGES = {
    "zh-CN": {
      navAria: "站点模块",
      navTrend: "TREND",
      navEmv: "EMV(Beta)",
      navDefense: "DEFENSE(Beta)",
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
      emv: {
        guideline: {
          title: "Quick Tips",
          collapseBtn: "收起",
          expandBtn: "展开",
          rules: [
            {
              tag: "有效评论标准",
              noLabel: "避免",
              noText: "仅发送单个单词、简单夸奖或堆砌表情符号，此类内容会被平台算法自动判定为无意义灌水。",
              yesLabel: "建议",
              yesText: "撰写包含至少 4 至 5 个实词的完整语句，使用母语阐述具体细节，帮助系统算法建立正向语义标签。",
            },
            {
              tag: "楼中楼讨论延伸",
              content: "发表主评论后，在现有高赞评论下点击回复建立连续对话。单条评论形成 3 条以上追加互动可显著增加页面停留时间，提升内容推荐权重。",
            },
            {
              tag: "多图轮播完整翻阅",
              content: "针对多图轮播内容，请务必横划浏览至最后一页，并适度放大画面查看细节。完整的翻阅率和交互时长均属于高价值参与指标。",
            },
            {
              tag: "短视频多次完播",
              content: "浏览短视频（Reels）时请完整播放至少 3 遍，确保播放完成率突破 100%，以触发平台的跨圈层推流机制。",
            },
            {
              tag: "收藏与私信转推",
              content: "优先点击书签图标完成收藏，并使用分享功能将链接通过私信发送。在当前媒介评估体系中，收藏与私信分享的权重远高于常规点赞。",
            },
          ],
        },
      },
    },
  };

  // EMV Guideline：记住用户是否收起，避免每次刷新都强制展开
  const EMV_GUIDELINE_COLLAPSED_KEY = "emv-guideline-collapsed-v1";

  // DEFENSE 线索源：由 config.js 覆盖；接入 Notion 前先读本地空列表
  const DEFENSE_DEFAULT_DATA_URL = "/public/defense/clues.json";
  const DEFENSE_DEFAULT_FALLBACK_URL = "/public/defense/clues.json";
  const DEFENSE_DONE_KEY = "defense-done-v1";
  const DEFENSE_SKIP_KEY = "defense-skip-v1";
  const DEFENSE_OPEN_KEY = "defense-open-v1";
  const DEFENSE_TAB_KEY = "defense-tab-v1";
  const DEFENSE_TABS = ["uncompleted", "completed", "skipped", "all"];

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
  const APP_TABS = ["trend", "emv", "defense"];
  const CHECK_ICON_SVG =
    '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" width="16" height="16"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 0 0-1.414 0L8 12.586 4.707 9.293a1 1 0 1 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l8-8a1 1 0 0 0 0-1.414z" clip-rule="evenodd"/></svg>';

  let EVENT_CONFIGS = { ...FALLBACK_EVENT_CONFIGS };
  let defaultEventId = "EmiBonnie";
  let currentEventId = "EmiBonnie";
  let CONFIG = { keywords: "", hashtags: "" };
  let lastRandomLine = null;
  let previewIsGenerated = false;
  let messages = {};
  let currentLang = "zh-CN";
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

  const $ = (id) => document.getElementById(id);

  const preview = $("preview");
  const charCount = $("char-count");
  const btnRandom = $("btn-random");
  const btnTweet = $("btn-tweet");
  const iconRefresh = $("icon-refresh");
  const btnCopy = $("btn-copy");
  const appNavbar = $("app-navbar");
  const langSwitcher = $("lang-switcher");
  const langTrigger = $("lang-trigger");
  const langMenu = $("lang-menu");
  const langTriggerLabel = $("lang-trigger-label");
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
    const dict = messages[currentLang] || messages["zh-CN"] || {};
    const fallback = messages["zh-CN"] || {};
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

  /** 浏览器语言降级：zh-TW / zh-Hant → 繁中，其余 zh → 简中，th / en 精确前缀匹配。 */
  function matchNavigatorLang() {
    const codes = (navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language]
    ).map((code) => String(code || "").toLowerCase());

    for (const code of codes) {
      if (
        code.startsWith("zh-tw") ||
        code.startsWith("zh-hant") ||
        code === "zh-hk" ||
        code === "zh-mo"
      ) {
        return "zh-TW";
      }
      if (code.startsWith("zh")) return "zh-CN";
      if (code.startsWith("th")) return "th";
      if (code.startsWith("en")) return "en";
    }
    return "zh-CN";
  }

  function detectSiteLang() {
    const saved = localStorage.getItem(SITE_LANG_KEY);
    if (UI_LANGS.includes(saved)) return saved;
    const detected = matchNavigatorLang();
    localStorage.setItem(SITE_LANG_KEY, detected);
    return detected;
  }

  async function loadMessages() {
    const res = await fetch(MESSAGES_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load i18n dictionary");
    messages = await res.json();
    if (!messages["zh-CN"]) messages = FALLBACK_MESSAGES;
  }

  function setLangMenuOpen(open) {
    if (!langTrigger || !langMenu) return;
    langTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    langMenu.toggleAttribute("hidden", !open);
  }

  function syncLangSwitcher() {
    if (langTriggerLabel) {
      langTriggerLabel.textContent = LANG_SHORT[currentLang] || currentLang;
      if (currentLang === "th") langTriggerLabel.setAttribute("data-script", "th");
      else langTriggerLabel.removeAttribute("data-script");
    }
    document.querySelectorAll("#lang-menu [data-lang]").forEach((btn) => {
      const active = btn.dataset.lang === currentLang;
      btn.classList.toggle("active", active);
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

    syncLangSwitcher();
    syncPreviewState();
    // 列表文案由 JS 渲染，语言切换后需要重绘
    if ($("defense-list")) renderDefenseList();
    renderEmvGuideline();
  }

  function switchLang(lang) {
    if (!UI_LANGS.includes(lang)) lang = "zh-CN";
    const changed = lang !== currentLang;
    currentLang = lang;
    localStorage.setItem(SITE_LANG_KEY, lang);
    applyI18n();
    setLangMenuOpen(false);

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
    const res = await fetch(url);
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
    const res = await fetch(`/config.js?_=${Date.now()}`, { cache: "no-store" });
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

  /** 解析地址栏 hash，合法值为 trend / emv / defense。 */
  function resolveRoute() {
    const hash = location.hash.replace("#", "");
    const savedApp = localStorage.getItem(APP_TAB_KEY);
    const saved = APP_TABS.includes(savedApp) ? savedApp : "trend";

    if (APP_TABS.includes(hash)) {
      return { appTab: hash, writeHash: false };
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
    if (!APP_TABS.includes(tab)) tab = "trend";
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

    // 进入 DEFENSE 时再懒加载线索，避免拖慢 TREND 首屏
    if (tab === "defense") {
      ensureDefenseReady();
    }
  }

  /* ================= EMV：Guideline 公告栏 ================= */

  function strField(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  /** 规范化规则条目：支持对比型（避免/建议）与说明型（content）。 */
  function normalizeEmvGuidelineRule(rule) {
    if (!rule || typeof rule !== "object") return null;
    const tag = strField(rule.tag);
    const content = strField(rule.content);
    const noLabel = strField(rule.noLabel);
    const noText = strField(rule.noText);
    const yesLabel = strField(rule.yesLabel);
    const yesText = strField(rule.yesText);
    if (!tag) return null;
    if (content) return { tag, content };
    if (noText || yesText) {
      return { tag, noLabel, noText, yesLabel, yesText };
    }
    return null;
  }

  /** 从当前语言字典取出 rules；失败时回退到简中。 */
  function getEmvGuidelineRules() {
    const dict = messages[currentLang] || {};
    const fallback = messages["zh-CN"] || FALLBACK_MESSAGES["zh-CN"] || {};
    const rules =
      (dict.emv && dict.emv.guideline && dict.emv.guideline.rules) ||
      (fallback.emv && fallback.emv.guideline && fallback.emv.guideline.rules) ||
      [];
    if (!Array.isArray(rules)) return [];
    return rules.map(normalizeEmvGuidelineRule).filter(Boolean);
  }

  function isEmvGuidelineCollapsed() {
    return localStorage.getItem(EMV_GUIDELINE_COLLAPSED_KEY) === "1";
  }

  function syncEmvGuidelineOpen(open) {
    const root = $("emv-guideline");
    const toggle = $("emv-guideline-toggle");
    const actionText = $("emv-guideline-action-text");
    if (!root || !toggle) return;

    const actionKey = open ? "emv.guideline.collapseBtn" : "emv.guideline.expandBtn";
    const actionLabel = t(actionKey);
    root.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", actionLabel);
    if (actionText) {
      actionText.dataset.i18n = actionKey;
      actionText.textContent = actionLabel;
    }
  }

  function setEmvGuidelineOpen(open) {
    localStorage.setItem(EMV_GUIDELINE_COLLAPSED_KEY, open ? "0" : "1");
    syncEmvGuidelineOpen(open);
  }

  function renderEmvGuidelineRules() {
    const list = $("emv-guideline-rules");
    if (!list) return;
    const rules = getEmvGuidelineRules();
    list.innerHTML = rules
      .map((rule) => {
        const tagHtml = `<span class="emv-rule-tag">${escapeHtml(rule.tag)}</span>`;
        if (rule.content) {
          return `<li class="emv-rule">${tagHtml}<p class="emv-rule-content">${escapeHtml(rule.content)}</p></li>`;
        }
        const avoidHtml = rule.noText
          ? `<div class="emv-rule-pair is-avoid"><span class="emv-rule-label">${escapeHtml(rule.noLabel || "")}</span><p>${escapeHtml(rule.noText)}</p></div>`
          : "";
        const yesHtml = rule.yesText
          ? `<div class="emv-rule-pair is-yes"><span class="emv-rule-label">${escapeHtml(rule.yesLabel || "")}</span><p>${escapeHtml(rule.yesText)}</p></div>`
          : "";
        return `<li class="emv-rule">${tagHtml}${avoidHtml}${yesHtml}</li>`;
      })
      .join("");
  }

  function renderEmvGuideline() {
    renderEmvGuidelineRules();
    // 默认展开；若用户曾收起则保持收起
    syncEmvGuidelineOpen(!isEmvGuidelineCollapsed());
  }

  function bindEmvEvents() {
    const toggle = $("emv-guideline-toggle");
    if (!toggle || toggle.dataset.bound === "1") return;
    toggle.dataset.bound = "1";
    toggle.addEventListener("click", () => {
      const root = $("emv-guideline");
      const nextOpen = !(root && root.classList.contains("is-open"));
      setEmvGuidelineOpen(nextOpen);
    });
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
      setLangMenuOpen(false);
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

  if (langTrigger) {
    langTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = langTrigger.getAttribute("aria-expanded") !== "true";
      setEventMenuOpen(false);
      setLangMenuOpen(open);
    });
  }

  if (langMenu) {
    langMenu.addEventListener("click", (e) => {
      const option = e.target.closest("[data-lang]");
      if (option) switchLang(option.dataset.lang);
    });
  }

  document.addEventListener("click", (e) => {
    if (langSwitcher && !langSwitcher.contains(e.target)) {
      setLangMenuOpen(false);
    }
    if (eventPicker && !eventPicker.contains(e.target)) {
      setEventMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setLangMenuOpen(false);
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

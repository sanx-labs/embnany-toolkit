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
      navEmv: "EMV",
      navDefense: "DEFENSE",
      langSwitcherAria: "切换语言",
      previewLabel: "文案预览",
      previewAria: "文案编辑",
      charCount: "{n} 字符",
      placeholder: "点击「随机文案」生成内容",
      randomBtn: "随机文案",
      tweetBtn: "一键发推",
      reportBtn: "举报",
      themeToggle: "切换主题",
      contactBefore: "有问题或反馈？通过 X 联系 ",
      copyAria: "复制",
      copiedAria: "已复制",
      comingSoon: "Coming Soon / 正在开发中",
      comingSoonHint: "该模块正在搭建，请先使用 TREND。",
      boosting: "打榜目标",
      eventSelectAria: "选择活动",
    },
  };

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

  function t(key, params) {
    const dict = messages[currentLang] || messages["zh-CN"] || {};
    const fallback = messages["zh-CN"] || {};
    let value = dict[key] ?? fallback[key] ?? key;
    if (params && typeof params === "object") {
      value = String(value).replace(/\{(\w+)\}/g, (_, name) =>
        params[name] == null ? "" : String(params[name])
      );
    }
    return value;
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
    return {
      events,
      defaultEvent: parsedDefault,
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
      EVENT_CONFIGS = next.events;
      defaultEventId = next.defaultEvent;
      applyEvent(currentEventId, { rebuild: changed, closeMenu: false });
      return changed;
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

  /**
   * 解析地址栏 hash。旧地址 #antis / #trendx / #tags / #drafts 会分别落到新模块。
   */
  function resolveRoute() {
    const hash = location.hash.replace("#", "");
    const savedApp = localStorage.getItem(APP_TAB_KEY);
    const normalized =
      hash === "antis" ? "defense"
        : hash === "trendx" || hash === "tags" || hash === "drafts" ? "trend"
        : hash;
    const saved =
      savedApp === "antis" ? "defense"
        : APP_TABS.includes(savedApp) ? savedApp
        : "trend";

    if (APP_TABS.includes(normalized)) {
      return { appTab: normalized, writeHash: normalized !== hash };
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
  }

  function initTheme() {
    const saved = localStorage.getItem("trendx-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("trendx-theme", isDark ? "dark" : "light");
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
  document.querySelectorAll("#theme-toggle, .theme-toggle-btn").forEach((el) => {
    el.addEventListener("click", toggleTheme);
  });

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
    initTheme();
    try {
      await loadMessages();
    } catch (err) {
      console.error(err);
      messages = FALLBACK_MESSAGES;
    }
    currentLang = detectSiteLang();
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

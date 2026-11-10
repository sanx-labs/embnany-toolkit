// 每日活动配置：改 keywords / hashtags 即可，页面约 2 秒内自动热更新。
const DEFAULT_EVENT = "EmiBonnie";

// DEFENSE 线索数据源：接入 Notion 前先读本地空列表。
const DEFENSE_DATA_URL = "/public/defense/clues.json";
const DEFENSE_FALLBACK_URL = "/public/defense/clues.json";

const EVENT_CONFIGS = {
  EmiBonnie: {
    name: "EmiBonnie",
    keywords: "EMIBONNIE LIGHT UP KAOHSIUNG",
    hashtags: "#BBFanFest2026inKaohsiung",
  },
  Emi: {
    name: "Emi",
    keywords: "NA",
    hashtags: "#NA",
  },
  Bonnie: {
    name: "Bonnie",
    keywords: "RIKA LIVE X BONNIE",
    hashtags: "#RIKAxBONNIE",
  },
  Any: {
    name: "Any",
    keywords: "ANY ANIMONIUM PARAGON",
    hashtags: "#ANIMONIUM2027\n#ANY",
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

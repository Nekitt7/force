/* ==========================================================================
   КВИНТ — хранилище состояния
   Структура повторяет таблицы из раздела 7 ТЗ, чтобы при переезде на сервер
   данные переливались один в один, без переписывания логики.
   Пока всё лежит в localStorage; слой доступа один (Store), поэтому замена
   на вызовы API затронет только этот файл.
   ========================================================================== */
(function (global) {
  "use strict";

  var KEY = "kvint_state_v1";
  var C = global.KvintContent;

  /* ---------- вспомогательное: даты в локальном поясе ---------- */
  function ymd(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function parseYmd(s) {
    var p = String(s).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function addDays(s, n) {
    var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d);
  }
  function daysBetween(a, b) {
    return Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
  }
  function today() { return ymd(new Date()); }

  /* ---------- пустое состояние ---------- */
  function emptyState() {
    return {
      version: 1,
      /* users */
      user: {
        id: "local",
        name: "", age: null, heightCm: null, gender: null,
        tgUsername: "", vkUsername: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        palette: "calm", themeMode: "system",
        createdAt: null,
        onboarded: false
      },
      /* privacy_settings */
      privacy: {
        showCharacter: true, showStreak: true, showCup: true,
        showPillars: false, showFatigue: false, showEmotions: false,
        showQuests: true, searchable: true, acceptQuests: true
      },
      /* character */
      character: {
        build: 1,           // 0 худощавое, 1 среднее, 2 плотное
        skin: 2,            // индекс тона кожи
        face: 0, eyes: 0, brows: 0, nose: 0, mouth: 0,
        hair: 0, hairColor: 0,
        top: 0, topColor: 0,
        bottom: 0, bottomColor: 0,
        shoes: 0, shoesColor: 0,
        accessory: -1
      },
      /* pillars + флаг «предварительно» */
      pillars: { attention: null, health: null, time: null },
      provisional: { attention: true, health: true, time: true },
      pillarHistory: [],            // [{date, attention, health, time}]
      /* test_results */
      tests: [],                    // [{id,type,subscores,total,date}]
      /* actions */
      actions: null,                // заполняется из DEFAULT_ACTIONS при инициализации
      /* day_entries + day_entry_actions (вложенно) */
      days: {},                     // { 'YYYY-MM-DD': {...} }
      /* habits / habit_logs */
      habits: [],                   // [{id,name,icon,schedule:[0..6]|'daily',pillar,reminder,archived,createdAt}]
      habitLogs: {},                // { 'habitId|date': true }
      /* quests */
      quests: [],                   // [{id,source,pillar,block,level,title,description,dueDate,status,completedAt,createdAt}]
      questLevel: { health: 1, attention: 1, time: 1 },
      /* points_ledger (свёрнутый по дням) */
      points: {},                   // { 'YYYY-MM-DD': {total, lines:{source:amount}} }
      /* progress */
      progress: {
        totalPoints: 0, currentCup: "none", activeDays: 0,
        streakCurrent: 0, streakBest: 0,
        freezesLeft: 2, freezesMonth: null, lastStreakDate: null
      },
      /* achievements */
      achievements: {},             // { code: 'YYYY-MM-DD' }
      /* аналитика */
      discoveries: [],              // [{id,kind,text,delta,confidence,actionId,createdAt,status,hiddenUntil,confirmed}]
      experiment: null,             // {discoveryId, title, rule, startDate, endDate, baseline, status, result}
      weeklyReviews: [],            // [{date, averages, weather[], points, quests, discoveryId, agree, rating, note}]
      lastAnalysisDate: null,
      /* служебное */
      reminders: { dayMark: "21:00", dayMarkOn: true, quests: true, streakRisk: true,
                   quiet: ["23:00","08:00"] },
      hintsSeen: {},
      demoMode: false
    };
  }

  /* ---------- загрузка / сохранение ---------- */
  var state = null;

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try {
        state = JSON.parse(raw);
        if (!state || typeof state !== "object") state = null;
      } catch (e) { state = null; }
    }
    if (!state) state = emptyState();
    // донастройка на случай старой или неполной записи
    var base = emptyState();
    Object.keys(base).forEach(function (k) {
      if (state[k] === undefined) state[k] = base[k];
    });
    if (!state.actions) {
      state.actions = C.DEFAULT_ACTIONS.map(function (a) {
        return { id: a.id, name: a.name, category: a.category, icon: a.icon, isDefault: true, hidden: false };
      });
    }
    if (!state.user.createdAt) state.user.createdAt = today();
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* приватный режим или переполнение — работаем в памяти */ }
  }

  function get() { return state || load(); }

  function reset() {
    state = emptyState();
    state.actions = C.DEFAULT_ACTIONS.map(function (a) {
      return { id: a.id, name: a.name, category: a.category, icon: a.icon, isDefault: true, hidden: false };
    });
    state.user.createdAt = today();
    save();
    return state;
  }

  /* ---------- доступ к дням ---------- */
  function getDay(date) { return get().days[date] || null; }

  function emptyDay(date) {
    return {
      date: date,
      sleepHours: null, sleepQuality: null,
      actions: [],            // [{actionId, durationHours, emotion}]
      fatigue: null,          // 0..100
      focus: null,            // 1..5
      emotionCalc: 0, emotionFinal: 0,
      loadHours: 0,
      weather: null,
      createdAt: null, editedAt: null
    };
  }

  function setDay(date, day) {
    var s = get();
    s.days[date] = day;
    save();
  }

  /* список дней по возрастанию даты */
  function dayList(limitDays) {
    var s = get();
    var keys = Object.keys(s.days).sort();
    if (limitDays) {
      var from = addDays(today(), -limitDays + 1);
      keys = keys.filter(function (k) { return k >= from; });
    }
    return keys.map(function (k) { return s.days[k]; });
  }

  function actionById(id) {
    var s = get();
    for (var i = 0; i < s.actions.length; i++) if (s.actions[i].id === id) return s.actions[i];
    return null;
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  global.Store = {
    KEY: KEY,
    load: load, save: save, get: get, reset: reset, emptyState: emptyState,
    getDay: getDay, setDay: setDay, emptyDay: emptyDay, dayList: dayList,
    actionById: actionById,
    ymd: ymd, parseYmd: parseYmd, addDays: addDays, daysBetween: daysBetween, today: today,
    uid: uid
  };
})(typeof window !== "undefined" ? window : globalThis);

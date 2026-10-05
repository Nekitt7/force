/* ==========================================================================
   КВИНТ — движки показателей
   Разделы 6.1–6.4 и 6.7–6.9 ТЗ. Формулы перенесены буквально.
   ========================================================================== */
(function (global) {
  "use strict";

  var C = global.KvintContent;
  var S = global.Store;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round1(v) { return Math.round(v * 10) / 10; }

  /* =======================================================================
     6.4  Усталость, занятость, погода
     ======================================================================= */
  var DURATION_MID = { "<1": 0.5, "1-3": 2, "3-5": 4, "5+": 6 };

  function durationHours(v) {
    if (typeof v === "number") return v;
    return DURATION_MID[v] != null ? DURATION_MID[v] : 0;
  }

  function weatherFor(fatigue) {
    if (fatigue == null) return C.WEATHER[1];
    for (var i = 0; i < C.WEATHER.length; i++) {
      if (fatigue <= C.WEATHER[i].max) return C.WEATHER[i];
    }
    return C.WEATHER[C.WEATHER.length - 1];
  }

  function loadHours(day) {
    var sum = 0;
    (day.actions || []).forEach(function (a) { sum += durationHours(a.durationHours); });
    return round1(sum);
  }

  /* =======================================================================
     6.3  Эмоциональный баланс
     ======================================================================= */
  function emotionCalc(day) {
    var sum = 0;
    (day.actions || []).forEach(function (a) {
      if (typeof a.emotion === "number") sum += a.emotion;
    });
    return clamp(sum, -10, 10);
  }

  /* =======================================================================
     6.1  Нормы и недосып
     ======================================================================= */
  function norm() {
    var age = S.get().user.age || 16;
    return C.sleepNorm(age);
  }
  function isUndersleep(hours) {
    if (hours == null) return false;
    return hours < norm().min - 1;
  }
  function sleepInNorm(hours) {
    if (hours == null) return false;
    var n = norm();
    return hours >= n.min && hours <= n.max;
  }
  /* перевод часов сна в балл 0–100 для теста «Здоровье» (п. 5.3) */
  function sleepHoursToScore(hours) {
    var n = norm();
    if (hours >= n.min && hours <= n.max) return 100;
    if (hours < n.min) return clamp(100 - (n.min - hours) * 25, 0, 100);
    return clamp(100 - (hours - n.max) * 10, 0, 100);
  }

  /* =======================================================================
     6.2  Движок опор
     ======================================================================= */
  function applyTestResult(pillar, result) {
    var s = S.get();
    var cur = s.pillars[pillar];
    var provisional = s.provisional[pillar];
    var next;
    if (cur == null || provisional) next = result;         // первый полный тест
    else next = 0.7 * result + 0.3 * cur;                  // повторный
    s.pillars[pillar] = clamp(next, 0, 100);
    s.provisional[pillar] = false;
    S.save();
    return s.pillars[pillar];
  }

  function applyQuickMeasure(answers) {   // {attention:1..5, health:1..5, time:1..5}
    var s = S.get();
    ["attention", "health", "time"].forEach(function (p) {
      if (answers[p] != null) {
        s.pillars[p] = clamp(answers[p] * 20, 0, 100);
        s.provisional[p] = true;
      }
    });
    S.save();
  }

  /* — есть ли движение в дне (тренировка/прогулка ≥ 30 мин) — */
  function hasMovement(day) {
    if (!day || !day.actions) return false;
    return day.actions.some(function (a) {
      var act = S.actionById(a.actionId);
      if (!act) return false;
      if (act.category !== "sport") return false;
      return durationHours(a.durationHours) >= 0.5;
    });
  }

  /* — квесты и привычки конкретного дня — */
  function questsForDate(date) {
    return S.get().quests.filter(function (q) { return q.dueDate === date; });
  }
  function habitsDoneOn(date) {
    var s = S.get();
    return s.habits.filter(function (h) {
      return !h.archived && s.habitLogs[h.id + "|" + date];
    });
  }

  /* Ежедневные сдвиги опор после вечерней отметки. Максимум ±3 на опору. */
  function dailyShifts(date) {
    var s = S.get();
    var day = S.getDay(date);
    if (!day) return { attention: 0, health: 0, time: 0 };

    var d = { attention: 0, health: 0, time: 0 };
    var under = isUndersleep(day.sleepHours);
    var inNorm = sleepInNorm(day.sleepHours);
    var qs = questsForDate(date);
    var doneQ = qs.filter(function (q) { return q.status === "done"; });
    var failQ = qs.filter(function (q) { return q.status === "active" || q.status === "failed"; });
    var habits = habitsDoneOn(date);

    /* --- Здоровье --- */
    if (inNorm) d.health += 1;
    if (hasMovement(day)) d.health += 1;
    habits.forEach(function (h) { if (h.pillar === "health") d.health += 0.5; });
    doneQ.forEach(function (q) { if (q.pillar === "health") d.health += 0.5; });
    if (under) d.health -= 2;
    // нет ни одного движения 3 дня подряд
    var noMove3 = true;
    for (var i = 0; i < 3; i++) {
      var dd = S.getDay(S.addDays(date, -i));
      if (!dd) { noMove3 = false; break; }
      if (hasMovement(dd)) { noMove3 = false; break; }
    }
    if (noMove3) d.health -= 1;

    /* --- Внимание --- */
    if (day.focus >= 4) d.attention += 1;
    if (inNorm) d.attention += 0.5;
    habits.forEach(function (h) { if (h.pillar === "attention") d.attention += 0.5; });
    doneQ.forEach(function (q) { if (q.pillar === "attention") d.attention += 0.5; });
    if (day.focus != null && day.focus <= 2) d.attention -= 1;
    if (under) d.attention -= 1;

    /* --- Время --- */
    if (day.focus >= 4) d.time += 0.5;
    if (qs.length > 0 && failQ.length === 0) d.time += 1;
    habits.forEach(function (h) { if (h.pillar === "time") d.time += 0.5; });
    doneQ.forEach(function (q) { if (q.pillar === "time") d.time += 0.5; });
    d.time -= 0.5 * failQ.length;
    if (day.loadHours > 14) d.time -= 1;

    ["attention", "health", "time"].forEach(function (p) {
      d[p] = clamp(d[p], -3, 3);
    });
    return d;
  }

  function applyDailyShifts(date) {
    var s = S.get();
    var d = dailyShifts(date);
    ["attention", "health", "time"].forEach(function (p) {
      if (s.pillars[p] == null) return;
      s.pillars[p] = clamp(s.pillars[p] + d[p], 0, 100);
    });
    // снимок в историю
    var found = s.pillarHistory.filter(function (h) { return h.date === date; })[0];
    var snap = {
      date: date,
      attention: s.pillars.attention, health: s.pillars.health, time: s.pillars.time
    };
    if (found) Object.assign(found, snap);
    else s.pillarHistory.push(snap);
    s.pillarHistory.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    S.save();
    return d;
  }

  /* Угасание: нет отметки и нет квеста 2 дня подряд → с третьего −0,5/день, но не ниже 20 */
  function applyDecay() {
    var s = S.get();
    var t = S.today();
    var streakDates = {};  // дни, закрытые заморозкой, угасанию не подлежат
    (s.progress.frozenDates || []).forEach(function (d) { streakDates[d] = true; });

    var idle = 0;
    for (var i = 1; i <= 60; i++) {
      var date = S.addDays(t, -i);
      if (date < s.user.createdAt) break;
      var active = !!S.getDay(date) || questsForDate(date).some(function (q) { return q.status === "done"; });
      if (active) break;
      if (!streakDates[date]) idle++;
    }
    var decayDays = Math.max(0, idle - 2);
    if (decayDays > 0 && !s.progress.decayAppliedFor !== undefined) { /* noop */ }
    if (decayDays > 0 && s.progress.decayAppliedFor !== t) {
      ["attention", "health", "time"].forEach(function (p) {
        if (s.pillars[p] == null) return;
        if (s.pillars[p] > 20) s.pillars[p] = Math.max(20, s.pillars[p] - 0.5);
      });
      s.progress.decayAppliedFor = t;
      S.save();
    }
  }

  /* Перекалибровка: нужен ли повторный тест (п. 6.2) */
  function needsRetest(type) {
    var s = S.get();
    var last = null;
    s.tests.forEach(function (t) { if (t.type === type && (!last || t.date > last.date)) last = t; });
    if (!last) return true;
    if (S.daysBetween(last.date, S.today()) > 14) return true;
    var pillar = type === "attention" ? "attention" : type === "health" ? "health" : type === "time" ? "time" : null;
    if (pillar && s.pillars[pillar] != null && Math.abs(s.pillars[pillar] - last.total) > 15) return true;
    return false;
  }
  function canRetest(type) {
    var s = S.get(), last = null;
    s.tests.forEach(function (t) { if (t.type === type && (!last || t.date > last.date)) last = t; });
    if (!last) return true;
    return S.daysBetween(last.date, S.today()) >= 3;
  }
  function lastTest(type) {
    var s = S.get(), last = null;
    s.tests.forEach(function (t) { if (t.type === type && (!last || t.date > last.date)) last = t; });
    return last;
  }

  /* =======================================================================
     6.7  Баллы и кубки
     ======================================================================= */
  var POINT_RULES = {
    dayEntry:    { amount: 10, label: "Вечерняя отметка" },
    streak:      { label: "Огонёк", max: 10 },
    pillarNorm:  { label: "Опоры в норме", max: 15 },
    emotionBal:  { amount: 5,  label: "Эмоции в балансе" },
    emotionRate: { amount: 2,  label: "Оценил эмоции действий" },
    questSystem: { amount: 5,  label: "Квест от Квинта", maxCount: 3 },
    questSelf:   { amount: 3,  label: "Свой квест", maxCount: 2 },
    questFriend: { amount: 7,  label: "Квест от друга", maxCount: 2 },
    habit:       { amount: 2,  label: "Привычки", maxCount: 10 },
    test:        { amount: 15, label: "Пройден тест" },
    experiment:  { amount: 20, label: "Завершён эксперимент" },
    weekly:      { amount: 10, label: "Еженедельный разбор" }
  };
  var DAILY_CAP = 100;

  function recalcDayPoints(date) {
    var s = S.get();
    var day = S.getDay(date);
    var lines = {};

    if (day) {
      lines.dayEntry = POINT_RULES.dayEntry.amount;

      // огонёк: +1 за каждый день серии, не больше 10
      lines.streak = Math.min(10, s.progress.streakCurrent || 0);

      // опоры в норме
      var pp = 0;
      ["attention", "health", "time"].forEach(function (p) {
        var v = s.pillars[p];
        if (v == null) return;
        if (v >= 80) pp += 5; else if (v >= 60) pp += 3;
      });
      if (pp) lines.pillarNorm = Math.min(15, pp);

      // эмоции
      if (Math.abs(day.emotionFinal || 0) <= 3) lines.emotionBal = POINT_RULES.emotionBal.amount;
      var rated = (day.actions || []).some(function (a) { return typeof a.emotion === "number" && a.emotion !== 0; });
      if (rated) lines.emotionRate = POINT_RULES.emotionRate.amount;
    }

    // квесты
    var qs = questsForDate(date).filter(function (q) { return q.status === "done"; });
    var cntSys = 0, cntSelf = 0, cntFr = 0;
    qs.forEach(function (q) {
      if (q.source === "system" && cntSys < 3) { cntSys++; }
      else if (q.source === "self" && cntSelf < 2) { cntSelf++; }
      else if (q.source === "friend" && cntFr < 2) { cntFr++; }
    });
    if (cntSys) lines.questSystem = cntSys * POINT_RULES.questSystem.amount;
    if (cntSelf) lines.questSelf = cntSelf * POINT_RULES.questSelf.amount;
    if (cntFr) lines.questFriend = cntFr * POINT_RULES.questFriend.amount;

    // привычки
    var hc = Math.min(10, habitsDoneOn(date).length);
    if (hc) lines.habit = hc * POINT_RULES.habit.amount;

    // тесты этого дня
    var testsToday = s.tests.filter(function (t) { return t.date === date; });
    if (testsToday.length) lines.test = testsToday.length * POINT_RULES.test.amount;

    // сохранённые разовые начисления (эксперимент, разбор)
    var prev = s.points[date] || {};
    if (prev.lines && prev.lines.experiment) lines.experiment = prev.lines.experiment;
    if (prev.lines && prev.lines.weekly) lines.weekly = prev.lines.weekly;

    var total = 0;
    Object.keys(lines).forEach(function (k) { total += lines[k]; });
    total = Math.min(DAILY_CAP, total);

    s.points[date] = { total: total, lines: lines };
    recalcTotals();
    S.save();
    return s.points[date];
  }

  function addOneOffPoints(date, source, amount) {
    var s = S.get();
    if (!s.points[date]) s.points[date] = { total: 0, lines: {} };
    s.points[date].lines[source] = (s.points[date].lines[source] || 0) + amount;
    var total = 0;
    Object.keys(s.points[date].lines).forEach(function (k) { total += s.points[date].lines[k]; });
    s.points[date].total = Math.min(DAILY_CAP, total);
    recalcTotals();
    S.save();
  }

  function recalcTotals() {
    var s = S.get();
    var sum = 0, active = 0;
    Object.keys(s.points).forEach(function (d) {
      sum += s.points[d].total;
      if (s.points[d].total > 0) active++;
    });
    s.progress.totalPoints = sum;
    s.progress.activeDays = active;
    s.progress.currentCup = cupFor(sum, active).code;
  }

  function cupFor(points, activeDays) {
    var got = C.CUPS[0];
    for (var i = 1; i < C.CUPS.length; i++) {
      var c = C.CUPS[i];
      if (points >= c.points && (!c.minActiveDays || activeDays >= c.minActiveDays)) got = c;
    }
    return got;
  }

  function nextCup() {
    var s = S.get();
    var cur = cupFor(s.progress.totalPoints, s.progress.activeDays);
    var idx = C.CUPS.findIndex(function (c) { return c.code === cur.code; });
    var nxt = C.CUPS[idx + 1] || null;
    if (!nxt) return { current: cur, next: null, percent: 100 };
    var from = cur.points, to = nxt.points;
    var pct = clamp(Math.round(((s.progress.totalPoints - from) / (to - from)) * 100), 0, 99);
    return { current: cur, next: nxt, percent: pct };
  }

  /* =======================================================================
     6.9  Огонёк
     ======================================================================= */
  function dayCounts(date) {
    if (S.getDay(date)) return true;
    return questsForDate(date).some(function (q) { return q.status === "done"; });
  }

  function recalcStreak() {
    var s = S.get();
    var t = S.today();
    // обновление заморозок в начале месяца
    var month = t.slice(0, 7);
    if (s.progress.freezesMonth !== month) {
      s.progress.freezesMonth = month;
      s.progress.freezesLeft = 2;
    }
    if (!s.progress.frozenDates) s.progress.frozenDates = [];

    var start = s.user.createdAt || t;
    var streak = 0, best = s.progress.streakBest || 0;
    var freezesUsedThisMonth = {};
    s.progress.frozenDates = [];

    // идём от даты регистрации к сегодня
    var cur = start, run = 0;
    var freezeBudget = {}; // по месяцам
    while (cur <= t) {
      var m = cur.slice(0, 7);
      if (freezeBudget[m] == null) freezeBudget[m] = 2;
      if (dayCounts(cur)) {
        run++;
      } else if (cur !== t) {                 // сегодня ещё не потеряно
        if (freezeBudget[m] > 0) {
          freezeBudget[m]--;
          s.progress.frozenDates.push(cur);
          // серия сохраняется, но не растёт
        } else {
          run = 0;
        }
      }
      if (run > best) best = run;
      cur = S.addDays(cur, 1);
    }
    s.progress.streakCurrent = run;
    s.progress.streakBest = best;
    s.progress.freezesLeft = freezeBudget[t.slice(0, 7)] != null ? freezeBudget[t.slice(0, 7)] : 2;
    S.save();
    return run;
  }

  /* =======================================================================
     6.8  Достижения
     ======================================================================= */
  function unlock(code) {
    var s = S.get();
    if (s.achievements[code]) return false;
    s.achievements[code] = S.today();
    S.save();
    return true;
  }

  function checkAchievements() {
    var s = S.get(), unlocked = [];
    var days = S.dayList();

    if (days.length >= 1 && unlock("first_step")) unlocked.push("first_step");

    var types = {};
    s.tests.forEach(function (t) { types[t.type] = true; });
    if (types.attention && types.health && types.time && unlock("acquainted")) unlocked.push("acquainted");

    if (s.progress.streakCurrent >= 7 && unlock("week_fire")) unlocked.push("week_fire");
    if (s.progress.streakCurrent >= 30 && unlock("month_fire")) unlocked.push("month_fire");
    if (s.progress.streakCurrent >= 100 && unlock("hundred")) unlocked.push("hundred");

    if (s.discoveries.length >= 1 && unlock("first_disc")) unlocked.push("first_disc");
    if (s.experiment && s.experiment.status === "finished" && unlock("scientist")) unlocked.push("scientist");

    if (days.some(function (d) { return d.emotionFinal === 10; }) && unlock("mega_happy")) unlocked.push("mega_happy");

    if (s.pillars.attention != null && s.pillars.attention >= 85 && unlock("sharp_mind")) unlocked.push("sharp_mind");
    if (s.pillars.attention >= 80 && s.pillars.health >= 80 && s.pillars.time >= 80 && unlock("all_green")) unlocked.push("all_green");

    // 7 дней подряд сон в норме
    var run = 0, okSleep = false;
    days.forEach(function (d) {
      if (sleepInNorm(d.sleepHours)) { run++; if (run >= 7) okSleep = true; } else run = 0;
    });
    if (okSleep && unlock("sleeper")) unlocked.push("sleeper");

    // 7 дней подряд солнечно/облачно (F ≤ 40)
    run = 0; var okSun = false;
    days.forEach(function (d) {
      if (d.fatigue != null && d.fatigue <= 40) { run++; if (run >= 7) okSun = true; } else run = 0;
    });
    if (okSun && unlock("sunny_week")) unlocked.push("sunny_week");

    // 14 дней подряд эмоции в балансе
    run = 0; var okZen = false;
    days.forEach(function (d) {
      if (Math.abs(d.emotionFinal || 0) <= 3) { run++; if (run >= 14) okZen = true; } else run = 0;
    });
    if (okZen && unlock("zen")) unlocked.push("zen");

    var friendDone = s.quests.filter(function (q) { return q.source === "friend" && q.status === "done"; }).length;
    if (friendDone >= 10 && unlock("team_player")) unlocked.push("team_player");

    return unlocked;
  }

  /* =======================================================================
     6.6  Рекомендации: слабая опора → слабый блок → квесты и привычки
     ======================================================================= */
  function weakestPillar() {
    var s = S.get();
    var list = ["attention", "health", "time"].filter(function (p) { return s.pillars[p] != null; });
    if (!list.length) return "health";
    list.sort(function (a, b) { return s.pillars[a] - s.pillars[b]; });
    return list[0];
  }

  function weakestBlock(pillar) {
    var t = lastTest(pillar);
    if (!t || !t.subscores) return null;
    var keys = Object.keys(t.subscores).filter(function (k) { return typeof t.subscores[k] === "number"; });
    if (!keys.length) return null;
    keys.sort(function (a, b) { return t.subscores[a] - t.subscores[b]; });
    return keys[0];
  }

  function pickQuestsForToday() {
    var s = S.get();
    var date = S.today();
    var existing = questsForDate(date).filter(function (q) { return q.source === "system"; });
    if (existing.length) return existing;

    var p1 = weakestPillar();
    var b1 = weakestBlock(p1);
    var others = ["attention", "health", "time"].filter(function (p) { return p !== p1; });
    others.sort(function (a, b) { return (s.pillars[a] || 50) - (s.pillars[b] || 50); });
    var p2 = others[0];

    var lvl = s.questLevel[p1] || 1;
    var recent = {};
    s.quests.forEach(function (q) {
      if (q.dueDate && S.daysBetween(q.dueDate, date) <= 3) recent[q.libId] = true;
    });

    function pool(pillar, block, level) {
      return C.QUEST_LIBRARY.filter(function (q) {
        if (q.pillar !== pillar) return false;
        if (block && q.block !== block) return false;
        if (recent[q.id]) return false;
        return Math.abs(q.level - level) <= 1;
      });
    }

    var chosen = [];
    var pA = pool(p1, b1, lvl);
    if (pA.length < 2) pA = pool(p1, null, lvl);
    shuffle(pA).slice(0, 2).forEach(function (q) { chosen.push(q); });
    var pB = pool(p2, weakestBlock(p2), s.questLevel[p2] || 1);
    if (!pB.length) pB = pool(p2, null, 1);
    if (pB.length) chosen.push(shuffle(pB)[0]);

    var out = [];
    chosen.forEach(function (q) {
      if (!q) return;
      var item = {
        id: S.uid("q"), libId: q.id, source: "system",
        pillar: q.pillar, block: q.block, level: q.level,
        title: q.title, description: "",
        dueDate: date, status: "active", completedAt: null, createdAt: date
      };
      s.quests.push(item);
      out.push(item);
    });
    S.save();
    return out;
  }

  function updateQuestLevel() {
    var s = S.get();
    var from = S.addDays(S.today(), -7);
    ["attention", "health", "time"].forEach(function (p) {
      var qs = s.quests.filter(function (q) {
        return q.source === "system" && q.pillar === p && q.dueDate >= from && q.dueDate < S.today();
      });
      if (qs.length < 3) return;
      var done = qs.filter(function (q) { return q.status === "done"; }).length;
      var rate = done / qs.length;
      if (rate >= 0.8) s.questLevel[p] = Math.min(3, (s.questLevel[p] || 1) + 1);
      else if (rate < 0.4) s.questLevel[p] = Math.max(1, (s.questLevel[p] || 1) - 1);
    });
    S.save();
  }

  function recommendedHabits() {
    var s = S.get();
    var p = weakestPillar();
    var b = weakestBlock(p);
    var have = {};
    s.habits.forEach(function (h) { if (h.libId) have[h.libId] = true; });
    var pool = C.HABIT_LIBRARY.filter(function (h) {
      return h.pillar === p && !have[h.id] && (!b || h.block === b);
    });
    if (pool.length < 2) {
      pool = C.HABIT_LIBRARY.filter(function (h) { return h.pillar === p && !have[h.id]; });
    }
    return pool.slice(0, 2);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* закрытие просроченных квестов */
  function expireQuests() {
    var s = S.get(), t = S.today(), changed = false;
    s.quests.forEach(function (q) {
      if (q.status === "active" && q.dueDate < t) { q.status = "failed"; changed = true; }
    });
    if (changed) S.save();
  }

  /* =======================================================================
     Сохранение вечерней отметки — главная точка входа
     ======================================================================= */
  function saveDayEntry(date, data) {
    var s = S.get();
    var day = S.getDay(date) || S.emptyDay(date);
    var isNew = !day.createdAt;

    day.sleepHours   = data.sleepHours;
    day.sleepQuality = data.sleepQuality != null ? data.sleepQuality : null;
    day.actions      = data.actions || [];
    day.fatigue      = data.fatigue;
    day.focus        = data.focus != null ? data.focus : null;
    day.loadHours    = loadHours(day);
    day.emotionCalc  = emotionCalc(day);
    day.emotionFinal = data.emotionFinal != null ? clamp(data.emotionFinal, -10, 10) : day.emotionCalc;
    day.weather      = weatherFor(day.fatigue).code;
    if (isNew) day.createdAt = new Date().toISOString();
    day.editedAt = new Date().toISOString();

    S.setDay(date, day);

    recalcStreak();
    applyDailyShifts(date);
    recalcDayPoints(date);
    var newAch = checkAchievements();
    S.save();
    return { day: day, achievements: newAch };
  }

  global.Engine = {
    clamp: clamp, round1: round1,
    durationHours: durationHours, DURATION_MID: DURATION_MID,
    weatherFor: weatherFor, loadHours: loadHours, emotionCalc: emotionCalc,
    norm: norm, isUndersleep: isUndersleep, sleepInNorm: sleepInNorm, sleepHoursToScore: sleepHoursToScore,
    applyTestResult: applyTestResult, applyQuickMeasure: applyQuickMeasure,
    dailyShifts: dailyShifts, applyDailyShifts: applyDailyShifts, applyDecay: applyDecay,
    needsRetest: needsRetest, canRetest: canRetest, lastTest: lastTest,
    recalcDayPoints: recalcDayPoints, addOneOffPoints: addOneOffPoints, recalcTotals: recalcTotals,
    cupFor: cupFor, nextCup: nextCup, POINT_RULES: POINT_RULES,
    recalcStreak: recalcStreak, dayCounts: dayCounts,
    checkAchievements: checkAchievements, unlock: unlock,
    weakestPillar: weakestPillar, weakestBlock: weakestBlock,
    pickQuestsForToday: pickQuestsForToday, updateQuestLevel: updateQuestLevel,
    recommendedHabits: recommendedHabits, expireQuests: expireQuests,
    questsForDate: questsForDate, habitsDoneOn: habitsDoneOn, hasMovement: hasMovement,
    saveDayEntry: saveDayEntry
  };
})(typeof window !== "undefined" ? window : globalThis);

/* ==========================================================================
   КВИНТ — аналитический движок
   Раздел 6.5 (открытия и эксперименты) и 6.10 (еженедельный разбор).
   Никаких нейросетей: только описательная статистика, которую можно
   показать и объяснить по шагам.
   ========================================================================== */
(function (global) {
  "use strict";

  var S = global.Store;
  var E = global.Engine;
  var C = global.KvintContent;

  function mean(arr) {
    if (!arr.length) return 0;
    var s = 0; arr.forEach(function (v) { s += v; });
    return s / arr.length;
  }
  function median(arr) {
    if (!arr.length) return 0;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  /* Корреляция Пирсона */
  function pearson(xs, ys) {
    var n = Math.min(xs.length, ys.length);
    if (n < 3) return 0;
    var mx = mean(xs.slice(0, n)), my = mean(ys.slice(0, n));
    var num = 0, dx = 0, dy = 0;
    for (var i = 0; i < n; i++) {
      var a = xs[i] - mx, b = ys[i] - my;
      num += a * b; dx += a * a; dy += b * b;
    }
    if (dx === 0 || dy === 0) return 0;
    return num / Math.sqrt(dx * dy);
  }

  function confidenceOf(minGroup) {
    if (minGroup >= 8) return { code: "high", title: "высокая", weight: 3 };
    if (minGroup >= 5) return { code: "mid",  title: "средняя",  weight: 2 };
    return { code: "low", title: "низкая", weight: 1 };
  }

  /* окно анализа — последние 28 дней с отметками */
  function windowDays(n) {
    var from = S.addDays(S.today(), -(n || 28) + 1);
    return S.dayList().filter(function (d) {
      return d.date >= from && d.fatigue != null;
    });
  }

  function enoughData() {
    var from = S.addDays(S.today(), -13);
    var cnt = S.dayList().filter(function (d) { return d.date >= from && d.fatigue != null; }).length;
    return { ok: cnt >= 7, have: cnt, need: 7 };
  }

  /* =======================================================================
     Основной проход: открытия
     ======================================================================= */
  function analyze() {
    var s = S.get();
    var check = enoughData();
    if (!check.ok) return { ok: false, progress: check };

    var days = windowDays(28);
    var found = [];

    /* --- Шаг 1. Сон --- */
    var under = days.filter(function (d) { return E.isUndersleep(d.sleepHours); });
    var normal = days.filter(function (d) { return d.sleepHours != null && !E.isUndersleep(d.sleepHours); });
    var sleepDelta = null;
    if (under.length >= 2 && normal.length >= 2) {
      sleepDelta = mean(under.map(f)) - mean(normal.map(f));
      if (sleepDelta > 15) {
        found.push({
          kind: "sleep",
          key: "sleep",
          delta: Math.round(sleepDelta),
          confidence: confidenceOf(Math.min(under.length, normal.length)),
          text: "Похоже, сильнее всего на твою усталость влияет недосып. В дни, когда ты спал меньше нормы, усталость в среднем на " +
                C.pts(sleepDelta) + " выше.",
          experiment: "Поспать норму 4 дня подряд"
        });
      }
    }

    /* поправка на сон: вычитаем «вклад» своей группы сна */
    var allMean = mean(days.map(f));
    var underMean = under.length ? mean(under.map(f)) : allMean;
    var normMean = normal.length ? mean(normal.map(f)) : allMean;
    function fAdj(d) {
      var groupMean = E.isUndersleep(d.sleepHours) ? underMean : normMean;
      return d.fatigue - (groupMean - allMean);
    }

    /* --- Шаг 2. Общая занятость --- */
    var pairs = days.filter(function (d) { return d.loadHours != null && d.loadHours > 0; });
    if (pairs.length >= 7) {
      var r = pearson(pairs.map(function (d) { return d.loadHours; }), pairs.map(f));
      if (r >= 0.5) {
        found.push({
          kind: "load", key: "load",
          delta: Math.round(r * 100) / 100,
          confidence: confidenceOf(pairs.length),
          text: "Похоже, тебя выматывает общий объём дел, а не что-то одно: чем длиннее день, тем выше усталость.",
          experiment: "Сократить день на 2 часа 4 дня подряд"
        });
      }
    }

    /* --- Шаг 3. Отдельные действия --- */
    var drains = [], restores = [];
    s.actions.forEach(function (act) {
      var withDays = days.filter(function (d) {
        return (d.actions || []).some(function (a) { return a.actionId === act.id; });
      });
      var withoutDays = days.filter(function (d) {
        return !(d.actions || []).some(function (a) { return a.actionId === act.id; });
      });
      var D = null, minGroup = 0, mode = "presence";

      if (days.length && withDays.length / days.length > 0.85) {
        /* почти ежедневное действие — сравниваем длинные дни с короткими */
        mode = "duration";
        var durs = withDays.map(function (d) {
          var tot = 0;
          (d.actions || []).forEach(function (a) {
            if (a.actionId === act.id) tot += E.durationHours(a.durationHours);
          });
          return { d: d, h: tot };
        });
        var med = median(durs.map(function (x) { return x.h; }));
        var hi = durs.filter(function (x) { return x.h > med; });
        var lo = durs.filter(function (x) { return x.h <= med; });
        if (hi.length < 3 || lo.length < 3) return;
        D = mean(hi.map(function (x) { return fAdj(x.d); })) - mean(lo.map(function (x) { return fAdj(x.d); }));
        minGroup = Math.min(hi.length, lo.length);
      } else {
        if (withDays.length < 3 || withoutDays.length < 3) return;
        D = mean(withDays.map(fAdj)) - mean(withoutDays.map(fAdj));
        minGroup = Math.min(withDays.length, withoutDays.length);
      }

      var conf = confidenceOf(minGroup);
      if (D >= 8) {
        drains.push({
          kind: "action", key: "action:" + act.id, actionId: act.id, actionName: act.name,
          delta: Math.round(D), confidence: conf, mode: mode,
          strength: D >= 15 ? "strong" : "possible",
          text: (mode === "duration"
            ? "Похоже, есть связь: когда «" + act.name + "» занимает больше обычного, твоя усталость в среднем на " + C.pts(D) + " выше."
            : "Похоже, есть связь: в дни с «" + act.name + "» твоя усталость в среднем на " + C.pts(D) + " выше.") +
            " Это может быть совпадением — давай проверим?",
          experiment: mode === "duration"
            ? "Сократить «" + act.name + "» 4 дня подряд"
            : "Обойтись без «" + act.name + "» 4 дня подряд"
        });
      } else if (D <= -8) {
        restores.push({
          kind: "restore", key: "restore:" + act.id, actionId: act.id, actionName: act.name,
          delta: Math.round(D), confidence: conf,
          text: "Похоже, «" + act.name + "» помогает тебе восстанавливаться: в такие дни усталость в среднем на " +
                C.pts(Math.abs(D)) + " ниже.",
          experiment: "Добавлять «" + act.name + "» 4 дня подряд"
        });
      }
    });

    drains.sort(function (a, b) {
      return Math.abs(b.delta) * b.confidence.weight - Math.abs(a.delta) * a.confidence.weight;
    });
    restores.sort(function (a, b) {
      return Math.abs(b.delta) * b.confidence.weight - Math.abs(a.delta) * a.confidence.weight;
    });
    found = found.concat(drains.slice(0, 3));

    /* --- Шаг 4. Фокус --- */
    var fx = days.filter(function (d) { return d.focus != null; });
    if (fx.length >= 7) {
      var rf = pearson(fx.map(function (d) { return d.focus; }), fx.map(f));
      if (rf <= -0.5) {
        found.push({
          kind: "focus", key: "focus",
          delta: Math.round(rf * 100) / 100,
          confidence: confidenceOf(fx.length),
          text: "В дни, когда ты собран, ты устаёшь меньше. Похоже, дело не только в количестве дел, но и в том, насколько рвано проходит день.",
          experiment: "Держать один фокус на дне 4 дня подряд"
        });
      }
    }

    /* --- сохраняем, уважая скрытые --- */
    var today = S.today();
    var byKey = {};
    s.discoveries.forEach(function (d) { byKey[d.key] = d; });

    var result = [];
    found.slice(0, 3 + 2).forEach(function (nd) {
      var old = byKey[nd.key];
      if (old && old.hiddenUntil && old.hiddenUntil > today) return;  // скрыто после «не подтвердилось»
      if (old) {
        old.delta = nd.delta; old.text = nd.text; old.confidence = nd.confidence;
        old.updatedAt = today; old.experiment = nd.experiment;
        result.push(old);
      } else {
        var item = {
          id: S.uid("d"), key: nd.key, kind: nd.kind, actionId: nd.actionId || null,
          text: nd.text, delta: nd.delta, confidence: nd.confidence,
          experiment: nd.experiment, createdAt: today, updatedAt: today,
          status: "open", hiddenUntil: null, confirmed: false, disagreeCount: 0
        };
        s.discoveries.push(item);
        result.push(item);
      }
    });

    s.lastAnalysisDate = today;
    S.save();

    return {
      ok: true,
      discoveries: result.slice(0, 3),
      drains: drains, restores: restores,
      sleepDelta: sleepDelta
    };

    function f(d) { return d.fatigue; }
  }

  /* видимые открытия (не скрытые) */
  function visibleDiscoveries() {
    var t = S.today();
    return S.get().discoveries
      .filter(function (d) { return !d.hiddenUntil || d.hiddenUntil <= t; })
      .sort(function (a, b) {
        return Math.abs(b.delta) * (b.confidence ? b.confidence.weight : 1) -
               Math.abs(a.delta) * (a.confidence ? a.confidence.weight : 1);
      });
  }

  /* =======================================================================
     Что заряжает / что гасит — по оценкам эмоций действий (п. 6.3)
     ======================================================================= */
  function emotionLists() {
    var days = S.dayList().filter(function (d) { return d.date >= S.addDays(S.today(), -29); });
    var agg = {};
    days.forEach(function (d) {
      (d.actions || []).forEach(function (a) {
        if (typeof a.emotion !== "number") return;
        if (!agg[a.actionId]) agg[a.actionId] = [];
        agg[a.actionId].push(a.emotion);
      });
    });
    var rows = [];
    Object.keys(agg).forEach(function (id) {
      if (agg[id].length < 3) return;
      var act = S.actionById(id);
      rows.push({ actionId: id, name: act ? act.name : id, avg: mean(agg[id]), n: agg[id].length });
    });
    rows.sort(function (a, b) { return b.avg - a.avg; });
    return {
      charge: rows.filter(function (r) { return r.avg > 0; }).slice(0, 3),
      drain:  rows.filter(function (r) { return r.avg < 0; }).reverse().slice(0, 3)
    };
  }

  /* =======================================================================
     Эксперименты (шаг 6)
     ======================================================================= */
  function startExperiment(discoveryId) {
    var s = S.get();
    if (s.experiment && s.experiment.status === "active") return { ok: false, reason: "busy" };
    var disc = s.discoveries.filter(function (d) { return d.id === discoveryId; })[0];
    if (!disc) return { ok: false, reason: "notfound" };

    var start = S.today();
    var baselineDays = S.dayList().filter(function (d) {
      return d.fatigue != null && d.date >= S.addDays(start, -14) && d.date < start;
    });
    s.experiment = {
      discoveryId: discoveryId,
      title: disc.experiment || "Проверка открытия",
      text: disc.text,
      startDate: start,
      endDate: S.addDays(start, 3),     // 4 дня включительно
      baseline: baselineDays.length ? Math.round(mean(baselineDays.map(function (d) { return d.fatigue; }))) : null,
      status: "active",
      result: null
    };
    S.save();
    return { ok: true, experiment: s.experiment };
  }

  function experimentProgress() {
    var s = S.get();
    var ex = s.experiment;
    if (!ex || ex.status !== "active") return null;
    var daysIn = S.dayList().filter(function (d) {
      return d.fatigue != null && d.date >= ex.startDate && d.date <= ex.endDate;
    });
    var left = Math.max(0, S.daysBetween(S.today(), ex.endDate));
    return {
      experiment: ex,
      daysDone: daysIn.length,
      daysLeft: left,
      current: daysIn.length ? Math.round(mean(daysIn.map(function (d) { return d.fatigue; }))) : null
    };
  }

  function finishExperimentIfDue() {
    var s = S.get();
    var ex = s.experiment;
    if (!ex || ex.status !== "active") return null;
    if (S.today() <= ex.endDate) return null;

    var daysIn = S.dayList().filter(function (d) {
      return d.fatigue != null && d.date >= ex.startDate && d.date <= ex.endDate;
    });
    if (!daysIn.length || ex.baseline == null) {
      ex.status = "finished"; ex.result = { confirmed: false, reason: "nodata" };
      S.save();
      return ex;
    }
    var during = mean(daysIn.map(function (d) { return d.fatigue; }));
    var drop = ex.baseline - during;
    var confirmed = drop >= 10;

    ex.status = "finished";
    ex.result = { confirmed: confirmed, during: Math.round(during), baseline: ex.baseline, drop: Math.round(drop) };

    var disc = s.discoveries.filter(function (d) { return d.id === ex.discoveryId; })[0];
    if (disc) {
      if (confirmed) { disc.confirmed = true; disc.status = "confirmed"; }
      else { disc.status = "rejected"; disc.hiddenUntil = S.addDays(S.today(), 30); }
    }
    E.addOneOffPoints(S.today(), "experiment", 20);
    E.checkAchievements();
    S.save();
    return ex;
  }

  /* =======================================================================
     6.10  Еженедельный разбор
     ======================================================================= */
  function weeklyAvailable() {
    var s = S.get();
    var created = s.user.createdAt || S.today();
    if (S.daysBetween(created, S.today()) < 7) return false;
    var last = s.weeklyReviews[s.weeklyReviews.length - 1];
    if (!last) return true;
    return S.daysBetween(last.date, S.today()) >= 7;
  }

  function buildWeeklyReview() {
    var s = S.get();
    var from = S.addDays(S.today(), -6);
    var days = S.dayList().filter(function (d) { return d.date >= from; });
    var res = analyze();
    var disc = res.ok && res.discoveries.length ? res.discoveries[0] : null;

    var points = 0;
    Object.keys(s.points).forEach(function (d) { if (d >= from) points += s.points[d].total; });
    var quests = s.quests.filter(function (q) { return q.dueDate >= from && q.status === "done"; }).length;

    var review = {
      id: S.uid("w"),
      date: S.today(),
      averages: {
        attention: s.pillars.attention, health: s.pillars.health, time: s.pillars.time,
        fatigue: days.length ? Math.round(mean(days.map(function (d) { return d.fatigue || 0; }))) : null,
        emotion: days.length ? Math.round(mean(days.map(function (d) { return d.emotionFinal || 0; })) * 10) / 10 : null
      },
      weather: days.map(function (d) { return E.weatherFor(d.fatigue).code; }),
      points: points,
      quests: quests,
      discoveryId: disc ? disc.id : null,
      discoveryText: disc ? disc.text : null,
      agree: null, rating: null, nextExperiment: null
    };
    return review;
  }

  function saveWeeklyReview(review) {
    var s = S.get();
    s.weeklyReviews.push(review);
    E.addOneOffPoints(S.today(), "weekly", 10);
    if (review.agree === "no" && review.discoveryId) {
      var d = s.discoveries.filter(function (x) { return x.id === review.discoveryId; })[0];
      if (d) {
        d.disagreeCount = (d.disagreeCount || 0) + 1;
        if (d.confidence && d.confidence.weight > 1) {
          d.confidence = d.confidence.weight === 3
            ? { code: "mid", title: "средняя", weight: 2 }
            : { code: "low", title: "низкая", weight: 1 };
        }
        if (d.disagreeCount >= 2) d.hiddenUntil = S.addDays(S.today(), 30);
      }
    }
    S.save();
  }

  global.Analytics = {
    mean: mean, median: median, pearson: pearson,
    enoughData: enoughData, analyze: analyze, visibleDiscoveries: visibleDiscoveries,
    emotionLists: emotionLists,
    startExperiment: startExperiment, experimentProgress: experimentProgress,
    finishExperimentIfDue: finishExperimentIfDue,
    weeklyAvailable: weeklyAvailable, buildWeeklyReview: buildWeeklyReview, saveWeeklyReview: saveWeeklyReview,
    windowDays: windowDays
  };
})(typeof window !== "undefined" ? window : globalThis);

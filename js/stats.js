/* ==========================================================================
   КВИНТ — экран аналитики (п. 4.6) и еженедельный разбор (п. 6.10)
   ========================================================================== */
(function (global) {
  "use strict";
  var S = global.Store, E = global.Engine, A = global.Analytics, C = global.KvintContent, UI = global.UI;
  var $ = UI.$, esc = UI.esc, on = UI.on;

  var period = 30;

  var WCOLOR = { sun: "#FFD166", part: "#BFD7F2", cloud: "#AEB7C2", rain: "#7E93AC", snow: "#C9DCEA" };

  UI.route("stats", function (scr) {
    A.finishExperimentIfDue();
    var res = A.analyze();
    var enough = A.enoughData();
    var days = A.windowDays(period);
    var s = S.get();

    var html = '<h1>Аналитика</h1>' +
      '<div class="chips" style="margin:10px 0 14px" id="per">' +
      [[7, "7 дней"], [30, "30 дней"], [3650, "всё время"]].map(function (p) {
        return '<button class="chip' + (period === p[0] ? " on" : "") + '" data-p="' + p[0] + '">' + p[1] + "</button>";
      }).join("") + "</div>";

    /* ---- открытия ---- */
    if (!enough.ok) {
      html += '<div class="card"><div class="row" style="padding:0;border:none"><span class="ic">🧩</span>' +
        '<div class="grow"><b>Собираю узор</b><div class="sub">Отмечено ' + enough.have + " из " + enough.need +
        " дней. Через " + (enough.need - enough.have) + " покажу первое открытие</div></div></div></div>";
    } else {
      var discs = A.visibleDiscoveries().slice(0, 3);
      if (!discs.length) {
        html += '<div class="card"><b>Пока связей не видно</b><div class="sub">Это тоже результат: резких зависимостей в твоих данных нет.</div></div>';
      } else {
        html += "<h2>Открытия</h2><div class=\"spacer\"></div>";
        discs.forEach(function (d) {
          html += '<div class="card"><div class="row" style="padding:0 0 8px;border:none">' +
            '<span class="ic">' + (d.kind === "restore" ? "🌱" : "💡") + "</span>" +
            '<div class="grow"><b>' + (d.confirmed ? "Подтверждено" : "Похоже на связь") + "</b>" +
            '<div class="sub">уверенность: ' + d.confidence.title + "</div></div></div>" +
            "<div>" + esc(d.text) + "</div>" +
            (d.confirmed ? "" : '<div class="spacer"></div><button class="btn soft small" data-exp="' + d.id + '">Проверить экспериментом</button>') +
            "</div>";
        });
      }
    }

    /* ---- активный эксперимент ---- */
    var prog = A.experimentProgress();
    if (prog) {
      html += '<div class="card"><div class="row" style="padding:0 0 8px;border:none"><span class="ic">🔬</span>' +
        '<div class="grow"><b>Эксперимент идёт</b><div class="sub">осталось дней: ' + prog.daysLeft + "</div></div></div>" +
        "<div>" + esc(prog.experiment.title) + "</div>" +
        '<div class="sub">База до эксперимента: ' + (prog.experiment.baseline != null ? prog.experiment.baseline : "—") +
        " · сейчас: " + (prog.current != null ? prog.current : "—") + "</div></div>";
    } else if (s.experiment && s.experiment.status === "finished" && s.experiment.result) {
      var r = s.experiment.result;
      html += '<div class="card"><div class="row" style="padding:0 0 8px;border:none"><span class="ic">' +
        (r.confirmed ? "✅" : "🤔") + '</span><div class="grow"><b>' +
        (r.confirmed ? "Подтвердилось" : "Не подтвердилось") + "</b></div></div>" +
        "<div>" + esc(s.experiment.title) + "</div>" +
        (r.baseline != null ? '<div class="sub">Было ' + r.baseline + " → стало " + r.during +
          " (" + (r.drop >= 0 ? "−" : "+") + Math.abs(r.drop) + ")</div>" : "") + "</div>";
    }

    /* ---- что выматывает / восстанавливает ---- */
    if (res.ok) {
      var dr = (res.drains || []).slice(0, 3), rs = (res.restores || []).slice(0, 3);
      if (dr.length || rs.length) {
        html += '<div class="grid2">';
        html += '<div class="card"><b>Выматывает</b>' + (dr.length ? dr.map(function (x) {
          return '<div class="row" style="padding:7px 0"><div class="grow ellipsis sub">' + esc(x.actionName) + "</div>" +
            '<span style="color:var(--fatigue)">+' + x.delta + "</span></div>";
        }).join("") : '<div class="sub">пока не видно</div>') + "</div>";
        html += '<div class="card"><b>Восстанавливает</b>' + (rs.length ? rs.map(function (x) {
          return '<div class="row" style="padding:7px 0"><div class="grow ellipsis sub">' + esc(x.actionName) + "</div>" +
            '<span style="color:var(--health)">' + x.delta + "</span></div>";
        }).join("") : '<div class="sub">пока не видно</div>') + "</div>";
        html += "</div>";
      }
    }

    /* ---- что заряжает / гасит ---- */
    var el = A.emotionLists();
    if (el.charge.length || el.drain.length) {
      html += '<div class="grid2">';
      html += '<div class="card"><b>Заряжает</b>' + (el.charge.length ? el.charge.map(function (x) {
        return '<div class="row" style="padding:7px 0"><div class="grow ellipsis sub">' + esc(x.name) + "</div>" +
          '<span style="color:var(--emotion)">' + (x.avg > 0 ? "+" : "") + (Math.round(x.avg * 10) / 10) + "</span></div>";
      }).join("") : '<div class="sub">мало оценок</div>') + "</div>";
      html += '<div class="card"><b>Гасит</b>' + (el.drain.length ? el.drain.map(function (x) {
        return '<div class="row" style="padding:7px 0"><div class="grow ellipsis sub">' + esc(x.name) + "</div>" +
          '<span style="color:var(--emotion)">' + (Math.round(x.avg * 10) / 10) + "</span></div>";
      }).join("") : '<div class="sub">мало оценок</div>') + "</div>";
      html += "</div>";
    }

    /* ---- графики ---- */
    if (days.length >= 2) {
      html += "<h2>Графики</h2><div class=\"spacer\"></div>";
      var hist = s.pillarHistory.filter(function (h) { return h.date >= days[0].date; });
      if (hist.length >= 2) {
        html += '<div class="card"><b>Опоры</b>' + linesChart(hist) +
          '<div class="legend">' +
          '<span><i style="background:var(--attention)"></i>Внимание</span>' +
          '<span><i style="background:var(--health)"></i>Здоровье</span>' +
          '<span><i style="background:var(--time)"></i>Время</span></div></div>';
      }
      html += '<div class="card"><b>Усталость</b>' + barsChart(days, function (d) { return d.fatigue || 0; }, function (d) {
        return WCOLOR[E.weatherFor(d.fatigue).code];
      }, 100) + "</div>";
      html += '<div class="card"><b>Эмоции</b>' + zeroChart(days) + "</div>";
      html += '<div class="card"><b>Сон</b>' + sleepChart(days) + "</div>";
      html += '<div class="card"><b>Календарь погоды</b><div class="spacer"></div>' + weatherCalendar() + "</div>";
    }

    /* ---- еженедельный разбор ---- */
    html += "<h2>Еженедельный разбор</h2><div class=\"spacer\"></div>";
    if (A.weeklyAvailable()) {
      html += '<button class="btn" id="weekly">Твоя неделя готова</button><div class="spacer"></div>';
    } else {
      html += '<div class="card"><div class="sub">Следующий разбор станет доступен, когда наберётся неделя с прошлого.</div></div>';
    }
    if (s.weeklyReviews.length) {
      html += '<div class="card">' + s.weeklyReviews.slice().reverse().slice(0, 6).map(function (w) {
        return '<div class="row"><span class="ic">📄</span><div class="grow"><b>Неделя до ' + w.date + "</b>" +
          '<div class="sub">' + w.points + " баллов · " + w.quests + " квестов</div></div>" +
          '<span>' + (w.weather || []).map(function (c) { return (C.WEATHER.filter(function (x) { return x.code === c; })[0] || {}).icon || ""; }).join("") + "</span></div>";
      }).join("") + "</div>";
    }
    html += '<div class="spacer"></div>';

    scr.innerHTML = html;
    on(scr, "#per .chip", "click", function () { period = +this.getAttribute("data-p"); UI.go("stats"); });
    on(scr, "[data-exp]", "click", function () {
      var r = A.startExperiment(this.getAttribute("data-exp"));
      if (!r.ok) return UI.toast(r.reason === "busy" ? "Сначала закончи текущий эксперимент" : "Не вышло");
      UI.toast("Эксперимент начался · 4 дня");
      UI.go("stats");
    });
    var wk = $("#weekly"); if (wk) wk.addEventListener("click", openWeekly);
  });

  /* ---------------- графики ---------------- */
  function linesChart(hist) {
    var W = 320, H = 120, pad = 6;
    var n = hist.length;
    function path(key) {
      return hist.map(function (h, i) {
        var x = pad + (W - pad * 2) * (n === 1 ? 0 : i / (n - 1));
        var y = H - pad - (H - pad * 2) * ((h[key] || 0) / 100);
        return (i ? "L" : "M") + Math.round(x) + " " + Math.round(y);
      }).join(" ");
    }
    return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' +
      '<line x1="0" y1="' + (H - pad) + '" x2="' + W + '" y2="' + (H - pad) + '" stroke="var(--line)" stroke-width="1"/>' +
      '<path d="' + path("attention") + '" fill="none" stroke="var(--attention)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="' + path("health") + '" fill="none" stroke="var(--health)" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="' + path("time") + '" fill="none" stroke="var(--time)" stroke-width="2.5" stroke-linejoin="round"/>' +
      "</svg>";
  }

  function barsChart(days, val, color, max) {
    var W = 320, H = 110, n = days.length, gap = n > 40 ? 1 : 2;
    var bw = Math.max(2, (W - gap * (n - 1)) / n);
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">';
    days.forEach(function (d, i) {
      var v = val(d) / max;
      var h = Math.max(2, v * (H - 10));
      var x = i * (bw + gap);
      s += '<rect x="' + x.toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + bw.toFixed(1) +
           '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + color(d) + '"/>';
    });
    return s + "</svg>";
  }

  function zeroChart(days) {
    var W = 320, H = 110, n = days.length, gap = n > 40 ? 1 : 2;
    var bw = Math.max(2, (W - gap * (n - 1)) / n);
    var mid = H / 2;
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' +
      '<line x1="0" y1="' + mid + '" x2="' + W + '" y2="' + mid + '" stroke="var(--line)" stroke-width="1"/>';
    days.forEach(function (d, i) {
      var v = (d.emotionFinal || 0) / 10;
      var h = Math.abs(v) * (mid - 6);
      var x = i * (bw + gap);
      var y = v >= 0 ? mid - h : mid;
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
           '" height="' + Math.max(1.5, h).toFixed(1) + '" rx="1.5" fill="var(--emotion)" opacity="' + (v === 0 ? ".3" : ".9") + '"/>';
    });
    return s + "</svg>";
  }

  function sleepChart(days) {
    var nm = E.norm();
    var W = 320, H = 110, n = days.length, gap = n > 40 ? 1 : 2;
    var bw = Math.max(2, (W - gap * (n - 1)) / n);
    var maxH = 14;
    var yTop = H - (nm.max / maxH) * H, yBot = H - (nm.min / maxH) * H;
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' +
      '<rect x="0" y="' + yTop.toFixed(1) + '" width="' + W + '" height="' + (yBot - yTop).toFixed(1) +
      '" fill="var(--health)" opacity=".13"/>';
    days.forEach(function (d, i) {
      if (d.sleepHours == null) return;
      var h = (d.sleepHours / maxH) * H;
      var x = i * (bw + gap);
      var col = E.isUndersleep(d.sleepHours) ? "var(--fatigue)" : "var(--health)";
      s += '<rect x="' + x.toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + bw.toFixed(1) +
           '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + col + '" opacity=".85"/>';
    });
    return s + "</svg>";
  }

  function weatherCalendar() {
    var t = S.today();
    var start = S.addDays(t, -34);
    var h = '<div class="calendar">';
    for (var i = 0; i < 35; i++) {
      var d = S.addDays(start, i);
      var day = S.getDay(d);
      var col = day && day.fatigue != null ? WCOLOR[E.weatherFor(day.fatigue).code] : "var(--line)";
      h += '<div class="c" style="background:' + col + '" title="' + d + '"></div>';
    }
    return h + "</div>";
  }

  /* ---------------- еженедельный разбор ---------------- */
  function openWeekly() {
    var rev = A.buildWeeklyReview();
    var a = rev.averages;
    var html = "<h2>Твоя неделя</h2>" +
      '<div class="card tight">' +
      mini("Внимание", a.attention, "attention") + mini("Здоровье", a.health, "health") +
      mini("Время", a.time, "time") +
      '<div class="row"><div class="grow">Усталость</div><b>' + (a.fatigue != null ? a.fatigue : "—") + "</b></div>" +
      '<div class="row"><div class="grow">Эмоции</div><b>' + (a.emotion != null ? (a.emotion > 0 ? "+" : "") + a.emotion : "—") + "</b></div>" +
      "</div>" +
      '<div class="card tight"><div class="row" style="border:none"><div class="grow">Погода недели</div>' +
      '<span style="font-size:18px">' + rev.weather.map(function (c) {
        return (C.WEATHER.filter(function (x) { return x.code === c; })[0] || {}).icon || "";
      }).join("") + "</span></div>" +
      '<div class="row" style="border:none"><div class="grow">Баллы</div><b>' + rev.points + "</b></div>" +
      '<div class="row" style="border:none"><div class="grow">Квестов выполнено</div><b>' + rev.quests + "</b></div></div>";

    if (rev.discoveryText) {
      html += '<div class="card"><b>Главное открытие недели</b><div class="spacer"></div>' + esc(rev.discoveryText) +
        '<div class="spacer"></div><div class="sub">Согласен с этим?</div>' +
        '<div class="chips" id="agree" style="margin-top:8px">' +
        '<button class="chip" data-a="yes">Да</button>' +
        '<button class="chip" data-a="unsure">Не уверен</button>' +
        '<button class="chip" data-a="no">Нет</button></div></div>';
    }
    html += '<div class="card"><b>Оцени неделю</b><div class="chips" id="rate" style="margin-top:8px">' +
      [1, 2, 3, 4, 5].map(function (v) { return '<button class="chip" data-r="' + v + '">' + v + "</button>"; }).join("") +
      "</div></div>" +
      '<button class="btn" id="saveW">Сохранить разбор · +10</button>';

    UI.sheet(html, function (el, close) {
      on(el, "#agree .chip", "click", function () {
        Array.prototype.forEach.call(el.querySelectorAll("#agree .chip"), function (c) { c.classList.remove("on"); });
        this.classList.add("on"); rev.agree = this.getAttribute("data-a");
      });
      on(el, "#rate .chip", "click", function () {
        Array.prototype.forEach.call(el.querySelectorAll("#rate .chip"), function (c) { c.classList.remove("on"); });
        this.classList.add("on"); rev.rating = +this.getAttribute("data-r");
      });
      el.querySelector("#saveW").addEventListener("click", function () {
        A.saveWeeklyReview(rev);
        E.checkAchievements();
        close(); UI.toast("Разбор сохранён · +10 баллов"); UI.go("stats");
      });
    });
    function mini(t, v, tok) {
      if (v == null) return "";
      return '<div class="pillar"><span class="nm">' + t + "</span>" +
        '<span class="bar"><i style="width:' + Math.round(v) + '%;background:var(--' + tok + ')"></i></span>' +
        '<span class="val">' + Math.round(v) + "</span></div>";
    }
  }
})(typeof window !== "undefined" ? window : globalThis);

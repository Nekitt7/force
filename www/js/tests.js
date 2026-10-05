/* ==========================================================================
   КВИНТ — тесты (раздел 5 ТЗ)
   Быстрый замер, внимание (3 мини-игры), здоровье, время.
   Формулы баллов перенесены буквально из ТЗ.
   ========================================================================== */
(function (global) {
  "use strict";
  var S = global.Store, E = global.Engine, C = global.KvintContent, UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, on = UI.on;
  var clamp = E.clamp;

  var TEST_META = {
    quick:     { title: "Быстрый замер", dur: "≈30 сек", icon: "⚡", desc: "По одному вопросу на опору" },
    attention: { title: "Внимание",      dur: "≈3 мин",  icon: "🧠", desc: "Три мини-игры" },
    health:    { title: "Здоровье",      dur: "≈2 мин",  icon: "💚", desc: "12 вопросов" },
    time:      { title: "Время",         dur: "≈2 мин",  icon: "⏱",  desc: "9 вопросов" }
  };

  /* =======================================================================
     Список тестов (п. 4.3)
     ======================================================================= */
  UI.route("tests", function (scr) {
    var s = S.get();
    var html = "<h1>Тесты</h1><p class=\"sub\">Проходи заново раз в две недели — значения уточняются.</p><div class=\"spacer\"></div>";
    ["quick", "attention", "health", "time"].forEach(function (type) {
      var m = TEST_META[type];
      var last = E.lastTest(type);
      var need = type !== "quick" && E.needsRetest(type);
      var can = E.canRetest(type);
      html += '<div class="card"><div class="row" style="padding:0;border:none">' +
        '<span class="ic">' + m.icon + "</span>" +
        '<div class="grow"><b>' + m.title + "</b>" +
        (need ? ' <span class="pill-badge warn">Пора обновить</span>' : "") +
        '<div class="sub">' + m.dur + " · " + m.desc + "</div>" +
        (last ? '<div class="sub">Последний: ' + Math.round(last.total) + " · " + human(last.date) + "</div>"
              : '<div class="sub">Ещё не проходил</div>') +
        "</div>" +
        '<button class="btn small ' + (can ? "soft" : "ghost") + '" data-test="' + type + '"' + (can ? "" : " disabled") + ">" +
        (last ? "Пройти заново" : "Пройти") + "</button></div></div>";
    });

    /* история */
    if (s.tests.length) {
      html += '<div class="spacer"></div><h2>История</h2><div class="card">' +
        s.tests.slice().reverse().slice(0, 12).map(function (t) {
          return '<div class="row"><span class="ic">' + TEST_META[t.type].icon + "</span>" +
            '<div class="grow"><b>' + TEST_META[t.type].title + "</b><div class=\"sub\">" + human(t.date) + "</div></div>" +
            '<b>' + Math.round(t.total) + "</b></div>";
        }).join("") + "</div>";
    }
    scr.innerHTML = html;
    on(scr, "[data-test]", "click", function () {
      var t = this.getAttribute("data-test");
      if (t === "quick") startQuick();
      else if (t === "attention") startAttention();
      else startSurvey(t);
    });
  });

  function human(d) {
    if (d === S.today()) return "сегодня";
    if (d === S.addDays(S.today(), -1)) return "вчера";
    var p = d.split("-");
    var mn = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
    return parseInt(p[2], 10) + " " + mn[parseInt(p[1], 10) - 1];
  }

  function saveTest(type, total, subscores) {
    var s = S.get();
    s.tests.push({ id: S.uid("t"), type: type, subscores: subscores || {}, total: total, date: S.today() });
    S.save();
    if (type !== "quick") E.applyTestResult(type, total);
    E.recalcDayPoints(S.today());
    E.checkAchievements();
  }

  /* =======================================================================
     Быстрый замер
     ======================================================================= */
  function startQuick() {
    var i = 0, answers = {};
    UI.route("_quick", function (scr) {
      var q = C.QUICK_QUESTIONS[i];
      scr.innerHTML = '<p class="sub">Быстрый замер · ' + (i + 1) + " из 3</p><h1>" + q.q + "</h1>" +
        UI.dots(3, i) + "<div id=\"o\">" +
        [1, 2, 3, 4, 5].map(function (v) {
          var l = ["Совсем тяжело", "Скорее тяжело", "Средне", "Скорее легко", "Легко"][v - 1];
          return '<button class="card tap" data-v="' + v + '" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center">' +
                 '<span class="ic">' + v + "</span><span>" + l + "</span></button>";
        }).join("") + "</div>";
      on(scr, "[data-v]", "click", function () {
        answers[q.pillar] = +this.getAttribute("data-v");
        if (i < 2) { i++; UI.go("_quick"); }
        else {
          E.applyQuickMeasure(answers);
          saveTest("quick", Math.round((answers.attention + answers.health + answers.time) / 3 * 20), answers);
          UI.toast("Замер сохранён");
          UI.go("tests");
        }
      });
    });
    UI.go("_quick");
  }

  /* =======================================================================
     Опросники: здоровье и время (п. 5.3, 5.4)
     ======================================================================= */
  function startSurvey(type) {
    var blocks = type === "health" ? C.HEALTH_TEST : C.TIME_TEST;
    var flat = [];
    blocks.forEach(function (b) {
      b.questions.forEach(function (q) { flat.push({ block: b.block, blockTitle: b.title, q: q }); });
    });
    var i = 0, ans = [];

    UI.route("_survey", function (scr) {
      var item = flat[i];
      var opts;
      if (item.q.type === "sleepHours") {
        opts = '<div class="card center-text"><div style="font-size:40px;font-weight:700" id="hv">8 ч</div>' +
               '<input type="range" min="3" max="13" step="0.5" value="8" id="hr"></div>' +
               '<button class="btn" id="okh">Дальше</button>';
      } else {
        opts = item.q.labels.map(function (l, k) {
          return '<button class="card tap" data-v="' + (k + 1) + '" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center">' +
                 '<span class="ic">' + (k + 1) + "</span><span>" + esc(l) + "</span></button>";
        }).join("");
      }
      scr.innerHTML = '<div style="display:flex;align-items:center;gap:10px">' +
        '<button class="btn ghost small" id="bk">' + (i === 0 ? "Выйти" : "Назад") + "</button>" +
        '<div class="sub" style="flex:1;text-align:center">' + item.blockTitle + " · " + (i + 1) + " из " + flat.length + "</div>" +
        '<div style="width:72px"></div></div>' +
        UI.dots(flat.length, i) + "<h1 style=\"font-size:24px\">" + esc(item.q.q) + "</h1><div class=\"spacer\"></div>" + opts;

      $("#bk").addEventListener("click", function () {
        if (i === 0) return UI.go("tests");
        i--; ans.pop(); UI.go("_survey");
      });
      if (item.q.type === "sleepHours") {
        var v = 8;
        $("#hr").addEventListener("input", function () { v = parseFloat(this.value); $("#hv").textContent = v + " ч"; });
        $("#okh").addEventListener("click", function () {
          ans.push({ block: item.block, score: E.sleepHoursToScore(v), hours: v });
          step();
        });
      } else {
        on(scr, "[data-v]", "click", function () {
          var a = +this.getAttribute("data-v");
          ans.push({ block: item.block, score: (a - 1) * 25 });
          step();
        });
      }
      function step() {
        if (i < flat.length - 1) { i++; UI.go("_survey"); }
        else finish();
      }
    });

    function finish() {
      var byBlock = {};
      ans.forEach(function (a) {
        if (!byBlock[a.block]) byBlock[a.block] = [];
        byBlock[a.block].push(a.score);
      });
      var subs = {}, sum = 0, n = 0;
      Object.keys(byBlock).forEach(function (b) {
        var arr = byBlock[b];
        var m = arr.reduce(function (x, y) { return x + y; }, 0) / arr.length;
        subs[b] = Math.round(m); sum += m; n++;
      });
      var total = Math.round(sum / n);
      saveTest(type, total, subs);
      showResult(type, total, subs);
    }
    UI.go("_survey");
  }

  function showResult(type, total, subs) {
    UI.route("_result", function (scr) {
      scr.innerHTML = '<div class="center-text"><h1>' + TEST_META[type].title + "</h1>" +
        '<div style="font-size:64px;font-weight:700;color:var(--' + (type === "attention" ? "attention" : type) + ')">' + total + "</div>" +
        '<p class="sub">из 100</p></div><div class="spacer"></div>' +
        '<div class="card">' + Object.keys(subs).map(function (b) {
          var v = subs[b];
          return '<div class="pillar"><span class="nm">' + (C.BLOCK_TITLES[b] || b) + "</span>" +
            '<span class="bar"><i style="width:' + Math.round(v) + '%;background:var(--accent)"></i></span>' +
            '<span class="val">' + Math.round(v) + "</span></div>";
        }).join("") + "</div>" +
        '<p class="sub">Слабее всего — «' + (C.BLOCK_TITLES[weakest(subs)] || "") + '». Квесты будут подбираться под этот блок.</p>' +
        '<div class="spacer"></div><button class="btn" id="ok">Понятно</button>';
      $("#ok").addEventListener("click", function () { UI.go("tests"); });
    });
    UI.go("_result");
  }
  function weakest(subs) {
    var k = Object.keys(subs); if (!k.length) return null;
    k.sort(function (a, b) { return subs[a] - subs[b]; });
    return k[0];
  }

  /* =======================================================================
     Тест внимания: три мини-игры (п. 5.2)
     ======================================================================= */
  function startAttention() {
    var scores = {};
    gameIntro("A", "Вспышки", "Клетки вспыхнут на секунду. Запомни их и нажми те же — порядок не важен.",
      function () { gameA(function (span) { scores.span = span; scores.A = clamp((span - 2) / 7 * 100, 0, 100); next("B"); }); });

    function next(which) {
      if (which === "B") {
        gameIntro("B", "Цель", "Полторы минуты будут появляться фигуры. Нажимай только на ★ — и ни на что другое.",
          function () { gameB(function (r) { scores.B = r.score; scores.acc = r.acc; next("C"); }); });
      } else if (which === "C") {
        gameIntro("C", "Реакция", "Как только экран станет цветным — жми. Десять попыток.",
          function () { gameC(function (rt) { scores.rt = rt; scores.C = clamp((500 - rt) / 300 * 100, 0, 100); finish(); }); });
      }
    }
    function finish() {
      var total = Math.round(0.4 * scores.A + 0.4 * scores.B + 0.2 * scores.C);
      saveTest("attention", total, {
        attention: total, A: Math.round(scores.A), B: Math.round(scores.B), C: Math.round(scores.C),
        span: scores.span, rt: scores.rt
      });
      UI.route("_attres", function (scr) {
        scr.innerHTML = '<div class="center-text"><h1>Внимание</h1>' +
          '<div style="font-size:64px;font-weight:700;color:var(--attention)">' + total + "</div><p class=\"sub\">из 100</p></div>" +
          '<div class="spacer"></div><div class="card">' +
          row("Объём внимания", scores.A, "запомнил " + scores.span + " клеток") +
          row("Устойчивость", scores.B, "точность " + Math.round(scores.acc * 100) + "%") +
          row("Скорость", scores.C, scores.rt + " мс") +
          "</div>" +
          '<p class="sub">Итог = 0,4 × объём + 0,4 × устойчивость + 0,2 × скорость.</p>' +
          '<div class="spacer"></div><button class="btn" id="ok">Понятно</button>';
        $("#ok").addEventListener("click", function () { UI.go("tests"); });
      });
      UI.go("_attres");
      function row(t, v, sub) {
        return '<div class="row"><div class="grow"><b>' + t + "</b><div class=\"sub\">" + sub + "</div></div>" +
          '<b>' + Math.round(v) + "</b></div>";
      }
    }
  }

  function gameIntro(letter, title, text, start) {
    UI.route("_gi", function (scr) {
      scr.innerHTML = '<p class="sub">Игра ' + letter + " из 3</p><h1>" + title + "</h1><p>" + text + "</p>" +
        '<div class="gamebox" style="min-height:200px"><div style="font-size:60px">' +
        (letter === "A" ? "🔲" : letter === "B" ? "⭐" : "⚡") + "</div></div>" +
        '<button class="btn" id="go">Начать</button><div class="spacer"></div>' +
        '<button class="btn ghost" id="cancel">Отложить</button>';
      $("#go").addEventListener("click", start);
      $("#cancel").addEventListener("click", function () { UI.go("tests"); });
    });
    UI.go("_gi");
  }

  /* --- Игра A: Вспышки --- */
  function gameA(done) {
    var N = 3, errorsAtN = 0, best = 0, lit = [], sel = [], phase = "show";
    UI.route("_gA", function (scr) {
      scr.innerHTML = '<p class="sub center-text">Вспышки · уровень ' + N + "</p>" +
        '<div class="gamebox"><div class="grid4" id="g">' +
        Array.from({ length: 16 }, function (_, i) { return '<button class="cellbtn" data-i="' + i + '"></button>'; }).join("") +
        '</div><div class="sub" id="hint">Запоминай…</div></div>' +
        '<button class="btn" id="ok" style="visibility:hidden">Готово</button>';
      round();
      function round() {
        phase = "show"; sel = [];
        lit = pick(16, N);
        var cells = $$("#g .cellbtn");
        cells.forEach(function (c) { c.className = "cellbtn"; });
        lit.forEach(function (i) { cells[i].classList.add("lit"); });
        $("#hint").textContent = "Запоминай…";
        $("#ok").style.visibility = "hidden";
        setTimeout(function () {
          cells.forEach(function (c) { c.className = "cellbtn"; });
          phase = "input";
          $("#hint").textContent = "Нажми " + N + " клеток";
          $("#ok").style.visibility = "visible";
        }, 1200);
      }
      on(scr, "[data-i]", "click", function () {
        if (phase !== "input") return;
        var i = +this.getAttribute("data-i");
        var k = sel.indexOf(i);
        if (k >= 0) { sel.splice(k, 1); this.classList.remove("sel"); }
        else if (sel.length < N) { sel.push(i); this.classList.add("sel"); }
        UI.vibrate(8);
      });
      $("#ok").addEventListener("click", function () {
        if (phase !== "input") return;
        if (sel.length !== N) return UI.toast("Нужно " + N + " клеток");
        var okAll = sel.every(function (i) { return lit.indexOf(i) >= 0; });
        if (okAll) { best = Math.max(best, N); N++; errorsAtN = 0; }
        else { errorsAtN++; }
        if (errorsAtN >= 2 || N > 12) { done(best); return; }
        phase = "show";
        $("#hint").textContent = okAll ? "Верно!" : "Мимо, ещё раз";
        setTimeout(function () { UI.go("_gA"); }, 700);
      });
    });
    UI.go("_gA");
  }
  function pick(total, n) {
    var a = Array.from({ length: total }, function (_, i) { return i; });
    for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, n);
  }

  /* --- Игра B: Цель --- */
  var GAME_B_MS = 90000;
  function gameB(done) {
    var shapes = ["circle", "square", "triangle", "star"];
    var log = [];          // {isTarget, hit}
    var t0 = Date.now(), timer = null, showTimer = null, cur = null, answered = false;

    UI.route("_gB", function (scr) {
      scr.innerHTML = '<p class="sub center-text">Нажимай только на ★</p>' +
        '<div class="gamebox" id="zone" style="cursor:pointer"><div class="shape" id="sh"></div>' +
        '<div class="sub" id="left"></div></div>';
      $("#zone").addEventListener("pointerdown", function () {
        if (!cur || answered) return;
        answered = true;
        log.push({ isTarget: cur === "star", hit: true });
        UI.vibrate(8);
        $("#sh").style.opacity = ".35";
      });
      loop();
      timer = setInterval(function () {
        var left = Math.max(0, GAME_B_MS - (Date.now() - t0));
        var el = $("#left");
        if (el) el.textContent = Math.ceil(left / 1000) + " сек";
        if (left <= 0) finish();
      }, 200);
    });

    function loop() {
      if (Date.now() - t0 >= GAME_B_MS) return finish();
      cur = Math.random() < 0.25 ? "star" : shapes[(Math.random() * 3) | 0];
      answered = false;
      var el = $("#sh");
      if (!el) return;
      el.style.opacity = "1";
      el.innerHTML = shapeSvg(cur);
      showTimer = setTimeout(function () {
        if (!answered) log.push({ isTarget: cur === "star", hit: false });
        cur = null;
        var e2 = $("#sh"); if (e2) e2.innerHTML = "";
        showTimer = setTimeout(loop, 400 + Math.random() * 400);
      }, 800);
    }

    function finish() {
      clearInterval(timer); clearTimeout(showTimer);
      var n = log.length || 1;
      function accOf(arr) {
        if (!arr.length) return 0;
        var good = arr.filter(function (x) { return (x.isTarget && x.hit) || (!x.isTarget && !x.hit); }).length;
        return good / arr.length;
      }
      var acc = accOf(log);
      var third = Math.max(1, Math.floor(n / 3));
      var acc1 = accOf(log.slice(0, third));
      var acc3 = accOf(log.slice(-third));
      var score = clamp(acc * 100 - Math.max(0, acc1 - acc3) * 50, 0, 100);
      done({ score: score, acc: acc, acc1: acc1, acc3: acc3, n: n });
    }
    UI.go("_gB");
  }
  function shapeSvg(kind) {
    var col = "var(--accent)";
    if (kind === "circle") return '<svg viewBox="0 0 100 100" width="110" height="110"><circle cx="50" cy="50" r="40" fill="' + col + '"/></svg>';
    if (kind === "square") return '<svg viewBox="0 0 100 100" width="110" height="110"><rect x="12" y="12" width="76" height="76" rx="10" fill="' + col + '"/></svg>';
    if (kind === "triangle") return '<svg viewBox="0 0 100 100" width="110" height="110"><path d="M50 10 L92 88 H8 Z" fill="' + col + '"/></svg>';
    return '<svg viewBox="0 0 100 100" width="110" height="110"><path d="M50 6 61 38 95 38 67 58 78 90 50 70 22 90 33 58 5 38 39 38 Z" fill="#F5A623"/></svg>';
  }

  /* --- Игра C: Реакция --- */
  function gameC(done) {
    var tries = [], falseStarts = 0, waiting = false, shownAt = 0, to = null;
    UI.route("_gC", function (scr) {
      scr.innerHTML = '<p class="sub center-text">Попытка ' + (tries.length + 1) + " из 10</p>" +
        '<div class="tapzone" id="z">Жди сигнала…</div>' +
        '<div class="spacer"></div><p class="sub center-text">Нажимай, как только экран станет цветным</p>';
      var z = $("#z");
      schedule();
      z.addEventListener("pointerdown", function () {
        if (!waiting && !shownAt) {   // фальстарт
          clearTimeout(to);
          falseStarts++;
          z.textContent = falseStarts >= 3 ? "Считаем как медленную" : "Рано! Ещё раз";
          if (falseStarts >= 3) { tries.push(500); falseStarts = 0; }
          setTimeout(function () { UI.go("_gC"); }, 800);
          return;
        }
        if (shownAt) {
          var rt = Date.now() - shownAt;
          shownAt = 0;
          tries.push(rt);
          z.classList.remove("go");
          z.textContent = rt + " мс";
          UI.vibrate(10);
          setTimeout(function () {
            if (tries.length >= 10) {
              var a = tries.slice().sort(function (x, y) { return x - y; });
              var med = a.length % 2 ? a[(a.length - 1) / 2] : Math.round((a[a.length / 2 - 1] + a[a.length / 2]) / 2);
              done(med);
            } else UI.go("_gC");
          }, 650);
        }
      });
      function schedule() {
        waiting = true; shownAt = 0;
        to = setTimeout(function () {
          waiting = false; shownAt = Date.now();
          var zz = $("#z"); if (!zz) return;
          zz.classList.add("go"); zz.textContent = "ЖМИ!";
        }, 1500 + Math.random() * 2500);
      }
    });
    UI.go("_gC");
  }

  global.Tests = { TEST_META: TEST_META, startAttention: startAttention };
})(typeof window !== "undefined" ? window : globalThis);

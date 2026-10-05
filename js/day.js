/* ==========================================================================
   КВИНТ — вечерняя отметка дня (п. 4.4)
   Пошаговая форма: сон → действия → усталость → фокус → итог эмоций →
   привычки → готово. Пропускать можно всё, кроме усталости и сна.
   ========================================================================== */
(function (global) {
  "use strict";
  var S = global.Store, E = global.Engine, C = global.KvintContent, UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, on = UI.on;

  var step = 0, draft = null, editDate = null;

  function initDraft(date) {
    editDate = date;
    var ex = S.getDay(date);
    draft = ex ? JSON.parse(JSON.stringify(ex)) : S.emptyDay(date);
    if (draft.fatigue == null) draft.fatigue = 40;
    if (draft.sleepHours == null) draft.sleepHours = 8;
    if (draft.focus == null) draft.focus = 3;
    draft.emotionFinalTouched = ex ? (ex.emotionFinal !== ex.emotionCalc) : false;
    step = 0;
  }

  var STEPS = ["sleep", "actions", "fatigue", "focus", "emotion", "habits", "done"];

  UI.route("dayEntry", function (scr, params) {
    if (!draft || (params && params.restart)) {
      initDraft((params && params.date) || S.today());
    }
    var name = STEPS[step];
    scr.innerHTML = header() + '<div id="body"></div>' + footer();
    renderers[name]($("#body"));
    var b = $("#backStep"); if (b) b.addEventListener("click", prev);
    var n = $("#nextStep"); if (n) n.addEventListener("click", next);
    var sk = $("#skipStep"); if (sk) sk.addEventListener("click", function () { step++; UI.go("dayEntry"); });
  });

  function header() {
    var d = UI.dots(STEPS.length - 1, Math.min(step, STEPS.length - 2));
    var dateLbl = editDate === S.today() ? "Сегодня" :
      (editDate === S.addDays(S.today(), -1) ? "Вчера" : editDate);
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">' +
      '<button class="btn ghost small" id="backStep">' + (step === 0 ? "Выйти" : "Назад") + "</button>" +
      '<div class="grow sub" style="flex:1;text-align:center">' + dateLbl + "</div>" +
      '<div style="width:72px"></div></div>' + d;
  }
  function footer() {
    if (STEPS[step] === "done") return "";
    var canSkip = ["actions", "focus", "emotion", "habits"].indexOf(STEPS[step]) >= 0;
    return '<div class="spacer"></div><button class="btn" id="nextStep">Далее</button>' +
      (canSkip ? '<div class="spacer"></div><button class="btn ghost" id="skipStep">Пропустить</button>' : "");
  }
  function prev() {
    if (step === 0) { draft = null; UI.go("home"); return; }
    step--; UI.go("dayEntry");
  }
  function next() {
    if (STEPS[step] === "emotion") {
      // итог эмоций фиксируется из поля
      var v = parseInt($("#emoFinal").getAttribute("data-v"), 10);
      draft.emotionFinal = v;
    }
    step++;
    if (STEPS[step] === "done") save();
    UI.go("dayEntry");
  }

  /* ---------------- шаги ---------------- */
  var renderers = {};

  renderers.sleep = function (b) {
    var n = E.norm();
    b.innerHTML =
      "<h1>Сколько ты спал прошлой ночью?</h1>" +
      '<p class="sub">Твоя норма — ' + n.min + "–" + n.max + " часов.</p><div class=\"spacer\"></div>" +
      '<div class="card center-text"><div style="font-size:42px;font-weight:700" id="shv">' + fmtH(draft.sleepHours) + "</div>" +
      '<div class="sub" id="shn"></div>' +
      '<input type="range" min="0" max="14" step="0.5" value="' + draft.sleepHours + '" id="sh"></div>' +
      '<div class="card"><div class="sub" style="margin-bottom:8px">Качество сна — по желанию</div>' +
      '<div class="chips" id="sq">' + [1, 2, 3, 4, 5].map(function (v) {
        return '<button class="chip' + (draft.sleepQuality === v ? " on" : "") + '" data-q="' + v + '">' +
               "★".repeat(v) + "</button>";
      }).join("") + "</div></div>";
    function upd() {
      $("#shv").textContent = fmtH(draft.sleepHours);
      var txt = E.isUndersleep(draft.sleepHours) ? "Меньше нормы" :
        E.sleepInNorm(draft.sleepHours) ? "В норме ✓" : "Больше нормы";
      $("#shn").textContent = txt;
    }
    upd();
    $("#sh").addEventListener("input", function () { draft.sleepHours = parseFloat(this.value); upd(); });
    on(b, "#sq .chip", "click", function () {
      var v = parseInt(this.getAttribute("data-q"), 10);
      draft.sleepQuality = draft.sleepQuality === v ? null : v;
      $$("#sq .chip").forEach(function (c) { c.classList.remove("on"); });
      if (draft.sleepQuality) this.classList.add("on");
    });
  };
  function fmtH(h) {
    var i = Math.floor(h), m = Math.round((h - i) * 60);
    return i + " ч" + (m ? " " + m + " мин" : "");
  }

  renderers.actions = function (b) {
    var s = S.get();
    var visible = s.actions.filter(function (a) { return !a.hidden; });
    b.innerHTML =
      "<h1>Что было сегодня?</h1><p class=\"sub\">Нажимай на то, что было. Потом укажи, сколько заняло и как ощущалось.</p>" +
      '<div class="spacer"></div><div class="chips" id="pool">' +
      visible.map(function (a) {
        var on_ = draft.actions.some(function (x) { return x.actionId === a.id; });
        return '<button class="chip' + (on_ ? " on" : "") + '" data-a="' + a.id + '">' + a.icon + " " + esc(a.name) + "</button>";
      }).join("") +
      '<button class="chip" id="addAction">+ Новое</button></div>' +
      '<div class="spacer"></div><div id="picked"></div>';
    renderPicked();
    on(b, "#pool .chip[data-a]", "click", function () {
      var id = this.getAttribute("data-a");
      var i = draft.actions.findIndex(function (x) { return x.actionId === id; });
      if (i >= 0) { draft.actions.splice(i, 1); this.classList.remove("on"); }
      else { draft.actions.push({ actionId: id, durationHours: "1-3", emotion: 0 }); this.classList.add("on"); }
      renderPicked();
    });
    $("#addAction").addEventListener("click", addActionSheet);

    function renderPicked() {
      var box = $("#picked");
      if (!draft.actions.length) { box.innerHTML = '<p class="sub center-text">Пока ничего не выбрано</p>'; return; }
      box.innerHTML = draft.actions.map(function (a, idx) {
        var act = S.actionById(a.actionId) || { name: a.actionId, icon: "•" };
        return '<div class="card tight"><div class="row" style="padding:0 0 10px;border:none">' +
          '<span class="ic">' + act.icon + '</span><div class="grow"><b>' + esc(act.name) + "</b></div></div>" +
          '<div class="chips" data-dur="' + idx + '" style="margin-bottom:10px">' +
          ["<1", "1-3", "3-5", "5+"].map(function (d) {
            var lbl = { "<1": "меньше часа", "1-3": "1–3 ч", "3-5": "3–5 ч", "5+": "5 ч и больше" }[d];
            return '<button class="chip' + (a.durationHours === d ? " on" : "") + '" data-d="' + d + '">' + lbl + "</button>";
          }).join("") + "</div>" +
          '<div class="sub" style="display:flex;justify-content:space-between"><span>😣</span>' +
          '<span id="em' + idx + '">' + (a.emotion > 0 ? "+" : "") + a.emotion + "</span><span>😄</span></div>" +
          '<input type="range" min="-5" max="5" step="1" value="' + a.emotion + '" data-emo="' + idx + '">' +
          "</div>";
      }).join("");
      on(box, "[data-dur] .chip", "click", function () {
        var idx = +this.parentNode.getAttribute("data-dur");
        draft.actions[idx].durationHours = this.getAttribute("data-d");
        $$(".chip", this.parentNode).forEach(function (c) { c.classList.remove("on"); });
        this.classList.add("on");
      });
      on(box, "[data-emo]", "input", function () {
        var idx = +this.getAttribute("data-emo");
        var v = parseInt(this.value, 10);
        draft.actions[idx].emotion = v;
        $("#em" + idx).textContent = (v > 0 ? "+" : "") + v;
      });
    }

    function addActionSheet() {
      UI.sheet("<h2>Новое действие</h2>" +
        '<div class="field"><label>Название</label><input class="input" id="na" maxlength="30" placeholder="Например, репетитор"></div>' +
        '<div class="field"><label>Категория</label><div class="chips" id="nc">' +
        Object.keys(C.CATEGORIES).map(function (k, i) {
          return '<button class="chip' + (i === 0 ? " on" : "") + '" data-c="' + k + '">' + C.CATEGORIES[k] + "</button>";
        }).join("") + "</div></div>" +
        '<button class="btn" id="saveA">Добавить</button>',
        function (el, close) {
          on(el, "#nc .chip", "click", function () {
            $$("#nc .chip", el).forEach(function (c) { c.classList.remove("on"); });
            this.classList.add("on");
          });
          $("#saveA", el).addEventListener("click", function () {
            var nm = $("#na", el).value.trim();
            if (nm.length < 2) return UI.toast("Слишком коротко");
            var cat = $("#nc .chip.on", el).getAttribute("data-c");
            var st = S.get();
            var id = S.uid("a");
            st.actions.push({ id: id, name: nm, category: cat, icon: "•", isDefault: false, hidden: false });
            S.save();
            draft.actions.push({ actionId: id, durationHours: "1-3", emotion: 0 });
            close(); UI.go("dayEntry");
          });
        });
    }
  };

  renderers.fatigue = function (b) {
    var v = Math.round(draft.fatigue / 10);
    b.innerHTML =
      "<h1>Насколько ты устал сегодня?</h1><div class=\"spacer\"></div>" +
      '<div class="card center-text"><div style="font-size:56px" id="wi"></div>' +
      '<div style="font-size:34px;font-weight:700" id="fv"></div>' +
      '<div class="sub" id="fn"></div>' +
      '<input type="range" min="0" max="10" step="1" value="' + v + '" id="fs">' +
      '<div class="sub" style="display:flex;justify-content:space-between"><span>бодр</span><span>выжат</span></div></div>';
    function upd() {
      var w = E.weatherFor(draft.fatigue);
      $("#wi").textContent = w.icon;
      $("#fv").textContent = draft.fatigue;
      $("#fn").textContent = w.title;
    }
    upd();
    $("#fs").addEventListener("input", function () { draft.fatigue = parseInt(this.value, 10) * 10; upd(); });
  };

  renderers.focus = function (b) {
    b.innerHTML =
      "<h1>Насколько день был в фокусе?</h1><p class=\"sub\">Про собранность, а не про количество дел.</p>" +
      '<div class="spacer"></div><div id="fo">' +
      ["Раздёргался совсем", "Часто отвлекался", "По-разному", "В основном собран", "Был собран"].map(function (l, i) {
        return '<button class="card tap" data-f="' + (i + 1) + '" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center' +
          (draft.focus === i + 1 ? ";outline:2px solid var(--accent)" : "") + '">' +
          '<span class="ic">' + (i + 1) + "</span><span>" + l + "</span></button>";
      }).join("") + "</div>";
    on(b, "[data-f]", "click", function () {
      draft.focus = parseInt(this.getAttribute("data-f"), 10);
      UI.go("dayEntry");
    });
  };

  renderers.emotion = function (b) {
    draft.loadHours = E.loadHours(draft);
    var calc = E.emotionCalc(draft);
    draft.emotionCalc = calc;
    var cur = draft.emotionFinalTouched && draft.emotionFinal != null ? draft.emotionFinal : calc;
    b.innerHTML =
      "<h1>Как в итоге день по ощущениям?</h1>" +
      '<p class="sub">Посчитано по действиям: ' + (calc > 0 ? "+" : "") + calc + ". Можешь поправить, если чувствуешь иначе.</p>" +
      '<div class="spacer"></div>' +
      '<div class="card center-text"><div style="font-size:44px;font-weight:700" id="emoFinal" data-v="' + cur + '">' +
      (cur > 0 ? "+" : "") + cur + "</div>" +
      '<div class="sub" id="emoLbl"></div>' + UI.emotionScale(cur) +
      '<input type="range" min="-10" max="10" step="1" value="' + cur + '" id="es">' +
      '<div class="sub" style="display:flex;justify-content:space-between"><span>тяжело</span><span>покой</span><span>отлично</span></div></div>';
    function lbl(v) {
      if (Math.abs(v) <= 3) return "В балансе";
      return v > 0 ? "Сильный подъём" : "Тяжёлый день";
    }
    $("#emoLbl").textContent = lbl(cur);
    $("#es").addEventListener("input", function () {
      var v = parseInt(this.value, 10);
      draft.emotionFinalTouched = true;
      var n = $("#emoFinal");
      n.setAttribute("data-v", v);
      n.textContent = (v > 0 ? "+" : "") + v;
      $("#emoLbl").textContent = lbl(v);
      var pct = Math.abs(v) / 10 * 50;
      var fill = b.querySelector(".escale .fill");
      fill.style.cssText = v >= 0 ? "left:50%;right:auto;width:" + pct + "%" : "right:50%;left:auto;width:" + pct + "%";
    });
  };

  renderers.habits = function (b) {
    var s = S.get();
    var list = s.habits.filter(function (h) { return !h.archived && dueToday(h); });
    if (!list.length) {
      b.innerHTML = "<h1>Привычки</h1><p class=\"sub\">Пока ни одной привычки нет. Их можно завести во вкладке «Привычки».</p>";
      return;
    }
    b.innerHTML = "<h1>Отметь привычки</h1><div class=\"spacer\"></div><div class=\"card\">" +
      list.map(function (h) {
        var done = !!s.habitLogs[h.id + "|" + editDate];
        return '<div class="row"><span class="ic">' + h.icon + "</span>" +
          '<div class="grow">' + esc(h.name) + "</div>" +
          '<button class="check' + (done ? " on" : "") + '" data-h="' + h.id + '"></button></div>';
      }).join("") + "</div>";
    on(b, "[data-h]", "click", function () {
      var id = this.getAttribute("data-h");
      var k = id + "|" + editDate;
      var st = S.get();
      if (st.habitLogs[k]) delete st.habitLogs[k]; else st.habitLogs[k] = true;
      S.save();
      this.classList.toggle("on");
      UI.vibrate();
    });
  };
  function dueToday(h) {
    if (!h.schedule || h.schedule === "daily") return true;
    var d = S.parseYmd(editDate).getDay();
    return h.schedule.indexOf(d) >= 0;
  }

  renderers.done = function (b) {
    var s = S.get();
    var pts = s.points[editDate] || { total: 0, lines: {} };
    var R = E.POINT_RULES;
    b.innerHTML =
      '<div class="center-text"><h1>День отмечен</h1><p class="sub">Персонаж обновился</p></div>' +
      '<div class="scene" style="height:30vh">' + global.Character.render(s.character, { weather: E.weatherFor(draft.fatigue).code }) + "</div>" +
      '<div class="card"><div class="row" style="padding-top:0"><div class="grow"><b>Начислено</b></div>' +
      '<b style="font-size:20px">+' + pts.total + "</b></div>" +
      Object.keys(pts.lines).map(function (k) {
        return '<div class="row"><div class="grow sub">' + ((R[k] && R[k].label) || k) + "</div><span>+" + pts.lines[k] + "</span></div>";
      }).join("") + "</div>" +
      '<div class="card tight"><div class="row" style="padding:6px 0;border:none">' +
      '<span class="ic">🔥</span><div class="grow">Огонёк</div><b>' + s.progress.streakCurrent + " дн.</b></div></div>" +
      '<button class="btn" id="fin">На главный</button>';
    $("#fin").addEventListener("click", function () { draft = null; UI.go("home"); });
    setTimeout(UI.celebrate, 180);
  };

  function save() {
    draft.loadHours = E.loadHours(draft);
    var res = E.saveDayEntry(editDate, {
      sleepHours: draft.sleepHours,
      sleepQuality: draft.sleepQuality,
      actions: draft.actions,
      fatigue: draft.fatigue,
      focus: draft.focus,
      emotionFinal: draft.emotionFinalTouched ? draft.emotionFinal : null
    });
    E.updateQuestLevel();
    if (res.achievements && res.achievements.length) {
      var a = C.ACHIEVEMENTS.filter(function (x) { return x.code === res.achievements[0]; })[0];
      if (a) setTimeout(function () { UI.toast(a.icon + " Достижение: " + a.title, 3000); }, 900);
    }
    UI.vibrate(25);
  }

  global.DayEntry = { initDraft: initDraft };
})(typeof window !== "undefined" ? window : globalThis);

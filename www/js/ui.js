/* ==========================================================================
   КВИНТ — ядро интерфейса: роутер, помощники, главный экран, онбординг
   ========================================================================== */
(function (global) {
  "use strict";
  var S = global.Store, E = global.Engine, A = global.Analytics,
      C = global.KvintContent, Ch = global.Character;

  var UI = {};
  var routes = {};
  var current = null;

  /* ---------- помощники ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function on(root, sel, ev, fn) {
    $$(sel, root).forEach(function (n) { n.addEventListener(ev, fn); });
  }
  function toast(msg, ms) {
    var t = $("#toast");
    t.textContent = msg; t.classList.add("on");
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove("on"); }, ms || 2200);
  }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms || 12); } catch (e) {} }

  function sheet(html, onReady) {
    var back = document.createElement("div");
    back.className = "sheet-back";
    back.innerHTML = '<div class="sheet"><div class="grabber"></div>' + html + "</div>";
    document.body.appendChild(back);
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    function close() { back.remove(); }
    if (onReady) onReady(back, close);
    return { el: back, close: close };
  }

  function route(name, fn) { routes[name] = fn; }
  function go(name, params) {
    current = { name: name, params: params || {} };
    var fn = routes[name];
    var scr = $("#screen");
    scr.scrollTop = 0;
    scr.className = "";
    scr.innerHTML = "";
    if (fn) fn(scr, current.params);
    scr.classList.add("fade-in");
    renderNav(name);
  }
  function refresh() { if (current) go(current.name, current.params); }

  /* ---------- нижняя навигация ---------- */
  var NAV = [
    { id: "home",   label: "Главная",  icon: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>' },
    { id: "tests",  label: "Тесты",    icon: '<path d="M9 3h6"/><path d="M10 3v6L5 19a2 2 0 002 2h10a2 2 0 002-2l-5-10V3"/>' },
    { id: "day",    label: "День",     center: true, icon: '<path d="M12 5v14M5 12h14"/>' },
    { id: "habits", label: "Привычки", icon: '<path d="M20 6L9 17l-5-5"/>' },
    { id: "stats",  label: "Аналитика",icon: '<path d="M3 20h18"/><path d="M6 16v-5M11 16V7M16 16v-8"/>' }
  ];
  function renderNav(active) {
    var n = $("#nav");
    var s = S.get();
    if (!s.user.onboarded) { n.classList.add("hidden"); return; }
    n.classList.remove("hidden");
    n.innerHTML = NAV.map(function (t) {
      var on = t.id === active || (active === "dayEntry" && t.id === "day");
      if (t.center) {
        return '<button class="navbtn center" data-go="' + t.id + '"><span class="circle">' +
               '<svg viewBox="0 0 24 24">' + t.icon + '</svg></span><span>' + t.label + '</span></button>';
      }
      return '<button class="navbtn' + (on ? " active" : "") + '" data-go="' + t.id + '">' +
             '<svg viewBox="0 0 24 24">' + t.icon + '</svg><span>' + t.label + '</span></button>';
    }).join("");
    on(n, "[data-go]", "click", function () {
      var id = this.getAttribute("data-go");
      vibrate();
      go(id === "day" ? "dayEntry" : id);
    });
  }

  /* ---------- палитра ---------- */
  function applyPalette() {
    var s = S.get();
    var key = s.user.palette || "calm";
    var mode = s.user.themeMode || "system";
    if (mode === "dark") key = "dark";
    else if (mode === "system" && window.matchMedia &&
             window.matchMedia("(prefers-color-scheme: dark)").matches && key === "calm") key = "dark";
    var p = C.PALETTES[key] || C.PALETTES.calm;
    var r = document.documentElement.style;
    r.setProperty("--bg", p.bg); r.setProperty("--card", p.card);
    r.setProperty("--text", p.text); r.setProperty("--text2", p.text2);
    r.setProperty("--accent", p.accent); r.setProperty("--attention", p.attention);
    r.setProperty("--health", p.health); r.setProperty("--time", p.time);
    r.setProperty("--fatigue", p.fatigue); r.setProperty("--emotion", p.emotion);
    r.setProperty("--line", p.line);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", p.bg);
  }

  /* ---------- общие кусочки разметки ---------- */
  function pillarRow(key) {
    var s = S.get();
    var meta = C.PILLAR_META[key];
    var v = s.pillars[key];
    var hist = s.pillarHistory;
    var old = null;
    for (var i = hist.length - 1; i >= 0; i--) {
      if (S.daysBetween(hist[i].date, S.today()) >= 7) { old = hist[i][key]; break; }
    }
    var arrow = "", acls = "";
    if (v != null && old != null) {
      var d = v - old;
      if (d > 1.5) { arrow = "↑"; acls = "up"; }
      else if (d < -1.5) { arrow = "↓"; acls = "down"; }
      else { arrow = "→"; acls = "flat"; }
    }
    var col = "var(--" + meta.colorToken + ")";
    if (v == null) {
      return '<div class="pillar dashed" data-pillar="' + key + '">' +
        '<span class="nm">' + meta.title + '</span>' +
        '<span class="bar"></span>' +
        '<span class="val sub" style="width:auto">пройди тест</span></div>';
    }
    var arrowColor = acls === "up" ? "var(--health)" : acls === "down" ? "#C96A6A" : "var(--text2)";
    return '<div class="pillar" data-pillar="' + key + '">' +
      '<span class="nm">' + meta.title + (s.provisional[key] ? ' <span class="sub">·</span>' : "") + '</span>' +
      '<span class="bar"><i style="width:' + Math.round(v) + '%;background:' + col + '"></i></span>' +
      '<span class="val">' + Math.round(v) + '</span>' +
      '<span class="arrow" style="color:' + arrowColor + '">' + arrow + "</span></div>";
  }

  function emotionScale(v) {
    var pct = Math.abs(v) / 10 * 50;
    var style = v >= 0 ? "left:50%;width:" + pct + "%" : "right:50%;width:" + pct + "%";
    return '<div class="escale"><span class="zero"></span><span class="fill" style="' + style + '"></span></div>';
  }

  function scene(opts) {
    opts = opts || {};
    var s = S.get();
    var last = S.getDay(S.today()) || lastDayWithFatigue();
    var w = last && last.fatigue != null ? E.weatherFor(last.fatigue) : C.WEATHER[1];
    var svg = Ch.render(s.character, { weather: w.code });
    return '<div class="scene" id="scene">' + svg +
           '<div class="caption">' + esc(w.caption) + "</div></div>";
  }
  function lastDayWithFatigue() {
    var list = S.dayList();
    for (var i = list.length - 1; i >= 0; i--) if (list[i].fatigue != null) return list[i];
    return null;
  }

  /* =======================================================================
     ГЛАВНЫЙ ЭКРАН (п. 4.2)
     ======================================================================= */
  route("home", function (scr) {
    var s = S.get();
    E.expireQuests();
    E.recalcStreak();
    A.finishExperimentIfDue();
    var cup = E.nextCup();
    var todayEntry = S.getDay(S.today());
    var quests = E.questsForDate(S.today());
    if (!quests.length) quests = E.pickQuestsForToday();
    var dayQuest = quests.filter(function (q) { return q.status === "active"; })[0] || quests[0];

    var disc = A.visibleDiscoveries()[0];
    var enough = A.enoughData();

    var last = S.getDay(S.today()) || lastDayWithFatigue();
    var fatigue = last && last.fatigue != null ? last.fatigue : null;
    var emo = last ? (last.emotionFinal || 0) : 0;
    var w = fatigue != null ? E.weatherFor(fatigue) : C.WEATHER[1];

    var hour = new Date().getHours();

    var html = "";
    /* верхняя строка */
    html += '<div class="topbar">' +
      '<div class="streak"><span class="flame">' + (s.progress.streakCurrent >= 30 ? "🔥" : s.progress.streakCurrent >= 7 ? "🔥" : "✨") +
      '</span><span>' + s.progress.streakCurrent + "</span></div>" +
      '<div class="cuprow"><div class="line"><span>' + cup.current.icon + "</span><span>" +
      (cup.next ? "до " + (cup.next.gen || cup.next.title) + " " + cup.percent + "%" : "Максимум") +
      '</span></div><div class="cupbar"><i style="width:' + (cup.next ? cup.percent : 100) + '%"></i></div></div>' +
      '<button class="avatarbtn" id="toProfile">' + Ch.portrait(s.character) + "</button></div>";

    /* сцена */
    html += scene();

    /* опоры */
    html += '<div class="card tight">' + pillarRow("attention") + pillarRow("health") + pillarRow("time") + "</div>";

    /* состояния */
    html += '<div class="states">' +
      '<div class="state"><div class="lbl">Усталость</div><div class="big">' +
        (fatigue != null ? fatigue : "—") + ' <span style="font-size:18px">' + w.icon + "</span></div></div>" +
      '<div class="state"><div class="lbl">Эмоции</div><div class="big">' +
        (emo > 0 ? "+" : "") + emo + "</div>" + emotionScale(emo) + "</div></div>";

    /* открытие */
    if (disc) {
      html += '<div class="card tap" id="discCard"><div class="row" style="padding-top:0;border:none">' +
        '<span class="ic">💡</span><div class="grow"><b>Открытие</b>' +
        '<div class="sub">уверенность: ' + disc.confidence.title + "</div></div></div>" +
        "<div>" + esc(disc.text) + "</div></div>";
    } else {
      html += '<div class="card"><div class="row" style="padding-top:0;border:none">' +
        '<span class="ic">🧩</span><div class="grow"><b>Собираю твой узор</b>' +
        '<div class="sub">' + (enough.ok ? "Первое открытие уже скоро" :
          "Отмечено " + enough.have + " из " + enough.need + ". Осталось " + (enough.need - enough.have) + " " + C.plural(enough.need - enough.have, "день", "дня", "дней")) +
        "</div></div></div></div>";
    }

    /* квест дня */
    if (dayQuest) {
      var done = dayQuest.status === "done";
      html += '<div class="card"><div class="row" style="padding:0;border:none">' +
        '<span class="ic">🎯</span><div class="grow"><b>Квест дня</b>' +
        '<div class="sub ellipsis">' + esc(dayQuest.title) + "</div></div>" +
        '<button class="btn small ' + (done ? "ghost" : "soft") + '" data-quest="' + dayQuest.id + '">' +
        (done ? "Готово ✓" : "Выполнено") + "</button></div></div>";
    }

    /* кнопка отметки */
    if (!todayEntry) {
      html += '<button class="btn' + (hour >= 18 ? " pulse" : "") + '" id="markDay">Отметить день</button>';
    } else {
      html += '<div class="card center-text"><b>День отмечен ✓</b>' +
        '<div class="sub">Можно поправить до конца завтрашнего дня</div>' +
        '<div class="spacer"></div><button class="btn ghost small" id="editDay">Изменить</button></div>';
    }
    html += '<div class="spacer"></div>';

    scr.innerHTML = html;

    $("#toProfile").addEventListener("click", function () { go("profile"); });
    var md = $("#markDay"); if (md) md.addEventListener("click", function () { go("dayEntry"); });
    var ed = $("#editDay"); if (ed) ed.addEventListener("click", function () { go("dayEntry"); });
    var dc = $("#discCard"); if (dc) dc.addEventListener("click", function () { go("stats"); });
    on(scr, "[data-pillar]", "click", function () { go("stats", { pillar: this.getAttribute("data-pillar") }); });
    on(scr, "[data-quest]", "click", function () {
      var id = this.getAttribute("data-quest");
      var q = S.get().quests.filter(function (x) { return x.id === id; })[0];
      if (!q || q.status === "done") return;
      q.status = "done"; q.completedAt = new Date().toISOString();
      S.save();
      E.recalcStreak(); E.recalcDayPoints(S.today()); E.checkAchievements();
      vibrate(20); toast("Квест выполнен · +5 баллов");
      celebrate();
      setTimeout(refresh, 420);
    });
  });

  function celebrate() {
    var sc = $("#scene");
    if (!sc) return;
    var g = sc.querySelector("svg > g");
    if (!g) return;
    g.classList.remove("breathe"); g.classList.add("char-happy");
    setTimeout(function () { g.classList.add("breathe"); g.classList.remove("char-happy"); }, 620);
  }

  /* =======================================================================
     ОНБОРДИНГ (п. 3.3)
     ======================================================================= */
  var onbStep = 0, onbData = {};
  route("onboarding", function (scr) {
    var steps = [stepWelcome, stepForm, stepCharacter, stepQuick, stepDone];
    steps[Math.min(onbStep, steps.length - 1)](scr);
  });

  function dots(n, i) {
    var h = '<div class="dots">';
    for (var k = 0; k < n; k++) h += "<i" + (k === i ? ' class="on"' : "") + "></i>";
    return h + "</div>";
  }

  function stepWelcome(scr) {
    var pages = [
      { em: "🪞", t: "Квинт показывает тебе тебя", d: "Не советы из интернета, а твоя собственная статистика." },
      { em: "🧍", t: "Пять показателей и твой персонаж", d: "Внимание, здоровье, время, усталость и эмоции — живьём, на одном экране." },
      { em: "🌙", t: "Минута в день вечером", d: "Короткая отметка — и приложение само найдёт, что тебя выматывает." }
    ];
    var i = onbData.welcome || 0;
    var p = pages[i];
    scr.innerHTML =
      '<div style="min-height:72vh;display:flex;flex-direction:column;justify-content:center;text-align:center;gap:14px">' +
      '<div style="font-size:72px">' + p.em + "</div>" +
      "<h1>" + p.t + "</h1><p class=\"muted\">" + p.d + "</p></div>" +
      dots(3, i) +
      '<button class="btn" id="next">' + (i < 2 ? "Дальше" : "Поехали") + "</button>" +
      '<div class="spacer"></div><button class="btn ghost" id="skip">Пропустить</button>';
    $("#next").addEventListener("click", function () {
      if (i < 2) { onbData.welcome = i + 1; go("onboarding"); }
      else { onbStep = 1; go("onboarding"); }
    });
    $("#skip").addEventListener("click", function () { onbStep = 1; go("onboarding"); });
  }

  function stepForm(scr) {
    var s = S.get();
    scr.innerHTML =
      "<h1>Пара слов о тебе</h1><p class=\"sub\">Нужно, чтобы считать нормы сна и собрать персонажа.</p>" +
      '<div class="spacer"></div>' +
      '<div class="field"><label>Как тебя зовут</label><input class="input" id="f_name" maxlength="30" value="' + esc(s.user.name) + '" placeholder="Имя"></div>' +
      '<div class="grid2">' +
        '<div class="field"><label>Возраст</label><input class="input" id="f_age" type="number" inputmode="numeric" min="10" max="99" value="' + (s.user.age || "") + '" placeholder="16"></div>' +
        '<div class="field"><label>Рост, см</label><input class="input" id="f_h" type="number" inputmode="numeric" min="100" max="230" value="' + (s.user.heightCm || "") + '" placeholder="175"></div>' +
      "</div>" +
      '<div class="field"><label>Пол</label><div class="chips" id="f_gender">' +
        ["m|Мужской", "f|Женский", "x|Не указывать"].map(function (g) {
          var p = g.split("|");
          return '<button class="chip' + (s.user.gender === p[0] ? " on" : "") + '" data-g="' + p[0] + '">' + p[1] + "</button>";
        }).join("") + "</div></div>" +
      '<div class="hr"></div>' +
      '<div class="grid2">' +
        '<div class="field"><label>Telegram</label><input class="input" id="f_tg" placeholder="без @" value="' + esc(s.user.tgUsername) + '"></div>' +
        '<div class="field"><label>ВКонтакте</label><input class="input" id="f_vk" placeholder="короткое имя" value="' + esc(s.user.vkUsername) + '"></div>' +
      "</div>" +
      '<p class="sub">Нужно, только если хочешь, чтобы друзья нашли тебя в Квинте. Можно добавить позже.</p>' +
      '<div class="spacer"></div><button class="btn" id="next">Дальше</button>';

    on(scr, "#f_gender .chip", "click", function () {
      $$("#f_gender .chip").forEach(function (c) { c.classList.remove("on"); });
      this.classList.add("on");
    });
    $("#next").addEventListener("click", function () {
      var name = $("#f_name").value.trim();
      var age = parseInt($("#f_age").value, 10);
      var h = parseInt($("#f_h").value, 10);
      var g = ($("#f_gender .chip.on") || {}).getAttribute ? $("#f_gender .chip.on").getAttribute("data-g") : null;
      if (name.length < 2) return toast("Имя — хотя бы 2 символа");
      if (!(age >= 10 && age <= 99)) return toast("Возраст от 10 до 99");
      if (!(h >= 100 && h <= 230)) return toast("Рост от 100 до 230 см");
      if (!g) return toast("Выбери пол");
      var st = S.get();
      st.user.name = name; st.user.age = age; st.user.heightCm = h; st.user.gender = g;
      st.user.tgUsername = $("#f_tg").value.trim().replace(/^@/, "");
      st.user.vkUsername = $("#f_vk").value.trim().replace(/^@/, "");
      /* базовый персонаж по полу и росту */
      st.character.hair = g === "f" ? 2 : 0;
      st.character.build = h > 185 ? 2 : h < 160 ? 0 : 1;
      S.save();
      onbStep = 2; go("onboarding");
    });
  }

  function stepCharacter(scr) {
    var s = S.get();
    scr.innerHTML =
      "<h1>Вот твой персонаж</h1><p class=\"sub\">Он будет показывать твоё состояние каждый день.</p>" +
      '<div class="scene" style="height:46vh">' + Ch.render(s.character, { weather: "sun" }) + "</div>" +
      '<div class="btn-row"><button class="btn ghost" id="later">Позже</button>' +
      '<button class="btn" id="edit">Настроить внешность</button></div>';
    $("#later").addEventListener("click", function () { onbStep = 3; go("onboarding"); });
    $("#edit").addEventListener("click", function () { go("editor", { fromOnboarding: true }); });
  }

  function stepQuick(scr) {
    var i = onbData.qi || 0;
    var q = C.QUICK_QUESTIONS[i];
    onbData.quick = onbData.quick || {};
    scr.innerHTML =
      '<p class="sub">Быстрый замер · ' + (i + 1) + " из 3</p>" +
      "<h1>" + q.q + "</h1>" +
      '<p class="sub">Примерно, по ощущению. Потом уточним полным тестом.</p><div class="spacer"></div>' +
      '<div id="opts">' + [1, 2, 3, 4, 5].map(function (v) {
        var lbl = ["Совсем тяжело", "Скорее тяжело", "Средне", "Скорее легко", "Легко"][v - 1];
        return '<button class="card tap" data-v="' + v + '" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center">' +
               '<span class="ic">' + v + "</span><span>" + lbl + "</span></button>";
      }).join("") + "</div>";
    on(scr, "[data-v]", "click", function () {
      onbData.quick[q.pillar] = parseInt(this.getAttribute("data-v"), 10);
      if (i < 2) { onbData.qi = i + 1; go("onboarding"); }
      else {
        E.applyQuickMeasure(onbData.quick);
        onbStep = 4; go("onboarding");
      }
    });
  }

  function stepDone(scr) {
    var s = S.get();
    s.user.onboarded = true;
    S.save();
    scr.innerHTML =
      '<div class="center-text"><h1>Готово, ' + esc(s.user.name) + "!</h1>" +
      '<p class="sub">Стартовые значения — предварительные. Полные тесты уточнят их.</p></div>' +
      '<div class="scene" style="height:34vh">' + Ch.render(s.character, { weather: "sun" }) + "</div>" +
      '<div class="card tight">' + pillarRow("attention") + pillarRow("health") + pillarRow("time") + "</div>" +
      '<div class="card"><div class="row" style="padding:0;border:none"><span class="ic">🧩</span>' +
      '<div class="grow"><b>Собираю твой узор</b><div class="sub">Первое открытие — через 7 дней отметок</div></div></div></div>' +
      '<button class="btn" id="fin">На главный экран</button>';
    $("#fin").addEventListener("click", function () { renderNav("home"); go("home"); });
  }

  /* экспорт */
  UI.$ = $; UI.$$ = $$; UI.esc = esc; UI.on = on; UI.toast = toast; UI.sheet = sheet;
  UI.route = route; UI.go = go; UI.refresh = refresh; UI.renderNav = renderNav;
  UI.applyPalette = applyPalette; UI.pillarRow = pillarRow; UI.emotionScale = emotionScale;
  UI.scene = scene; UI.dots = dots; UI.vibrate = vibrate; UI.celebrate = celebrate;
  UI.setOnbStep = function (n) { onbStep = n; };
  global.UI = UI;
})(typeof window !== "undefined" ? window : globalThis);

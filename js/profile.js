/* ==========================================================================
   КВИНТ — профиль, кубки и достижения, редактор персонажа, настройки
   Пункты 4.7, 4.9, 4.10 и демо-режим 9.3
   ========================================================================== */
(function (global) {
  "use strict";
  var S = global.Store, E = global.Engine, A = global.Analytics,
      C = global.KvintContent, Ch = global.Character, UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, on = UI.on;

  /* =======================================================================
     Профиль
     ======================================================================= */
  UI.route("profile", function (scr) {
    var s = S.get();
    var cup = E.nextCup();
    scr.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<button class="btn ghost small" id="back">Назад</button><div style="flex:1"></div></div>' +
      '<div class="card center-text"><div style="width:120px;height:120px;margin:0 auto;border-radius:50%;overflow:hidden;background:var(--bg)">' +
      Ch.portrait(s.character) + "</div>" +
      "<h2 style=\"margin-top:10px\">" + esc(s.user.name || "Без имени") + "</h2>" +
      '<div class="sub">' + cup.current.icon + " " + cup.current.title + " · 🔥 " + s.progress.streakCurrent +
      " дн. · лучшая " + s.progress.streakBest + "</div>" +
      '<div class="sub">' + s.progress.totalPoints + " баллов</div></div>" +
      menu([
        ["cups", "🏆", "Кубки и достижения", Object.keys(s.achievements).length + " из " + C.ACHIEVEMENTS.length],
        ["editor", "🧍", "Редактор персонажа", "внешность и одежда"],
        ["friends", "👥", "Друзья", "поиск по юзернейму"],
        ["settings", "⚙️", "Настройки", "палитра, напоминания, данные"]
      ]);
    $("#back").addEventListener("click", function () { UI.go("home"); });
    on(scr, "[data-m]", "click", function () { UI.go(this.getAttribute("data-m")); });
  });

  function menu(items) {
    return '<div class="card">' + items.map(function (i) {
      return '<div class="row" data-m="' + i[0] + '"><span class="ic">' + i[1] + "</span>" +
        '<div class="grow"><b>' + i[2] + "</b><div class=\"sub\">" + i[3] + "</div></div><span class=\"sub\">›</span></div>";
    }).join("") + "</div>";
  }

  /* =======================================================================
     Кубки и достижения (п. 4.7)
     ======================================================================= */
  UI.route("cups", function (scr) {
    var s = S.get();
    var cup = E.nextCup();
    var days = S.dayList();
    var bestDay = Object.keys(s.points).sort(function (a, b) { return s.points[b].total - s.points[a].total; })[0];

    scr.innerHTML = back("Кубки и достижения") +
      '<div class="cupladder">' + C.CUPS.slice(1).map(function (c) {
        var got = s.progress.totalPoints >= c.points && (!c.minActiveDays || s.progress.activeDays >= c.minActiveDays);
        var cur = cup.next && cup.next.code === c.code;
        return '<div class="cupitem' + (got ? " got" : "") + (cur ? " cur" : "") + '">' +
          '<div class="em">' + c.icon + '</div><div class="t">' + c.title + "</div>" +
          '<div class="sub" style="font-size:10px">' + (got ? "получен" : cur ? cup.percent + "%" : c.points + " б.") + "</div></div>";
      }).join("") + "</div>" +
      (cup.next ? '<div class="card tight"><div class="sub">До «' + cup.next.title + "»: " +
        (cup.next.points - s.progress.totalPoints) + " баллов</div>" +
        '<div class="cupbar" style="margin-top:8px"><i style="width:' + cup.percent + '%"></i></div></div>' : "") +
      "<h2>Достижения</h2><div class=\"spacer\"></div>" +
      '<div class="badges">' + C.ACHIEVEMENTS.map(function (a) {
        var got = s.achievements[a.code];
        return '<div class="badge' + (got ? " got" : "") + '"><div class="em">' + a.icon + "</div>" +
          '<div class="t">' + a.title + '</div><div class="c">' + (got ? got : a.cond) + "</div></div>";
      }).join("") + "</div>" +
      "<h2 style=\"margin-top:18px\">Рекорды</h2><div class=\"spacer\"></div>" +
      '<div class="card tight">' +
      rec("Лучший день по баллам", bestDay ? s.points[bestDay].total + " (" + bestDay + ")" : "—") +
      rec("Максимум внимания", maxTest("attention")) +
      rec("Самая длинная серия", s.progress.streakBest + " дн.") +
      rec("Дней с активностью", s.progress.activeDays) +
      rec("Отмечено дней", days.length) + "</div>";
    bindBack();
    function rec(t, v) { return '<div class="row" style="border:none"><div class="grow sub">' + t + "</div><b>" + v + "</b></div>"; }
    function maxTest(type) {
      var m = 0; s.tests.forEach(function (t) { if (t.type === type) m = Math.max(m, t.total); });
      return m || "—";
    }
  });

  /* =======================================================================
     Редактор персонажа (п. 4.9)
     ======================================================================= */
  var editTab = "body";
  UI.route("editor", function (scr, params) {
    var s = S.get();
    var cfg = s.character;
    var TABS = [
      ["body", "Тело"], ["face", "Лицо"], ["hair", "Волосы"],
      ["top", "Верх"], ["bottom", "Низ"], ["shoes", "Обувь"], ["acc", "Аксессуары"]
    ];
    scr.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
      '<button class="btn ghost small" id="back">' + (params && params.fromOnboarding ? "Пропустить" : "Назад") + "</button>" +
      '<div style="flex:1"></div><button class="btn ghost small" id="rnd">Случайно</button></div>' +
      '<div class="scene" style="height:34vh" id="prev">' + Ch.render(cfg, { weather: "sun" }) + "</div>" +
      '<div class="tabs" id="tabs">' + TABS.map(function (t) {
        return '<button class="tab' + (editTab === t[0] ? " on" : "") + '" data-t="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</div>" +
      '<div id="opts"></div><div class="spacer"></div>' +
      '<button class="btn" id="save">Сохранить</button><div class="spacer"></div>';

    renderOpts();
    $("#back").addEventListener("click", function () {
      if (params && params.fromOnboarding) { UI.setOnbStep(3); UI.go("onboarding"); }
      else UI.go("profile");
    });
    $("#rnd").addEventListener("click", function () {
      Object.assign(cfg, Ch.randomConfig()); S.save(); refreshPrev(); renderOpts();
    });
    $("#save").addEventListener("click", function () {
      S.save(); UI.toast("Сохранено");
      if (params && params.fromOnboarding) { UI.setOnbStep(3); UI.go("onboarding"); }
      else UI.go("profile");
    });
    on(scr, "#tabs .tab", "click", function () {
      editTab = this.getAttribute("data-t");
      $$("#tabs .tab").forEach(function (t) { t.classList.remove("on"); });
      this.classList.add("on");
      renderOpts();
    });

    function refreshPrev() { $("#prev").innerHTML = Ch.render(cfg, { weather: "sun" }); }

    function grid(key, labels, cur) {
      return '<div class="optgrid" data-key="' + key + '">' + labels.map(function (l, i) {
        return '<button class="opt' + (cur === i ? " on" : "") + '" data-i="' + i + '">' + esc(typeof l === "string" ? l : l.label) + "</button>";
      }).join("") + "</div>";
    }
    function swatches(key, colors, cur) {
      return '<div class="swatches" data-key="' + key + '">' + colors.map(function (c, i) {
        return '<button class="sw' + (cur === i ? " on" : "") + '" data-i="' + i + '" style="background:' + c + '"></button>';
      }).join("") + "</div>";
    }

    function renderOpts() {
      var box = $("#opts"), h = "";
      if (editTab === "body") {
        h = "<b>Телосложение</b>" + grid("build", Ch.BUILDS, cfg.build) +
            '<div class="spacer"></div><b>Цвет кожи</b>' + swatches("skin", Ch.SKIN, cfg.skin) +
            '<p class="sub">Рост берётся из анкеты: ' + (s.user.heightCm || "—") + " см</p>";
      } else if (editTab === "face") {
        h = "<b>Форма лица</b>" + grid("face", num(Ch.FACES), cfg.face) +
            '<div class="spacer"></div><b>Глаза</b>' + grid("eyes", num(Ch.EYES), cfg.eyes) +
            '<div class="spacer"></div><b>Брови</b>' + grid("brows", num(Ch.BROWS), cfg.brows) +
            '<div class="spacer"></div><b>Нос</b>' + grid("nose", num(Ch.NOSES), cfg.nose) +
            '<div class="spacer"></div><b>Рот</b>' + grid("mouth", num(Ch.MOUTHS), cfg.mouth);
      } else if (editTab === "hair") {
        h = "<b>Причёска</b>" + grid("hair", Ch.HAIRS, cfg.hair) +
            '<div class="spacer"></div><b>Цвет</b>' + swatches("hairColor", Ch.HAIRC, cfg.hairColor);
      } else if (editTab === "top") {
        h = "<b>Верх</b>" + grid("top", Ch.TOPS, cfg.top) +
            '<div class="spacer"></div><b>Цвет</b>' + swatches("topColor", Ch.CLOTH, cfg.topColor);
      } else if (editTab === "bottom") {
        h = "<b>Низ</b>" + grid("bottom", Ch.BOTTOMS, cfg.bottom) +
            '<div class="spacer"></div><b>Цвет</b>' + swatches("bottomColor", Ch.BOTTOM, cfg.bottomColor);
      } else if (editTab === "shoes") {
        h = "<b>Обувь</b>" + grid("shoes", Ch.SHOES, cfg.shoes) +
            '<div class="spacer"></div><b>Цвет</b>' + swatches("shoesColor", Ch.SHOEC, cfg.shoesColor);
      } else {
        h = "<b>Аксессуар</b>" + '<div class="optgrid" data-key="accessory">' +
            '<button class="opt' + (cfg.accessory < 0 ? " on" : "") + '" data-i="-1">Нет</button>' +
            Ch.ACCS.map(function (l, i) {
              return '<button class="opt' + (cfg.accessory === i ? " on" : "") + '" data-i="' + i + '">' + l + "</button>";
            }).join("") + "</div>" +
            '<div class="spacer"></div><b>Цвет</b>' + swatches("accColor", Ch.CLOTH, cfg.accColor || 0);
      }
      box.innerHTML = h;
      on(box, "[data-key] [data-i]", "click", function () {
        var key = this.parentNode.getAttribute("data-key");
        cfg[key] = parseInt(this.getAttribute("data-i"), 10);
        $$("[data-i]", this.parentNode).forEach(function (n) { n.classList.remove("on"); });
        this.classList.add("on");
        refreshPrev();
      });
    }
    function num(n) { return Array.from({ length: n }, function (_, i) { return String(i + 1); }); }
  });

  /* =======================================================================
     Друзья (п. 4.8) — в прототипе поиск-заглушка
     ======================================================================= */
  UI.route("friends", function (scr) {
    scr.innerHTML = back("Друзья") +
      '<div class="field"><label>Поиск по юзернейму Telegram или ВК</label>' +
      '<input class="input" id="fq" placeholder="например, nekitt7"></div>' +
      '<button class="btn" id="fs">Найти</button>' +
      '<div class="spacer"></div><div id="fres"></div>' +
      '<div class="card"><div class="sub">Общего списка пользователей нет: человека можно найти только по точному юзернейму, и только если он разрешил поиск. Это часть приватности по умолчанию.</div></div>';
    bindBack();
    $("#fs").addEventListener("click", function () {
      var q = $("#fq").value.trim().replace(/^@/, "");
      if (q.length < 3) return UI.toast("Минимум 3 символа");
      $("#fres").innerHTML = '<div class="card center-text"><div style="font-size:34px">🔌</div>' +
        "<b>Нужен сервер</b><div class=\"sub\">Поиск друзей работает только с общей базой. Подключим на следующем шаге, вместе с аккаунтами.</div></div>";
    });
  });

  /* =======================================================================
     Настройки (п. 4.10)
     ======================================================================= */
  UI.route("settings", function (scr) {
    var s = S.get();
    scr.innerHTML = back("Настройки") +
      '<div class="card"><b>Аккаунт</b>' +
      '<div class="row"><div class="grow">Имя</div><span class="sub">' + esc(s.user.name) + "</span></div>" +
      '<div class="row"><div class="grow">Возраст</div><span class="sub">' + (s.user.age || "—") + "</span></div>" +
      '<div class="row"><div class="grow">Рост</div><span class="sub">' + (s.user.heightCm || "—") + " см</span></div>" +
      '<div class="row"><div class="grow">Telegram</div><span class="sub">' + (s.user.tgUsername || "не указан") + "</span></div>" +
      '<div class="row"><div class="grow">ВКонтакте</div><span class="sub">' + (s.user.vkUsername || "не указан") + "</span></div>" +
      '<div class="spacer"></div><button class="btn ghost small" id="editProfile">Изменить</button></div>' +

      '<div class="card"><b>Палитра</b><div class="chips" style="margin-top:8px" id="pal">' +
      Object.keys(C.PALETTES).map(function (k) {
        return '<button class="chip' + (s.user.palette === k ? " on" : "") + '" data-pal="' + k + '">' +
          C.PALETTES[k].title + "</button>";
      }).join("") + "</div>" +
      '<div class="spacer"></div><b>Режим</b><div class="chips" style="margin-top:8px" id="mode">' +
      [["light", "Светлый"], ["dark", "Тёмный"], ["system", "Как в системе"]].map(function (m) {
        return '<button class="chip' + (s.user.themeMode === m[0] ? " on" : "") + '" data-mode="' + m[0] + '">' + m[1] + "</button>";
      }).join("") + "</div></div>" +

      '<div class="card"><b>Приватность</b><div class="sub">Что видят друзья</div>' +
      [["showCharacter", "Персонаж"], ["showStreak", "Огонёк"], ["showCup", "Кубок"],
       ["showPillars", "Опоры"], ["showFatigue", "Усталость"], ["showEmotions", "Эмоции"],
       ["showQuests", "Квесты"], ["searchable", "Можно найти по юзернейму"],
       ["acceptQuests", "Принимать квесты от друзей"]].map(function (p) {
        return '<div class="row"><div class="grow">' + p[1] + "</div>" +
          '<button class="check' + (s.privacy[p[0]] ? " on" : "") + '" data-pr="' + p[0] + '"></button></div>';
      }).join("") + "</div>" +

      '<div class="card"><b>Напоминания</b>' +
      '<div class="row"><div class="grow">Вечерняя отметка</div><span class="sub">' + s.reminders.dayMark + "</span>" +
      '<button class="check' + (s.reminders.dayMarkOn ? " on" : "") + '" data-rem="dayMarkOn"></button></div>' +
      '<div class="row"><div class="grow">Квесты</div><button class="check' + (s.reminders.quests ? " on" : "") + '" data-rem="quests"></button></div>' +
      '<div class="row"><div class="grow">Огонёк под угрозой</div><button class="check' + (s.reminders.streakRisk ? " on" : "") + '" data-rem="streakRisk"></button></div>' +
      '<div class="sub">Тихие часы ' + s.reminders.quiet[0] + "–" + s.reminders.quiet[1] +
      ". В прототипе уведомления не отправляются: для них нужен сервер и разрешение системы.</div></div>" +

      '<div class="card"><b>Мои действия</b><div class="sub">Что можно выбрать в вечерней отметке</div>' +
      s.actions.map(function (a) {
        return '<div class="row"><span class="ic">' + a.icon + "</span><div class=\"grow\">" + esc(a.name) + "</div>" +
          '<button class="check' + (!a.hidden ? " on" : "") + '" data-act="' + a.id + '"></button></div>';
      }).join("") + "</div>" +

      '<div class="card"><b>Гайд</b><div class="sub">Как всё устроено и как считается</div>' +
      '<div class="spacer"></div><button class="btn ghost small" id="guide">Открыть</button></div>' +

      '<div class="card"><b>Данные</b>' +
      '<div class="row"><div class="grow">Демо-режим</div>' +
      '<button class="btn small ' + (s.demoMode ? "ghost" : "soft") + '" id="demo">' +
      (s.demoMode ? "Убрать демо-данные" : "Заполнить 28 дней") + "</button></div>" +
      '<div class="sub">Для показа: заполняет историю, чтобы сразу были видны открытия, графики и кубки.</div>' +
      '<div class="spacer"></div><button class="btn ghost small" id="wipe">Удалить все данные</button></div>' +
      '<div class="spacer"></div><p class="sub center-text">Квинт · прототип v0.1</p><div class="spacer"></div>';
    bindBack();

    on(scr, "#pal .chip", "click", function () {
      S.get().user.palette = this.getAttribute("data-pal"); S.save(); UI.applyPalette(); UI.go("settings");
    });
    on(scr, "#mode .chip", "click", function () {
      S.get().user.themeMode = this.getAttribute("data-mode"); S.save(); UI.applyPalette(); UI.go("settings");
    });
    on(scr, "[data-pr]", "click", function () {
      var k = this.getAttribute("data-pr"); var st = S.get();
      st.privacy[k] = !st.privacy[k]; S.save(); this.classList.toggle("on");
    });
    on(scr, "[data-rem]", "click", function () {
      var k = this.getAttribute("data-rem"); var st = S.get();
      st.reminders[k] = !st.reminders[k]; S.save(); this.classList.toggle("on");
    });
    on(scr, "[data-act]", "click", function () {
      var a = S.actionById(this.getAttribute("data-act"));
      a.hidden = !a.hidden; S.save(); this.classList.toggle("on");
    });
    $("#editProfile").addEventListener("click", function () { UI.setOnbStep(1); UI.go("onboarding"); });
    $("#guide").addEventListener("click", openGuide);
    $("#demo").addEventListener("click", function () {
      if (S.get().demoMode) { removeDemo(); UI.toast("Демо-данные удалены"); }
      else { fillDemo(); UI.toast("Заполнено 28 дней"); }
      UI.go("settings");
    });
    $("#wipe").addEventListener("click", function () {
      UI.sheet("<h2>Удалить все данные?</h2><p class=\"sub\">Профиль, отметки, тесты и достижения будут стёрты. Отменить нельзя.</p>" +
        '<div class="spacer"></div><div class="btn-row"><button class="btn ghost" id="no">Отмена</button>' +
        '<button class="btn" id="yes" style="background:#C96A6A">Удалить</button></div>',
        function (el, close) {
          el.querySelector("#no").addEventListener("click", close);
          el.querySelector("#yes").addEventListener("click", function () {
            S.reset(); close(); UI.applyPalette(); UI.setOnbStep(0); UI.go("onboarding");
          });
        });
    });
  });

  function back(title) {
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<button class="btn ghost small" id="back">Назад</button>' +
      '<h2 style="flex:1">' + title + "</h2></div>";
  }
  function bindBack() {
    var b = $("#back"); if (b) b.addEventListener("click", function () { UI.go("profile"); });
  }

  /* ---------------- гайд ---------------- */
  function openGuide() {
    UI.sheet("<h2>Как это считается</h2>" +
      g("Опоры", "Внимание, здоровье и время — медленные показатели 0–100. Их задаёт тест, а каждый день они сдвигаются максимум на ±3 по твоим отметкам: сон в норме, движение, фокус, выполненные квесты и привычки.") +
      g("Усталость", "Ползунок 0–10 превращается в 0–100 и определяет погоду вокруг персонажа. Это состояние дня, оно не копится.") +
      g("Эмоции", "Каждому действию можно поставить оценку от −5 до +5. Их сумма — итог дня, но его всегда можно поправить руками: ты знаешь лучше. Покой — это ноль, а не плюс десять.") +
      g("Открытия", "Раз в неделю приложение берёт последние 28 дней и сравнивает усталость в дни с действием и без него. Если разница больше 8 пунктов и групп хватает — появляется гипотеза. Сон проверяется первым и вычитается из остальных сравнений, чтобы не маскировать другие причины.") +
      g("Эксперимент", "Четыре дня с одним изменением. Если средняя усталость упала хотя бы на 10 пунктов — открытие подтверждается. Если нет — прячется на месяц. Так приложение учится на тебе, без всяких нейросетей.") +
      g("Баллы и кубки", "Баллы начисляются за отметку, огонёк, опоры в норме, квесты и привычки — не больше 100 в день. Баллы никогда не отнимаются. Кубки — это сумма баллов за всё время.") +
      g("Огонёк", "День засчитан, если есть отметка или выполнен квест. Два пропуска в месяц прощаются автоматически."));
    function g(t, d) { return '<div class="card tight"><b>' + t + "</b><div class=\"sub\">" + d + "</div></div>"; }
  }

  /* =======================================================================
     Демо-режим (п. 9.3)
     ======================================================================= */
  function fillDemo() {
    var s = S.get();
    if (!s.user.name) { s.user.name = "Демо"; s.user.age = 16; s.user.heightCm = 172; s.user.gender = "m"; }
    s.user.onboarded = true;
    s.user.createdAt = S.addDays(S.today(), -29);
    s.demoMode = true;
    s.pillars = { attention: 62, health: 58, time: 47 };
    s.provisional = { attention: false, health: false, time: false };
    s.tests = [
      { id: S.uid("t"), type: "attention", total: 62, date: S.addDays(S.today(), -27),
        subscores: { attention: 62, A: 57, B: 66, C: 63, span: 6, rt: 310 } },
      { id: S.uid("t"), type: "health", total: 58, date: S.addDays(S.today(), -26),
        subscores: { sleep: 42, movement: 55, food: 70, energy: 65 } },
      { id: S.uid("t"), type: "time", total: 47, date: S.addDays(S.today(), -25),
        subscores: { spread: 50, eaters: 38, control: 54 } }
    ];
    if (!s.habits.length) {
      s.habits.push({ id: S.uid("h"), libId: "h_sleep23", name: "Ложиться до 23:00", icon: "🌙",
        schedule: "daily", pillar: "health", archived: false, createdAt: s.user.createdAt });
      s.habits.push({ id: S.uid("h"), libId: "h_plan", name: "План на завтра", icon: "📝",
        schedule: "daily", pillar: "time", archived: false, createdAt: s.user.createdAt });
    }
    S.save();

    var rnd = seeded(20261004);
    for (var i = 27; i >= 0; i--) {
      var date = S.addDays(S.today(), -i);
      var dow = S.parseYmd(date).getDay();
      var weekend = dow === 0 || dow === 6;
      var training = (i % 3 === 1);
      var short = (i % 7 === 2);                       // раз в неделю недосып
      var sleep = short ? 5.5 + rnd() : (weekend ? 9 + rnd() : 7.5 + rnd() * 1.5);
      sleep = Math.round(sleep * 2) / 2;

      /* оценку эмоции человек ставит не каждому делу — чаще всего двум-трём */
      function emo(base) { return rnd() > 0.45 ? base : 0; }
      var acts = [];
      if (!weekend) acts.push({ actionId: "a_lessons", durationHours: "3-5", emotion: emo(-2) });
      if (!weekend) acts.push({ actionId: "a_homework", durationHours: "1-3", emotion: emo(-2) });
      acts.push({ actionId: "a_food", durationHours: "<1", emotion: emo(1) });
      acts.push({ actionId: "a_road", durationHours: "<1", emotion: emo(-1) });
      if (training) acts.push({ actionId: "a_training", durationHours: "1-3", emotion: emo(2) });
      if (weekend || rnd() > 0.6) acts.push({ actionId: "a_friends", durationHours: "1-3", emotion: emo(3) });
      if (rnd() > 0.5) acts.push({ actionId: "a_walk", durationHours: "<1", emotion: emo(2) });
      acts.push({ actionId: "a_rest", durationHours: weekend ? "3-5" : "1-3", emotion: emo(1) });

      var f = 30 + (training ? 22 : 0) + (short ? 24 : 0) + (weekend ? -10 : 6) + Math.round(rnd() * 10 - 5);
      f = Math.max(5, Math.min(95, Math.round(f / 10) * 10));
      var focus = short ? 2 : training ? 3 : (weekend ? 4 : 3 + (rnd() > 0.5 ? 1 : 0));

      E.saveDayEntry(date, {
        sleepHours: sleep, sleepQuality: short ? 2 : 4,
        actions: acts, fatigue: f, focus: focus, emotionFinal: null
      });

      /* привычки и пара квестов */
      s = S.get();
      s.habits.forEach(function (h) { if (rnd() > 0.35) s.habitLogs[h.id + "|" + date] = true; });
      if (rnd() > 0.45) {
        var lib = C.QUEST_LIBRARY[Math.floor(rnd() * C.QUEST_LIBRARY.length)];
        s.quests.push({ id: S.uid("q"), libId: lib.id, source: "system", pillar: lib.pillar,
          block: lib.block, level: lib.level, title: lib.title, description: "",
          dueDate: date, status: rnd() > 0.3 ? "done" : "failed",
          completedAt: date, createdAt: date, demo: true });
      }
      S.save();
      E.recalcDayPoints(date);
    }
    E.recalcStreak();
    A.analyze();
    E.checkAchievements();
    S.save();
  }

  function removeDemo() {
    var s = S.get();
    s.days = {}; s.points = {}; s.pillarHistory = []; s.discoveries = [];
    s.experiment = null; s.weeklyReviews = []; s.habitLogs = {};
    s.quests = s.quests.filter(function (q) { return !q.demo; });
    s.achievements = {}; s.demoMode = false;
    s.progress.totalPoints = 0; s.progress.activeDays = 0;
    s.progress.streakCurrent = 0; s.progress.streakBest = 0;
    S.save();
  }

  function seeded(seed) {
    var x = seed;
    return function () { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  }

  global.Profile = { fillDemo: fillDemo, removeDemo: removeDemo };
})(typeof window !== "undefined" ? window : globalThis);

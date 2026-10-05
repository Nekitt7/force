/* ==========================================================================
   КВИНТ — привычки и квесты (п. 4.5)
   ========================================================================== */
(function (global) {
  "use strict";
  var S = global.Store, E = global.Engine, C = global.KvintContent, UI = global.UI;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc, on = UI.on;

  var tab = "habits";

  UI.route("habits", function (scr) {
    E.expireQuests();
    scr.innerHTML = '<h1>Привычки и квесты</h1>' +
      '<div class="chips" style="margin:10px 0 14px" id="tabs">' +
      '<button class="chip' + (tab === "habits" ? " on" : "") + '" data-t="habits">Привычки</button>' +
      '<button class="chip' + (tab === "quests" ? " on" : "") + '" data-t="quests">Квесты</button></div>' +
      '<div id="tabBody"></div>';
    on(scr, "#tabs .chip", "click", function () { tab = this.getAttribute("data-t"); UI.go("habits"); });
    (tab === "habits" ? renderHabits : renderQuests)($("#tabBody"));
  });

  /* =======================================================================
     Привычки
     ======================================================================= */
  function renderHabits(box) {
    var s = S.get();
    var list = s.habits.filter(function (h) { return !h.archived; });
    var t = S.today();
    var html = "";

    if (!list.length) {
      html += '<div class="card center-text"><div style="font-size:40px">✅</div>' +
        "<b>Привычек пока нет</b><div class=\"sub\">Начни с одной маленькой — её проще не бросить.</div></div>";
    } else {
      html += '<div class="card">' + list.map(function (h) {
        var done = !!s.habitLogs[h.id + "|" + t];
        var pct = percent30(h);
        return '<div class="row"><span class="ic">' + h.icon + "</span>" +
          '<div class="grow" data-open="' + h.id + '"><b>' + esc(h.name) + "</b>" +
          '<div class="sub">' + pct + "% за 30 дней" + (h.pillar ? " · " + C.PILLAR_META[h.pillar].title : "") + "</div></div>" +
          '<button class="check' + (done ? " on" : "") + '" data-toggle="' + h.id + '"></button></div>';
      }).join("") + "</div>";
    }

    /* рекомендованные */
    var rec = E.recommendedHabits();
    if (rec.length) {
      html += '<div class="card"><b>Рекомендуем</b>' +
        '<div class="sub">Под самую слабую опору — ' + C.PILLAR_META[E.weakestPillar()].title.toLowerCase() + "</div>" +
        rec.map(function (r) {
          return '<div class="row"><span class="ic">' + r.icon + "</span>" +
            '<div class="grow">' + esc(r.title) + "</div>" +
            '<button class="btn small soft" data-add="' + r.id + '">Добавить</button></div>';
        }).join("") + "</div>";
    }

    html += '<button class="btn" id="newHabit">Новая привычка</button><div class="spacer"></div>';
    box.innerHTML = html;

    on(box, "[data-toggle]", "click", function () {
      var id = this.getAttribute("data-toggle"), k = id + "|" + t;
      var st = S.get();
      if (st.habitLogs[k]) delete st.habitLogs[k]; else st.habitLogs[k] = true;
      S.save();
      this.classList.toggle("on");
      E.recalcStreak(); E.recalcDayPoints(t);
      UI.vibrate();
    });
    on(box, "[data-open]", "click", function () { habitCard(this.getAttribute("data-open")); });
    on(box, "[data-add]", "click", function () {
      var lib = C.HABIT_LIBRARY.filter(function (x) { return x.id === this.getAttribute("data-add"); }.bind(this))[0];
      if (!lib) return;
      var st = S.get();
      st.habits.push({
        id: S.uid("h"), libId: lib.id, name: lib.title, icon: lib.icon,
        schedule: "daily", pillar: lib.pillar, reminder: null, archived: false, createdAt: t
      });
      S.save(); UI.toast("Привычка добавлена"); UI.go("habits");
    });
    $("#newHabit").addEventListener("click", function () { habitForm(null); });
  }

  function percent30(h) {
    var cnt = 0, s = S.get();
    for (var i = 0; i < 30; i++) {
      if (s.habitLogs[h.id + "|" + S.addDays(S.today(), -i)]) cnt++;
    }
    return Math.round(cnt / 30 * 100);
  }

  function habitCard(id) {
    var s = S.get();
    var h = s.habits.filter(function (x) { return x.id === id; })[0];
    if (!h) return;
    /* тепловая карта 13 недель */
    var cells = "";
    var cur = 0, best = 0;
    for (var i = 90; i >= 0; i--) {
      var d = S.addDays(S.today(), -i);
      var done = !!s.habitLogs[h.id + "|" + d];
      if (done) { cur++; best = Math.max(best, cur); } else cur = 0;
      cells += '<div class="c" style="background:' + (done ? "var(--health)" : "var(--line)") + '"></div>';
    }
    UI.sheet("<h2>" + h.icon + " " + esc(h.name) + "</h2>" +
      '<div class="heat">' + cells + "</div><div class=\"spacer\"></div>" +
      '<div class="card tight"><div class="row" style="border:none"><div class="grow">Текущая серия</div><b>' + cur + "</b></div>" +
      '<div class="row" style="border:none"><div class="grow">Лучшая серия</div><b>' + best + "</b></div>" +
      '<div class="row" style="border:none"><div class="grow">За 30 дней</div><b>' + percent30(h) + "%</b></div></div>" +
      '<div class="btn-row"><button class="btn ghost" id="arch">В архив</button>' +
      '<button class="btn" id="edit">Изменить</button></div>',
      function (el, close) {
        el.querySelector("#arch").addEventListener("click", function () {
          h.archived = true; S.save(); close(); UI.go("habits");
        });
        el.querySelector("#edit").addEventListener("click", function () { close(); habitForm(h); });
      });
  }

  function habitForm(h) {
    var isNew = !h;
    h = h || { name: "", icon: "🌙", schedule: "daily", pillar: null };
    var days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    var sched = h.schedule === "daily" ? "daily" : h.schedule.slice();
    UI.sheet("<h2>" + (isNew ? "Новая привычка" : "Изменить") + "</h2>" +
      '<div class="field"><label>Название</label><input class="input" id="hn" maxlength="40" value="' + esc(h.name) + '" placeholder="Например, ложиться до 23:00"></div>' +
      '<div class="field"><label>Иконка</label><div class="chips" id="hi">' +
      C.HABIT_ICONS.map(function (ic) {
        return '<button class="chip' + (h.icon === ic ? " on" : "") + '" data-i="' + ic + '">' + ic + "</button>";
      }).join("") + "</div></div>" +
      '<div class="field"><label>Когда</label><div class="chips" id="hs">' +
      '<button class="chip' + (sched === "daily" ? " on" : "") + '" data-d="daily">Каждый день</button>' +
      days.map(function (d, i) {
        var onn = sched !== "daily" && sched.indexOf((i + 1) % 7) >= 0;
        return '<button class="chip' + (onn ? " on" : "") + '" data-d="' + ((i + 1) % 7) + '">' + d + "</button>";
      }).join("") + "</div></div>" +
      '<div class="field"><label>Связана с опорой</label><div class="chips" id="hp">' +
      [["", "Нет"], ["attention", "Внимание"], ["health", "Здоровье"], ["time", "Время"]].map(function (p) {
        return '<button class="chip' + ((h.pillar || "") === p[0] ? " on" : "") + '" data-p="' + p[0] + '">' + p[1] + "</button>";
      }).join("") + "</div></div>" +
      '<button class="btn" id="saveH">Сохранить</button>',
      function (el, close) {
        on(el, "#hi .chip", "click", function () {
          Array.prototype.forEach.call(el.querySelectorAll("#hi .chip"), function (c) { c.classList.remove("on"); });
          this.classList.add("on");
        });
        on(el, "#hp .chip", "click", function () {
          Array.prototype.forEach.call(el.querySelectorAll("#hp .chip"), function (c) { c.classList.remove("on"); });
          this.classList.add("on");
        });
        on(el, "#hs .chip", "click", function () {
          var d = this.getAttribute("data-d");
          var all = el.querySelectorAll("#hs .chip");
          if (d === "daily") {
            Array.prototype.forEach.call(all, function (c) { c.classList.remove("on"); });
            this.classList.add("on"); sched = "daily";
          } else {
            all[0].classList.remove("on");
            this.classList.toggle("on");
            sched = [];
            Array.prototype.forEach.call(all, function (c) {
              var v = c.getAttribute("data-d");
              if (v !== "daily" && c.classList.contains("on")) sched.push(+v);
            });
            if (!sched.length) { all[0].classList.add("on"); sched = "daily"; }
          }
        });
        el.querySelector("#saveH").addEventListener("click", function () {
          var nm = el.querySelector("#hn").value.trim();
          if (nm.length < 2) return UI.toast("Слишком коротко");
          var icEl = el.querySelector("#hi .chip.on");
          var pEl = el.querySelector("#hp .chip.on");
          var data = {
            name: nm, icon: icEl ? icEl.getAttribute("data-i") : "🌙",
            schedule: sched, pillar: pEl ? (pEl.getAttribute("data-p") || null) : null
          };
          var st = S.get();
          if (isNew) {
            st.habits.push(Object.assign({ id: S.uid("h"), archived: false, createdAt: S.today(), reminder: null }, data));
          } else {
            Object.assign(h, data);
          }
          S.save(); close(); UI.go("habits");
        });
      });
  }

  /* =======================================================================
     Квесты
     ======================================================================= */
  function renderQuests(box) {
    var s = S.get();
    var t = S.today();
    var active = s.quests.filter(function (q) { return q.status === "active"; });
    if (!active.length) { E.pickQuestsForToday(); active = s.quests.filter(function (q) { return q.status === "active"; }); }
    var recent = s.quests.filter(function (q) { return q.status !== "active" && q.dueDate >= S.addDays(t, -7); })
      .sort(function (a, b) { return a.dueDate < b.dueDate ? 1 : -1; });

    var srcName = { system: "От Квинта", self: "Свой", friend: "От друга" };
    var html = "";

    html += '<div class="card"><b>Активные</b>' + (active.length ? active.map(function (q) {
      return '<div class="row"><span class="ic">' + (q.source === "friend" ? "🤝" : q.source === "self" ? "✍️" : "🎯") + "</span>" +
        '<div class="grow"><b class="ellipsis">' + esc(q.title) + "</b>" +
        '<div class="sub">' + srcName[q.source] + (q.pillar ? " · " + C.PILLAR_META[q.pillar].title : "") +
        (q.dueDate !== t ? " · до " + q.dueDate : "") + "</div></div>" +
        '<button class="check" data-done="' + q.id + '"></button></div>';
    }).join("") : '<div class="sub">Нет активных квестов</div>') + "</div>";

    html += '<button class="btn soft" id="newQuest">Свой квест</button><div class="spacer"></div>';

    if (recent.length) {
      html += '<div class="card"><b>Недавние</b>' + recent.slice(0, 10).map(function (q) {
        return '<div class="row"><span class="ic">' + (q.status === "done" ? "✅" : "✖️") + "</span>" +
          '<div class="grow ellipsis sub">' + esc(q.title) + "</div>" +
          '<span class="sub">' + q.dueDate.slice(5) + "</span></div>";
      }).join("") + "</div>";
    }
    box.innerHTML = html;

    on(box, "[data-done]", "click", function () {
      var id = this.getAttribute("data-done");
      var q = S.get().quests.filter(function (x) { return x.id === id; })[0];
      if (!q) return;
      q.status = "done"; q.completedAt = new Date().toISOString();
      S.save();
      E.recalcStreak(); E.recalcDayPoints(q.dueDate); E.checkAchievements();
      this.classList.add("on");
      UI.vibrate(20); UI.toast("Квест выполнен");
      setTimeout(function () { UI.go("habits"); }, 380);
    });
    $("#newQuest").addEventListener("click", questForm);
  }

  function questForm() {
    UI.sheet("<h2>Свой квест</h2>" +
      '<div class="field"><label>Что сделать</label><input class="input" id="qt" maxlength="60" placeholder="Например, лечь до 23:00"></div>' +
      '<div class="field"><label>Опора</label><div class="chips" id="qp">' +
      [["health", "Здоровье"], ["attention", "Внимание"], ["time", "Время"]].map(function (p, i) {
        return '<button class="chip' + (i === 0 ? " on" : "") + '" data-p="' + p[0] + '">' + p[1] + "</button>";
      }).join("") + "</div></div>" +
      '<div class="field"><label>Срок</label><div class="chips" id="qd">' +
      '<button class="chip on" data-d="0">Сегодня</button><button class="chip" data-d="1">Завтра</button>' +
      '<button class="chip" data-d="7">Через неделю</button></div></div>' +
      '<button class="btn" id="saveQ">Создать</button>',
      function (el, close) {
        ["#qp", "#qd"].forEach(function (sel) {
          on(el, sel + " .chip", "click", function () {
            Array.prototype.forEach.call(el.querySelectorAll(sel + " .chip"), function (c) { c.classList.remove("on"); });
            this.classList.add("on");
          });
        });
        el.querySelector("#saveQ").addEventListener("click", function () {
          var title = el.querySelector("#qt").value.trim();
          if (title.length < 3) return UI.toast("Напиши чуть подробнее");
          var p = el.querySelector("#qp .chip.on").getAttribute("data-p");
          var d = +el.querySelector("#qd .chip.on").getAttribute("data-d");
          var st = S.get();
          st.quests.push({
            id: S.uid("q"), libId: null, source: "self", pillar: p, block: null, level: 1,
            title: title, description: "", dueDate: S.addDays(S.today(), d),
            status: "active", completedAt: null, createdAt: S.today()
          });
          S.save(); close(); UI.go("habits");
        });
      });
  }
})(typeof window !== "undefined" ? window : globalThis);

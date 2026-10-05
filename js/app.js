/* ==========================================================================
   КВИНТ — запуск
   ========================================================================== */
(function (global) {
  "use strict";
  var S = global.Store, E = global.Engine, A = global.Analytics, UI = global.UI;

  function boot() {
    S.load();
    UI.applyPalette();

    /* ежедневные фоновые пересчёты (на сервере это будут задачи по расписанию) */
    E.expireQuests();
    E.applyDecay();
    E.recalcStreak();
    E.recalcTotals();
    A.finishExperimentIfDue();

    var s = S.get();
    if (!s.user.onboarded) {
      UI.setOnbStep(0);
      UI.go("onboarding");
    } else {
      UI.go("home");
    }

    /* реакция на смену системной темы */
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", function () { UI.applyPalette(); });
    }

    /* пересчёт при возвращении в приложение (мог наступить новый день) */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) return;
      E.expireQuests(); E.applyDecay(); E.recalcStreak();
      A.finishExperimentIfDue();
      UI.refresh();
    });

    /* скрытый вход в демо-режим: долгое нажатие на заголовок (п. 9.3) */
    var press = null;
    document.addEventListener("pointerdown", function (e) {
      var h = e.target.closest && e.target.closest("h1");
      if (!h) return;
      press = setTimeout(function () {
        if (S.get().demoMode) return;
        UI.sheet("<h2>Демо-режим</h2><p class=\"sub\">Заполнить аккаунт данными за 28 дней, чтобы сразу показать открытия, графики и кубки?</p>" +
          '<div class="spacer"></div><div class="btn-row"><button class="btn ghost" id="n">Нет</button>' +
          '<button class="btn" id="y">Заполнить</button></div>',
          function (el, close) {
            el.querySelector("#n").addEventListener("click", close);
            el.querySelector("#y").addEventListener("click", function () {
              global.Profile.fillDemo(); close(); UI.toast("Демо-данные готовы"); UI.go("home");
            });
          });
      }, 1200);
    });
    ["pointerup", "pointercancel", "pointermove"].forEach(function (ev) {
      document.addEventListener(ev, function () { clearTimeout(press); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);

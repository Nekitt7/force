/* ==========================================================================
   КВИНТ — справочники и библиотеки контента
   Раздел 4.4 (действия), 6.6 (квесты и привычки), 6.8 (достижения), 8.2 (палитры)
   ========================================================================== */
(function (global) {
  "use strict";

  /* ---------- Действия по умолчанию (п. 4.4) ---------- */
  var DEFAULT_ACTIONS = [
    { id: "a_lessons",  name: "Уроки",             category: "study",  icon: "📚" },
    { id: "a_classes",  name: "Пары",              category: "study",  icon: "🎓" },
    { id: "a_homework", name: "Домашние задания",  category: "study",  icon: "✏️" },
    { id: "a_training", name: "Тренировка",        category: "sport",  icon: "🏃" },
    { id: "a_walk",     name: "Прогулка",          category: "sport",  icon: "🌳" },
    { id: "a_food",     name: "Еда",               category: "home",   icon: "🍽" },
    { id: "a_shower",   name: "Душ",               category: "home",   icon: "🚿" },
    { id: "a_road",     name: "Дорога",            category: "home",   icon: "🚌" },
    { id: "a_rest",     name: "Отдых",             category: "rest",   icon: "🛋" },
    { id: "a_friends",  name: "Встреча с друзьями",category: "social", icon: "👥" }
  ];

  var CATEGORIES = {
    study:  "Учёба",
    sport:  "Спорт",
    home:   "Быт",
    rest:   "Отдых",
    social: "Общение",
    other:  "Другое"
  };

  /* ---------- Библиотека квестов (п. 6.6) ----------
     pillar: health | attention | time
     block:  сон / движение / питание / энергия / внимание / распределение / пожиратели / контроль
     level:  1..3 — сложность                                                      */
  var QUEST_LIBRARY = [
    /* --- Здоровье / сон --- */
    { id: "q_sleep_23",     pillar: "health", block: "sleep",    level: 1, title: "Лечь спать до 23:00" },
    { id: "q_sleep_phone",  pillar: "health", block: "sleep",    level: 1, title: "Убрать телефон за 30 минут до сна" },
    { id: "q_sleep_alarm",  pillar: "health", block: "sleep",    level: 2, title: "Проснуться без повторного будильника" },
    { id: "q_sleep_same",   pillar: "health", block: "sleep",    level: 2, title: "Лечь в то же время, что и вчера" },
    { id: "q_sleep_dark",   pillar: "health", block: "sleep",    level: 1, title: "Проветрить комнату перед сном" },
    { id: "q_sleep_8h",     pillar: "health", block: "sleep",    level: 3, title: "Проспать всю норму сна" },
    { id: "q_sleep_nocaf",  pillar: "health", block: "sleep",    level: 2, title: "Не пить кофе и энергетики после 16:00" },
    /* --- Здоровье / движение --- */
    { id: "q_move_20",      pillar: "health", block: "movement", level: 1, title: "Пройти пешком 20 минут" },
    { id: "q_move_warm",    pillar: "health", block: "movement", level: 1, title: "Сделать 10-минутную разминку" },
    { id: "q_move_stairs",  pillar: "health", block: "movement", level: 1, title: "Подняться по лестнице вместо лифта" },
    { id: "q_move_break",   pillar: "health", block: "movement", level: 2, title: "Вставать и разминаться раз в час" },
    { id: "q_move_train",   pillar: "health", block: "movement", level: 3, title: "Полноценная тренировка 40 минут" },
    { id: "q_move_stop",    pillar: "health", block: "movement", level: 2, title: "Выйти на остановку раньше и дойти пешком" },
    /* --- Здоровье / питание --- */
    { id: "q_food_water",   pillar: "health", block: "food",     level: 1, title: "Выпить 6 стаканов воды" },
    { id: "q_food_break",   pillar: "health", block: "food",     level: 1, title: "Позавтракать" },
    { id: "q_food_table",   pillar: "health", block: "food",     level: 2, title: "Поесть за столом без экрана" },
    { id: "q_food_veg",     pillar: "health", block: "food",     level: 2, title: "Съесть овощи или фрукт" },
    { id: "q_food_noskip",  pillar: "health", block: "food",     level: 3, title: "Поесть три раза в одно и то же время" },
    /* --- Здоровье / энергия --- */
    { id: "q_en_air",       pillar: "health", block: "energy",   level: 1, title: "Побыть на улице 15 минут днём" },
    { id: "q_en_pause",     pillar: "health", block: "energy",   level: 1, title: "Сделать паузу на 10 минут без телефона" },
    { id: "q_en_light",     pillar: "health", block: "energy",   level: 2, title: "Утром сразу открыть шторы и впустить свет" },
    /* --- Внимание --- */
    { id: "q_att_25",       pillar: "attention", block: "attention", level: 1, title: "Поработать 25 минут без отвлечений" },
    { id: "q_att_room",     pillar: "attention", block: "attention", level: 2, title: "Сделать уроки, убрав телефон в другую комнату" },
    { id: "q_att_breath",   pillar: "attention", block: "attention", level: 1, title: "5 минут спокойного дыхания" },
    { id: "q_att_one",      pillar: "attention", block: "attention", level: 2, title: "Час без переключения между делами" },
    { id: "q_att_notif",    pillar: "attention", block: "attention", level: 1, title: "Выключить уведомления на время занятий" },
    { id: "q_att_desk",     pillar: "attention", block: "attention", level: 1, title: "Убрать со стола всё лишнее перед работой" },
    { id: "q_att_50",       pillar: "attention", block: "attention", level: 3, title: "Два блока по 50 минут сосредоточенной работы" },
    { id: "q_att_read",     pillar: "attention", block: "attention", level: 2, title: "Прочитать 10 страниц подряд, не отвлекаясь" },
    /* --- Время / распределение --- */
    { id: "q_time_plan",    pillar: "time", block: "spread",   level: 1, title: "Написать план на завтра из 3 пунктов" },
    { id: "q_time_me",      pillar: "time", block: "spread",   level: 2, title: "Выделить час на то, что нравится" },
    { id: "q_time_review",  pillar: "time", block: "spread",   level: 2, title: "Вечером посмотреть, на что ушёл день" },
    /* --- Время / пожиратели --- */
    { id: "q_time_frog",    pillar: "time", block: "eaters",   level: 2, title: "Сделать самое неприятное дело первым" },
    { id: "q_time_scroll",  pillar: "time", block: "eaters",   level: 2, title: "День без залипания в ленте дольше 20 минут" },
    { id: "q_time_timer",   pillar: "time", block: "eaters",   level: 1, title: "Засечь таймер на отдых в телефоне" },
    { id: "q_time_small",   pillar: "time", block: "eaters",   level: 1, title: "Сделать дело, которое займёт меньше 5 минут, сразу" },
    /* --- Время / контроль --- */
    { id: "q_time_finish",  pillar: "time", block: "control",  level: 2, title: "Закончить одно дело, прежде чем начинать новое" },
    { id: "q_time_deadline",pillar: "time", block: "control",  level: 3, title: "Сдать задание раньше срока" },
    { id: "q_time_three",   pillar: "time", block: "control",  level: 2, title: "Выполнить все 3 пункта вчерашнего плана" },
    { id: "q_time_morning", pillar: "time", block: "control",  level: 1, title: "Начать день с самого важного дела" }
  ];

  /* ---------- Библиотека привычек (п. 6.6) ---------- */
  var HABIT_LIBRARY = [
    { id: "h_sleep23",  pillar: "health",    block: "sleep",     title: "Ложиться до 23:00",         icon: "🌙" },
    { id: "h_nophone",  pillar: "health",    block: "sleep",     title: "Без телефона перед сном",   icon: "📵" },
    { id: "h_water",    pillar: "health",    block: "food",      title: "6 стаканов воды",           icon: "💧" },
    { id: "h_breakfast",pillar: "health",    block: "food",      title: "Завтрак",                   icon: "🥣" },
    { id: "h_walk",     pillar: "health",    block: "movement",  title: "Прогулка 20 минут",         icon: "🚶" },
    { id: "h_warmup",   pillar: "health",    block: "movement",  title: "Утренняя разминка",         icon: "🤸" },
    { id: "h_focus25",  pillar: "attention", block: "attention", title: "25 минут без отвлечений",   icon: "🎯" },
    { id: "h_breath",   pillar: "attention", block: "attention", title: "5 минут тишины",            icon: "🫧" },
    { id: "h_plan",     pillar: "time",      block: "spread",    title: "План на завтра",            icon: "📝" },
    { id: "h_frog",     pillar: "time",      block: "eaters",    title: "Сложное дело первым",       icon: "🐸" },
    { id: "h_tidy",     pillar: "time",      block: "control",   title: "Убрать стол вечером",       icon: "🧹" },
    { id: "h_read",     pillar: "attention", block: "attention", title: "10 страниц книги",          icon: "📖" }
  ];

  var HABIT_ICONS = ["🌙","💧","🚶","🎯","📝","📖","🤸","🥣","🧘","🧹","📵","☀️","🐸","🫧","🏃","🍎"];

  /* ---------- Достижения (п. 6.8) ---------- */
  var ACHIEVEMENTS = [
    { code: "first_step",   title: "Первый шаг",      cond: "Первая вечерняя отметка",                  diff: "easy",  icon: "👣" },
    { code: "acquainted",   title: "Знакомство",      cond: "Пройдены все 3 полных теста",              diff: "easy",  icon: "🧪" },
    { code: "week_fire",    title: "Неделя огня",     cond: "Огонёк 7 дней",                            diff: "easy",  icon: "🔥" },
    { code: "first_disc",   title: "Первое открытие", cond: "Получено первое открытие",                 diff: "easy",  icon: "💡" },
    { code: "scientist",    title: "Учёный",          cond: "Завершён первый эксперимент",              diff: "mid",   icon: "🔬" },
    { code: "team_player",  title: "Командный игрок", cond: "Выполнено 10 квестов от друзей",           diff: "mid",   icon: "🤝" },
    { code: "mega_happy",   title: "Мега-счастливый", cond: "День с эмоциями +10",                      diff: "mid",   icon: "🤩" },
    { code: "sleeper",      title: "Соня",            cond: "Неделя со сном в норме каждый день",       diff: "mid",   icon: "😴" },
    { code: "sunny_week",   title: "Солнечная неделя",cond: "7 дней подряд солнечно или облачно",       diff: "mid",   icon: "🌤" },
    { code: "sharp_mind",   title: "Острый ум",       cond: "Внимание 85 и выше",                       diff: "hard",  icon: "🧠" },
    { code: "month_fire",   title: "Месяц огня",      cond: "Огонёк 30 дней",                           diff: "hard",  icon: "🔥" },
    { code: "zen",          title: "Дзен",            cond: "14 дней подряд эмоции в балансе",          diff: "hard",  icon: "☯️" },
    { code: "hundred",      title: "Сотня",           cond: "Огонёк 100 дней",                          diff: "epic",  icon: "💯" },
    { code: "all_green",    title: "Все в зелёном",   cond: "Все три опоры 80 и выше одновременно",     diff: "epic",  icon: "🟢" }
  ];

  /* ---------- Кубки (п. 6.7) ---------- */
  var CUPS = [
    { code: "none",   title: "Без кубка", points: 0,     icon: "·"  },
    { code: "bronze", title: "Бронза",    gen: "бронзы",    points: 300,   icon: "🥉" },
    { code: "silver", title: "Серебро",   gen: "серебра",   points: 800,   icon: "🥈" },
    { code: "gold",   title: "Золото",    gen: "золота",    points: 1500,  icon: "🥇" },
    { code: "hard",   title: "Stay Hard", gen: "Stay Hard", points: 18000, icon: "🏆", minActiveDays: 300 }
  ];

  /* ---------- Погода усталости (п. 6.4) ---------- */
  var WEATHER = [
    { code: "sun",    max: 20,  title: "Солнечно",               icon: "☀️", caption: "Сегодня: солнечно" },
    { code: "part",   max: 40,  title: "Переменная облачность",  icon: "🌤", caption: "Сегодня: переменная облачность" },
    { code: "cloud",  max: 60,  title: "Пасмурно",               icon: "☁️", caption: "Сегодня: пасмурно и прохладно" },
    { code: "rain",   max: 80,  title: "Дождь",                  icon: "🌧", caption: "Сегодня: дождь" },
    { code: "snow",   max: 100, title: "Метель",                 icon: "🌨", caption: "Сегодня: снег и метель" }
  ];

  /* ---------- Палитры (п. 8.2) ---------- */
  var PALETTES = {
    calm:   { title: "Спокойная", bg:"#F7F7F5", card:"#FFFFFF", text:"#1C1C1E", text2:"#6E6E73",
              accent:"#4F6BED", attention:"#8B6CF6", health:"#34C27A", time:"#3B82F6",
              fatigue:"#F59E0B", emotion:"#EC6FA8", line:"#E8E8E6" },
    dark:   { title: "Тёмная",    bg:"#121316", card:"#1D1F24", text:"#F2F2F5", text2:"#9A9CA3",
              accent:"#7C8CFF", attention:"#A48BFF", health:"#4ADE91", time:"#60A5FA",
              fatigue:"#FBBF24", emotion:"#F48FBF", line:"#2A2D34" },
    forest: { title: "Лес",       bg:"#F3F6F1", card:"#FFFFFF", text:"#1E2A1F", text2:"#5E6B5F",
              accent:"#2F8F5B", attention:"#7A62D9", health:"#3BAA6A", time:"#3A7BC8",
              fatigue:"#D9902A", emotion:"#D46C9C", line:"#E2E8E0" },
    sunset: { title: "Закат",     bg:"#FBF5F0", card:"#FFFFFF", text:"#2A1E1A", text2:"#7A6A63",
              accent:"#E2704A", attention:"#8E62D9", health:"#4CB27A", time:"#3E7FD6",
              fatigue:"#F0A030", emotion:"#E85D8C", line:"#EFE3DA" }
  };

  /* ---------- Нормы сна (п. 6.1) ---------- */
  /* склонение: 1 пункт, 2 пункта, 5 пунктов */
  function plural(n, one, few, many) {
    n = Math.abs(Math.round(n));
    var d10 = n % 10, d100 = n % 100;
    if (d100 >= 11 && d100 <= 14) return many;
    if (d10 === 1) return one;
    if (d10 >= 2 && d10 <= 4) return few;
    return many;
  }
  function pts(n) { return n + " " + plural(n, "пункт", "пункта", "пунктов"); }

  function sleepNorm(age) {
    if (age < 14) return { min: 9, max: 11 };
    if (age <= 17) return { min: 8, max: 10 };
    return { min: 7, max: 9 };
  }

  /* ---------- Вопросы тестов (раздел 5) ---------- */
  var QUICK_QUESTIONS = [
    { pillar: "attention", q: "Насколько легко тебе удерживать внимание на одном деле?" },
    { pillar: "health",    q: "Насколько бодрым и здоровым ты себя чувствуешь в последнее время?" },
    { pillar: "time",      q: "Хватает ли тебе времени на то, что для тебя важно?" }
  ];

  // scale: обычная 1-5 | reverse: обратная | sleepHours: особый пересчёт через норму
  var HEALTH_TEST = [
    { block: "sleep", title: "Сон", questions: [
      { q: "Сколько часов ты обычно спишь?", type: "sleepHours" },
      { q: "Как часто ты просыпаешься выспавшимся?", type: "scale",
        labels: ["Никогда","Редко","Иногда","Часто","Почти всегда"] },
      { q: "Ложишься ли ты примерно в одно и то же время?", type: "scale",
        labels: ["Никогда","Редко","Иногда","Обычно","Всегда"] }
    ]},
    { block: "movement", title: "Движение", questions: [
      { q: "Сколько дней в неделю у тебя есть активность не меньше 30 минут?", type: "scale",
        labels: ["0–1 день","2 дня","3–4 дня","5–6 дней","Каждый день"] },
      { q: "Сколько часов в день ты сидишь?", type: "scale",
        labels: ["12 и больше","10–12","8–10","6–8","Меньше 6"] },
      { q: "Насколько тебе легко подняться пешком на 4 этаж?", type: "scale",
        labels: ["Очень тяжело","Тяжело","Нормально","Легко","Совсем легко"] }
    ]},
    { block: "food", title: "Питание и вода", questions: [
      { q: "Как регулярно ты ешь?", type: "scale",
        labels: ["Как придётся","Редко по режиму","По-разному","Чаще по режиму","Строго по режиму"] },
      { q: "Сколько стаканов воды в день?", type: "scale",
        labels: ["0–1","2–3","4–5","6–7","8 и больше"] },
      { q: "Как часто ешь на бегу или перекусами вместо еды?", type: "scale",
        labels: ["Постоянно","Часто","Иногда","Редко","Почти никогда"] }
    ]},
    { block: "energy", title: "Энергия", questions: [
      { q: "Насколько ты бодр утром?", type: "scale",
        labels: ["Совсем разбит","Вяло","Средне","Бодро","Очень бодро"] },
      { q: "Бывают ли днём провалы сил?", type: "scale",
        labels: ["Каждый день","Часто","Иногда","Редко","Почти никогда"] },
      { q: "Как часто болит голова или ты болеешь?", type: "scale",
        labels: ["Очень часто","Часто","Иногда","Редко","Почти никогда"] }
    ]}
  ];

  var TIME_TEST = [
    { block: "spread", title: "Распределение", questions: [
      { q: "Насколько ты доволен тем, на что уходит твой день?", type: "scale",
        labels: ["Совсем нет","Скорее нет","Средне","Скорее да","Полностью"] },
      { q: "Остаётся ли время на то, что нравится?", type: "scale",
        labels: ["Никогда","Редко","Иногда","Часто","Всегда"] },
      { q: "Совпадает ли то, на что ты тратишь время, с тем, что для тебя важно?", type: "scale",
        labels: ["Совсем нет","Скорее нет","Отчасти","Скорее да","Полностью"] }
    ]},
    { block: "eaters", title: "Пожиратели", questions: [
      { q: "Сколько времени в день уходит «в никуда»?", type: "scale",
        labels: ["4 часа и больше","3–4 часа","2–3 часа","1–2 часа","Меньше 30 минут"] },
      { q: "Как часто ты замечаешь, что прошло намного больше времени, чем ты думал?", type: "scale",
        labels: ["Постоянно","Часто","Иногда","Редко","Почти никогда"] },
      { q: "Как часто ты откладываешь дела на последний момент?", type: "scale",
        labels: ["Постоянно","Часто","Иногда","Редко","Почти никогда"] }
    ]},
    { block: "control", title: "Контроль", questions: [
      { q: "Как часто ты успеваешь то, что запланировал на день?", type: "scale",
        labels: ["Никогда","Редко","Иногда","Часто","Всегда"] },
      { q: "Как часто ты сдаёшь задания вовремя?", type: "scale",
        labels: ["Никогда","Редко","Иногда","Часто","Всегда"] },
      { q: "Насколько ты чувствуешь, что управляешь своим днём сам?", type: "scale",
        labels: ["Совсем нет","Скорее нет","Средне","Скорее да","Полностью"] }
    ]}
  ];

  var PILLAR_META = {
    attention: { title: "Внимание",  colorToken: "attention" },
    health:    { title: "Здоровье",  colorToken: "health" },
    time:      { title: "Время",     colorToken: "time" }
  };

  var BLOCK_TITLES = {
    sleep: "Сон", movement: "Движение", food: "Питание и вода", energy: "Энергия",
    attention: "Внимание", spread: "Распределение", eaters: "Пожиратели", control: "Контроль"
  };

  global.KvintContent = {
    DEFAULT_ACTIONS: DEFAULT_ACTIONS,
    CATEGORIES: CATEGORIES,
    QUEST_LIBRARY: QUEST_LIBRARY,
    HABIT_LIBRARY: HABIT_LIBRARY,
    HABIT_ICONS: HABIT_ICONS,
    ACHIEVEMENTS: ACHIEVEMENTS,
    CUPS: CUPS,
    WEATHER: WEATHER,
    PALETTES: PALETTES,
    QUICK_QUESTIONS: QUICK_QUESTIONS,
    HEALTH_TEST: HEALTH_TEST,
    TIME_TEST: TIME_TEST,
    PILLAR_META: PILLAR_META,
    BLOCK_TITLES: BLOCK_TITLES,
    sleepNorm: sleepNorm, plural: plural, pts: pts
  };
})(typeof window !== "undefined" ? window : globalThis);

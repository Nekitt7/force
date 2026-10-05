/* ==========================================================================
   КВИНТ — персонаж и погода усталости
   Раздел 4.9 (конструктор) и 6.4 (погода и позы).

   Персонаж рисуется кодом в SVG: тот же набор категорий и та же
   конфигурация-JSON, что описаны в ТЗ для 3D-версии. Когда появятся
   GLB-модели, заменяется только этот файл — остальное приложение
   работает с тем же объектом character.
   ========================================================================== */
(function (global) {
  "use strict";

  var SKIN   = ["#F6D7BE","#EFC49F","#D9A273","#B87A4B","#8D5524","#5C3A1E"];
  var HAIRC  = ["#2B2118","#4A3326","#7A4B2A","#B9793F","#D9B36C","#E8E3DC","#4F6BED","#D1495B","#5BA87A","#8B6CF6"];
  var CLOTH  = ["#4F6BED","#8B6CF6","#34C27A","#F59E0B","#EC6FA8","#1C1C1E","#F2F2F5","#3B82F6","#E2704A","#2F8F5B","#6E6E73","#D1495B"];
  var BOTTOM = ["#3A4A6B","#2B2F3A","#5B6472","#7A6A63","#1C1C1E","#4F6BED","#6E6E73","#8D7B68"];
  var SHOEC  = ["#1C1C1E","#F2F2F5","#D1495B","#4F6BED","#34C27A","#6E6E73"];

  var BUILDS  = [{ w: 0.86, label: "Худощавое" }, { w: 1.0, label: "Среднее" }, { w: 1.16, label: "Плотное" }];
  var HAIRS   = ["Коротко","Ёжик","Каре","Длинные","Хвост","Кудри","Афро","Пучок","Ирокез","Лысо",
                 "Чёлка","Волны","Боб","Два хвоста","Андеркат","Лохматые","Косы","Пробор","Хвостик","Шапочка"];
  var TOPS    = ["Футболка","Худи","Рубашка","Куртка","Майка","Лонгслив","Свитер","Поло",
                 "Бомбер","Водолазка","Жилет","Толстовка","Топ","Пиджак","Ветровка"];
  var BOTTOMS = ["Джинсы","Брюки","Шорты","Юбка","Карго","Спортивки","Леггинсы","Чиносы","Бермуды","Плиссе"];
  var SHOES   = ["Кроссовки","Кеды","Ботинки","Сандалии","Хайтопы","Лоферы","Угги","Слипоны"];
  var ACCS    = ["Очки","Кепка","Наушники","Сумка","Шапка","Шарф","Серьги","Маска","Бандана","Панама","Повязка","Рюкзак"];

  var EYES  = 6, BROWS = 5, NOSES = 5, MOUTHS = 6, FACES = 5;

  /* позы по погоде (п. 6.4) */
  var POSES = {
    sun:   { shoulder: 0,  tilt: 0,   arm: 14,  lean: 0,   brow: 0,  mouth: "smile" },
    part:  { shoulder: 1,  tilt: 0,   arm: 10,  lean: 0,   brow: 0,  mouth: "calm"  },
    cloud: { shoulder: 4,  tilt: 2,   arm: 6,   lean: 1,   brow: 1,  mouth: "calm"  },
    rain:  { shoulder: 8,  tilt: 5,   arm: 2,   lean: 2,   brow: 2,  mouth: "tired" },
    snow:  { shoulder: 12, tilt: 7,   arm: -6,  lean: 3,   brow: 2,  mouth: "tired" }
  };

  var SKY = {
    sun:   ["#FFF3D4","#FFE1A8"], part:  ["#EAF2FF","#D7E6FB"],
    cloud: ["#DFE5EC","#C6CFD9"], rain:  ["#C9D2DD","#A9B5C4"],
    snow:  ["#DCE6EF","#BFCEDC"]
  };

  function esc(n) { return Math.round(n * 100) / 100; }

  /* ---------- волосы ----------
     Шапка волос строится как верхняя часть эллипса головы, обрезанная
     по высоте cut. Так причёска всегда садится на голову ровно,
     при любой форме лица.                                            */
  function cap(cx, cy, rx, ry, cut, grow) {
    grow = grow || 0;
    var RX = rx + grow, RY = ry + grow;
    var k = Math.max(0, 1 - (cut / RY) * (cut / RY));
    var hw = RX * Math.sqrt(k);
    return "M" + (cx - hw) + " " + (cy - cut) + " A" + RX + " " + RY + " 0 0 1 " +
           (cx + hw) + " " + (cy - cut) + " Z";
  }
  function hairPath(i, cx, cy, rx, ry) {
    var p = "";
    switch (i % 20) {
      case 0:  /* коротко */
        return '<path d="' + cap(cx, cy, rx, ry, 4, 1.5) + '"/>';
      case 1:  /* ёжик */
        p = '<path d="' + cap(cx, cy, rx, ry, 10, 1) + '"/>';
        for (var s = -3; s <= 3; s++) {
          p += '<path d="M' + (cx + s * rx * 0.26) + " " + (cy - ry * 0.92) +
               " l1.6 -7 l1.6 7 z\"/>";
        }
        return p;
      case 2:  /* каре */
        return '<path d="' + cap(cx, cy, rx, ry, -6, 2) + '"/>' +
               '<rect x="' + (cx - rx - 2) + '" y="' + (cy - ry * 0.3) + '" width="5" height="' + (ry * 0.9) + '" rx="2.5"/>' +
               '<rect x="' + (cx + rx - 3) + '" y="' + (cy - ry * 0.3) + '" width="5" height="' + (ry * 0.9) + '" rx="2.5"/>';
      case 3:  /* длинные */
        return '<path d="' + cap(cx, cy, rx, ry, 2, 2.5) + '"/>' +
               '<path d="M' + (cx - rx - 3) + " " + (cy - ry * 0.2) + " q-4 " + (ry * 2.4) + " 6 " + (ry * 2.6) +
               " l7 -3 q-7 -" + (ry * 1.4) + " -5 -" + (ry * 1.5) + " z\"/>" +
               '<path d="M' + (cx + rx + 3) + " " + (cy - ry * 0.2) + " q4 " + (ry * 2.4) + " -6 " + (ry * 2.6) +
               " l-7 -3 q7 -" + (ry * 1.4) + " 5 -" + (ry * 1.5) + " z\"/>";
      case 4:  /* хвост */
        return '<path d="' + cap(cx, cy, rx, ry, 4, 1.5) + '"/>' +
               '<path d="M' + (cx + rx - 2) + " " + (cy - ry * 0.35) + " q" + (rx * 0.75) + " 6 " + (rx * 0.5) + " " + (ry * 1.1) +
               " q-" + (rx * 0.5) + " 4 -" + (rx * 0.55) + " -" + (ry * 0.5) + " z\"/>";
      case 5:  /* кудри */
        p = '<path d="' + cap(cx, cy, rx, ry, 6, 2) + '"/>';
        [[-0.85, -0.5], [-0.45, -0.88], [0, -1.0], [0.45, -0.88], [0.85, -0.5]].forEach(function (c) {
          p += '<circle cx="' + (cx + c[0] * rx) + '" cy="' + (cy + c[1] * ry) + '" r="' + (rx * 0.3) + '"/>';
        });
        return p;
      case 6:  /* афро */
        return '<ellipse cx="' + cx + '" cy="' + (cy - ry * 0.35) + '" rx="' + (rx * 1.42) + '" ry="' + (ry * 1.18) + '"/>';
      case 7:  /* пучок */
        return '<path d="' + cap(cx, cy, rx, ry, 5, 1.5) + '"/>' +
               '<circle cx="' + cx + '" cy="' + (cy - ry - 7) + '" r="' + (rx * 0.36) + '"/>';
      case 8:  /* ирокез */
        return '<path d="' + cap(cx, cy, rx, ry, 14, 0.5) + '"/>' +
               '<path d="M' + (cx - 5) + " " + (cy - ry * 0.95) + " q5 -" + (ry * 0.75) + " 10 0 z\"/>" +
               '<rect x="' + (cx - 4.5) + '" y="' + (cy - ry - 10) + '" width="9" height="' + (ry * 0.5 + 10) + '" rx="3"/>';
      case 9:  return "";   /* лысо */
      case 10: /* чёлка */
        return '<path d="' + cap(cx, cy, rx, ry, 1, 1.5) + '"/>' +
               '<path d="M' + (cx - rx) + " " + (cy - ry * 0.1) + " q" + (rx * 0.9) + " " + (ry * 0.55) + " " + (rx * 1.5) + " -" + (ry * 0.22) +
               " l0 -" + (ry * 0.4) + " q-" + (rx * 0.9) + " -" + (ry * 0.2) + " -" + (rx * 1.5) + " 0 z\"/>";
      case 11: /* волны */
        return '<path d="' + cap(cx, cy, rx, ry, -2, 2.5) + '"/>' +
               '<path d="M' + (cx - rx - 2) + " " + (cy + ry * 0.25) + " q-5 " + (ry * 0.8) + " 4 " + (ry * 1.15) +
               " l6 -4 q-6 -" + (ry * 0.6) + " -4 -" + (ry * 0.75) + " z\"/>" +
               '<path d="M' + (cx + rx + 2) + " " + (cy + ry * 0.25) + " q5 " + (ry * 0.8) + " -4 " + (ry * 1.15) +
               " l-6 -4 q6 -" + (ry * 0.6) + " 4 -" + (ry * 0.75) + " z\"/>";
      case 12: /* боб */
        return '<path d="' + cap(cx, cy, rx, ry, -10, 2) + '"/>';
      case 13: /* два хвоста */
        return '<path d="' + cap(cx, cy, rx, ry, 3, 1.5) + '"/>' +
               '<ellipse cx="' + (cx - rx - 6) + '" cy="' + (cy + ry * 0.25) + '" rx="' + (rx * 0.3) + '" ry="' + (ry * 0.52) + '"/>' +
               '<ellipse cx="' + (cx + rx + 6) + '" cy="' + (cy + ry * 0.25) + '" rx="' + (rx * 0.3) + '" ry="' + (ry * 0.52) + '"/>';
      case 14: /* андеркат */
        return '<path d="' + cap(cx, cy, rx, ry, 12, 1) + '"/>' +
               '<path d="M' + (cx - rx * 0.8) + " " + (cy - ry * 0.62) + " q" + (rx * 0.8) + " -" + (ry * 0.35) + " " + (rx * 1.6) + " 0 l0 -6 q-" +
               (rx * 0.8) + " -" + (ry * 0.2) + " -" + (rx * 1.6) + " 0 z\"/>";
      case 15: /* лохматые */
        p = '<path d="' + cap(cx, cy, rx, ry, 2, 2) + '"/>';
        for (var j = -4; j <= 4; j++) {
          var a = j / 4 * 1.1;
          p += '<path d="M' + (cx + Math.sin(a) * rx * 0.95) + " " + (cy - Math.cos(a) * ry * 0.95) +
               " l" + (Math.sin(a) * 9 + 3) + " " + (-Math.cos(a) * 9) + " l-5 4 z\"/>";
        }
        return p;
      case 16: /* косы */
        return '<path d="' + cap(cx, cy, rx, ry, 3, 1.5) + '"/>' +
               '<path d="M' + (cx - rx - 1) + " " + (cy + ry * 0.1) + " q-6 " + (ry * 0.9) + " -1 " + (ry * 1.5) +
               " l6 -2 q-4 -" + (ry * 0.7) + " 0 -" + (ry * 1.3) + " z\"/>" +
               '<path d="M' + (cx + rx + 1) + " " + (cy + ry * 0.1) + " q6 " + (ry * 0.9) + " 1 " + (ry * 1.5) +
               " l-6 -2 q4 -" + (ry * 0.7) + " 0 -" + (ry * 1.3) + " z\"/>";
      case 17: /* пробор */
        return '<path d="' + cap(cx, cy, rx, ry, 0, 1.5) + '"/>' +
               '<path d="M' + (cx + 1) + " " + (cy - ry) + " l0 " + (ry * 0.45) + " l-3 0 z\" fill=\"#00000030\"/>";
      case 18: /* хвостик */
        return '<path d="' + cap(cx, cy, rx, ry, 5, 1.5) + '"/>' +
               '<path d="M' + (cx + rx * 0.2) + " " + (cy - ry - 2) + " q" + (rx * 0.5) + " -8 " + (rx * 0.7) + " 2 q-" +
               (rx * 0.4) + " 4 -" + (rx * 0.7) + " 2 z\"/>";
      default: /* шапочка */
        return '<path d="' + cap(cx, cy, rx, ry, 8, 2) + '"/>';
    }
  }

  /* ---------- одежда: верх ---------- */
  function torso(x, ty, w, h) {
    var r = Math.min(13, w * 0.24);
    return "M" + x + " " + (ty + h) + " V" + (ty + r) + " q0 -" + r + " " + r + " -" + r +
           " h" + (w - 2 * r) + " q" + r + " 0 " + r + " " + r + " V" + (ty + h) + " Z";
  }
  function topShape(i, cx, ty, w, h, color, dark) {
    var x = cx - w / 2;
    switch (i % 15) {
      case 1: /* худи */
        return '<path d="' + torso(x, ty, w, h) + '" fill="' + color + '"/>' +
               '<path d="M' + (cx - 16) + ' ' + (ty + 4) + ' q16 18 32 0 q-4 -12 -16 -12 q-12 0 -16 12 z" fill="' + dark + '"/>' +
               '<rect x="' + (cx - 1.5) + '" y="' + (ty + 24) + '" width="3" height="' + (h - 34) + '" fill="' + dark + '" opacity=".5"/>';
      case 2: /* рубашка */
        return '<path d="' + torso(x, ty, w, h) + '" fill="' + color + '"/>' +
               '<path d="M' + (cx - 14) + ' ' + (ty + 2) + ' l14 16 l14 -16 l-6 -4 l-8 8 l-8 -8 z" fill="' + dark + '"/>' +
               '<rect x="' + (cx - 1) + '" y="' + (ty + 18) + '" width="2" height="' + (h - 26) + '" fill="' + dark + '" opacity=".55"/>';
      case 3: /* куртка */
        return '<path d="' + torso(x, ty, w, h) + '" fill="' + color + '"/>' +
               '<rect x="' + (cx - 3) + '" y="' + (ty + 6) + '" width="6" height="' + (h - 10) + '" fill="' + dark + '"/>' +
               '<rect x="' + x + '" y="' + (ty + h - 12) + '" width="' + w + '" height="12" fill="' + dark + '" opacity=".75"/>';
      case 4: /* майка */
        return '<path d="' + torso(x + 7, ty + 4, w - 14, h - 4) + '" fill="' + color + '"/>';
      case 6: /* свитер */
        return '<path d="' + torso(x, ty, w, h) + '" fill="' + color + '"/>' +
               '<rect x="' + x + '" y="' + (ty + h - 14) + '" width="' + w + '" height="14" rx="4" fill="' + dark + '"/>' +
               '<path d="M' + (cx - 14) + ' ' + (ty + 4) + ' q14 12 28 0" stroke="' + dark + '" stroke-width="4" fill="none"/>';
      case 9: /* водолазка */
        return '<path d="' + torso(x, ty, w, h) + '" fill="' + color + '"/>' +
               '<rect x="' + (cx - 13) + '" y="' + (ty - 8) + '" width="26" height="14" rx="5" fill="' + color + '"/>';
      case 13: /* пиджак */
        return '<path d="' + torso(x, ty, w, h) + '" fill="' + color + '"/>' +
               '<path d="M' + (cx - 16) + ' ' + (ty + 2) + ' l16 20 l16 -20 l0 ' + h + ' l-32 0 z" fill="' + dark + '" opacity=".25"/>' +
               '<path d="M' + (cx - 15) + ' ' + (ty + 3) + ' l15 19 l15 -19" stroke="' + dark + '" stroke-width="3" fill="none"/>';
      default:
        return '<path d="' + torso(x, ty, w, h) + '" fill="' + color + '"/>' +
               '<path d="M' + (cx - 11) + ' ' + (ty + 2) + ' q11 11 22 0" stroke="' + dark + '" stroke-width="3.5" fill="none"/>';
    }
  }

  /* ---------- низ ---------- */
  function bottomShape(i, cx, by, w, color) {
    var x = cx - w / 2, lw = w / 2 - 2;
    switch (i % 10) {
      case 2: /* шорты */
        return '<path d="M' + x + ' ' + by + ' h' + w + ' v26 h' + (-lw) + ' v-14 h-4 v14 h' + (-lw) + ' z" fill="' + color + '"/>';
      case 3: /* юбка */
        return '<path d="M' + (x + 2) + ' ' + by + ' h' + (w - 4) + ' l8 34 h' + (-(w + 12)) + ' z" fill="' + color + '"/>';
      case 8: /* бермуды */
        return '<path d="M' + x + ' ' + by + ' h' + w + ' v40 h' + (-lw) + ' v-22 h-4 v22 h' + (-lw) + ' z" fill="' + color + '"/>';
      case 9: /* плиссе */
        return '<path d="M' + (x + 2) + ' ' + by + ' h' + (w - 4) + ' l6 30 h' + (-(w + 8)) + ' z" fill="' + color + '"/>' +
               '<path d="M' + (cx - 10) + ' ' + by + ' l-3 30 M' + cx + ' ' + by + ' v30 M' + (cx + 10) + ' ' + by + ' l3 30" stroke="#0003" stroke-width="1.5"/>';
      default:
        return '<path d="M' + x + ' ' + by + ' h' + w + ' v64 h' + (-lw) + ' v-44 h-4 v44 h' + (-lw) + ' z" fill="' + color + '"/>';
    }
  }

  /* ---------- обувь ---------- */
  function shoeShape(i, cx, y, w, color) {
    var lw = w / 2 - 2, x = cx - w / 2;
    var h = (i % 8 === 2 || i % 8 === 4 || i % 8 === 6) ? 13 : 9;
    return '<rect x="' + (x - 2) + '" y="' + y + '" width="' + (lw + 4) + '" height="' + h + '" rx="4" fill="' + color + '"/>' +
           '<rect x="' + (cx + 2) + '" y="' + y + '" width="' + (lw + 4) + '" height="' + h + '" rx="4" fill="' + color + '"/>';
  }

  /* ---------- аксессуары ---------- */
  function accShape(i, hx, hy, r, color) {
    if (i == null || i < 0) return "";
    switch (i % 12) {
      case 0: return '<g fill="none" stroke="#2B2118" stroke-width="2.5"><circle cx="' + (hx - 11) + '" cy="' + (hy + 4) + '" r="8"/>' +
                     '<circle cx="' + (hx + 11) + '" cy="' + (hy + 4) + '" r="8"/><path d="M' + (hx - 3) + ' ' + (hy + 4) + ' h6"/></g>';
      case 1: return '<path d="M' + (hx - r - 1) + ' ' + (hy - 6) + ' q' + (r + 1) + ' -' + (r * 1.2) + ' ' + (2 * r + 2) + ' 0 z" fill="' + color + '"/>' +
                     '<rect x="' + (hx - r - 10) + '" y="' + (hy - 8) + '" width="' + (2 * r + 20) + '" height="6" rx="3" fill="' + color + '"/>';
      case 2: return '<g fill="none" stroke="#2B2118" stroke-width="5"><path d="M' + (hx - r - 2) + ' ' + (hy + 2) + ' a' + (r + 2) + ' ' + (r + 2) + ' 0 0 1 ' + (2 * r + 4) + ' 0"/></g>' +
                     '<rect x="' + (hx - r - 8) + '" y="' + (hy - 2) + '" width="10" height="18" rx="5" fill="#2B2118"/>' +
                     '<rect x="' + (hx + r - 2) + '" y="' + (hy - 2) + '" width="10" height="18" rx="5" fill="#2B2118"/>';
      case 3: return '<rect x="' + (hx + 26) + '" y="' + (hy + 70) + '" width="26" height="22" rx="5" fill="' + color + '"/>' +
                     '<path d="M' + (hx + 2) + ' ' + (hy + 34) + ' l32 38" stroke="' + color + '" stroke-width="4" fill="none"/>';
      case 4: return '<path d="M' + (hx - r - 2) + ' ' + (hy - 2) + ' q' + (r + 2) + ' -' + (r * 1.3) + ' ' + (2 * r + 4) + ' 0 z" fill="' + color + '"/>' +
                     '<rect x="' + (hx - r - 2) + '" y="' + (hy - 6) + '" width="' + (2 * r + 4) + '" height="8" rx="4" fill="' + color + '"/>' +
                     '<circle cx="' + hx + '" cy="' + (hy - r - 8) + '" r="6" fill="' + color + '"/>';
      case 5: return '<path d="M' + (hx - 20) + ' ' + (hy + 28) + ' q20 10 40 0 v10 q-20 10 -40 0 z" fill="' + color + '"/>';
      case 7: return '<rect x="' + (hx - 20) + '" y="' + (hy + 6) + '" width="40" height="14" rx="7" fill="#DCE6EF"/>';
      case 8: return '<rect x="' + (hx - r - 1) + '" y="' + (hy - 10) + '" width="' + (2 * r + 2) + '" height="10" rx="4" fill="' + color + '"/>';
      case 10: return '<rect x="' + (hx - r - 1) + '" y="' + (hy - 12) + '" width="' + (2 * r + 2) + '" height="7" rx="3" fill="' + color + '"/>';
      default: return '<circle cx="' + (hx - r + 2) + '" cy="' + (hy + 12) + '" r="3" fill="' + color + '"/>' +
                      '<circle cx="' + (hx + r - 2) + '" cy="' + (hy + 12) + '" r="3" fill="' + color + '"/>';
    }
  }

  /* ---------- лицо ---------- */
  function face(cfg, hx, hy, pose) {
    var s = "";
    var ey = hy + 3, dx = 11;
    var tired = pose.mouth === "tired";

    /* глаза */
    if (tired) {
      s += '<path d="M' + (hx - dx - 6) + ' ' + ey + ' q6 5 12 0" stroke="#2B2118" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
      s += '<path d="M' + (hx + dx - 6) + ' ' + ey + ' q6 5 12 0" stroke="#2B2118" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    } else {
      var e = cfg.eyes % EYES;
      var rw = [3.2, 3.8, 2.8, 4.2, 3.4, 3.0][e], rh = [3.6, 3.2, 4.2, 3.4, 4.6, 3.8][e];
      s += '<ellipse cx="' + (hx - dx) + '" cy="' + ey + '" rx="' + rw + '" ry="' + rh + '" fill="#2B2118"/>';
      s += '<ellipse cx="' + (hx + dx) + '" cy="' + ey + '" rx="' + rw + '" ry="' + rh + '" fill="#2B2118"/>';
      s += '<circle cx="' + (hx - dx + 1.2) + '" cy="' + (ey - 1.2) + '" r="1.1" fill="#fff" opacity=".9"/>';
      s += '<circle cx="' + (hx + dx + 1.2) + '" cy="' + (ey - 1.2) + '" r="1.1" fill="#fff" opacity=".9"/>';
    }

    /* брови */
    var b = cfg.brows % BROWS, lift = pose.brow * 1.6;
    var by = ey - 10 + lift;
    var bshape = [
      'q6 -3 12 0', 'q6 -4.5 12 0', 'q6 -1 12 0', 'q6 -3 12 1.5', 'q6 -2 12 -1.5'
    ][b];
    s += '<path d="M' + (hx - dx - 6) + ' ' + by + ' ' + bshape + '" stroke="#2B2118" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>';
    s += '<path d="M' + (hx + dx - 6) + ' ' + by + ' ' + bshape + '" stroke="#2B2118" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>';

    /* нос */
    var n = cfg.nose % NOSES, ny = hy + 12;
    if (n === 1) s += '<path d="M' + hx + ' ' + (ny - 3) + ' v5" stroke="#00000055" stroke-width="2" stroke-linecap="round"/>';
    else if (n === 2) s += '<path d="M' + (hx - 2) + ' ' + ny + ' q2 3 4 0" stroke="#00000055" stroke-width="2" fill="none" stroke-linecap="round"/>';
    else if (n === 3) s += '<circle cx="' + hx + '" cy="' + ny + '" r="1.8" fill="#00000033"/>';
    else if (n === 4) s += '<path d="M' + (hx - 1) + ' ' + (ny - 4) + ' v4 q1 2 3 1" stroke="#00000055" stroke-width="1.8" fill="none" stroke-linecap="round"/>';

    /* рот */
    var my = hy + 21;
    if (pose.mouth === "smile") s += '<path d="M' + (hx - 8) + ' ' + my + ' q8 8 16 0" stroke="#2B2118" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    else if (pose.mouth === "tired") s += '<path d="M' + (hx - 6) + ' ' + (my + 2) + ' q6 -4 12 0" stroke="#2B2118" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    else {
      var m = cfg.mouth % MOUTHS;
      var mp = ['q7 4 14 0', 'q7 2 14 0', 'h14', 'q7 5 14 0', 'q7 3 14 1', 'q7 1 14 0'][m];
      s += '<path d="M' + (hx - 7) + ' ' + my + ' ' + mp + '" stroke="#2B2118" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    }
    return s;
  }

  /* ---------- сцена погоды ---------- */
  function weatherLayer(code, w, h) {
    var s = "";
    if (code === "sun") {
      s += '<circle cx="' + (w - 46) + '" cy="46" r="20" fill="#FFD166"/>';
      s += '<circle cx="' + (w - 46) + '" cy="46" r="31" fill="#FFD166" opacity=".22"/>';
      s += '<circle cx="' + (w - 46) + '" cy="46" r="42" fill="#FFD166" opacity=".11"/>';
    } else if (code === "part") {
      s += '<circle cx="' + (w - 52) + '" cy="42" r="17" fill="#FFD166"/>';
      s += cloud(w - 92, 52, 1);
    } else if (code === "cloud") {
      s += cloud(38, 44, .95) + cloud(w - 120, 70, 1.15);
    } else if (code === "rain") {
      s += cloud(30, 38, 1.1) + cloud(w - 130, 60, .95);
      for (var i = 0; i < 16; i++) {
        var x = 18 + (i * 37) % (w - 36), y = 84 + (i * 53) % (h - 150);
        s += '<line x1="' + x + '" y1="' + y + '" x2="' + (x - 3) + '" y2="' + (y + 13) + '" stroke="#7E93AC" stroke-width="2.2" stroke-linecap="round" opacity=".65">' +
             '<animate attributeName="y1" values="' + y + ';' + (y + 70) + '" dur="' + (0.8 + (i % 4) * 0.15) + 's" repeatCount="indefinite"/>' +
             '<animate attributeName="y2" values="' + (y + 13) + ';' + (y + 83) + '" dur="' + (0.8 + (i % 4) * 0.15) + 's" repeatCount="indefinite"/></line>';
      }
    } else if (code === "snow") {
      s += cloud(26, 34, 1.15) + cloud(w - 125, 56, 1);
      for (var j = 0; j < 22; j++) {
        var sx = 14 + (j * 41) % (w - 28), sy = 70 + (j * 67) % (h - 130), r = 2 + (j % 3);
        s += '<circle cx="' + sx + '" cy="' + sy + '" r="' + r + '" fill="#FFFFFF" opacity=".85">' +
             '<animate attributeName="cy" values="' + sy + ';' + (sy + 90) + '" dur="' + (2.6 + (j % 5) * 0.4) + 's" repeatCount="indefinite"/>' +
             '<animate attributeName="cx" values="' + sx + ';' + (sx + 10) + ';' + sx + '" dur="' + (2 + (j % 3)) + 's" repeatCount="indefinite"/></circle>';
      }
    }
    return s;
  }
  function cloud(x, y, k) {
    k = k || 1;
    return '<g opacity=".92" transform="translate(' + x + ',' + y + ') scale(' + k + ')" fill="#FFFFFF">' +
           '<ellipse cx="26" cy="16" rx="26" ry="14"/><ellipse cx="48" cy="12" rx="19" ry="13"/>' +
           '<ellipse cx="68" cy="18" rx="17" ry="11"/></g>';
  }

  /* =======================================================================
     Главная функция отрисовки
     ======================================================================= */
  function render(cfg, opts) {
    opts = opts || {};
    var W = 200, H = 340;
    var weather = opts.weather || "part";
    var pose = POSES[weather] || POSES.part;
    var showScene = opts.scene !== false;
    var sky = SKY[weather] || SKY.part;

    var build = BUILDS[(cfg.build != null ? cfg.build : 1) % BUILDS.length];
    var skin = SKIN[(cfg.skin || 0) % SKIN.length];
    var skinDark = shade(skin, -0.12);
    var hairC = HAIRC[(cfg.hairColor || 0) % HAIRC.length];
    var topC = CLOTH[(cfg.topColor || 0) % CLOTH.length];
    var topD = shade(topC, -0.22);
    var sleeveC = shade(topC, -0.1);
    var botC = BOTTOM[(cfg.bottomColor || 0) % BOTTOM.length];
    var shoeC = SHOEC[(cfg.shoesColor || 0) % SHOEC.length];
    var accC = CLOTH[(cfg.accColor != null ? cfg.accColor : 5) % CLOTH.length];

    var hx = 100, hr = 28;
    var hy = 76 + pose.shoulder * 0.5;
    var faceShape = (cfg.face || 0) % FACES;
    var rx = hr * [1, 0.94, 1.06, 0.98, 1.02][faceShape];
    var ry = hr * [1, 1.06, 0.95, 1.02, 0.98][faceShape];

    var torsoW = 50 * build.w;
    var torsoTop = hy + ry + 10;
    var torsoH = 74;
    var hipY = torsoTop + torsoH;
    var legH = 62;
    var footY = hipY + legH;
    var armW = 13;
    var sx = torsoW / 2 - 2;             // плечо от центра
    var armLen = 56;

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">';

    if (showScene) {
      s += '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
           '<stop offset="0%" stop-color="' + sky[0] + '"/><stop offset="100%" stop-color="' + sky[1] + '"/>' +
           '</linearGradient></defs>';
      s += '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';
      s += weatherLayer(weather, W, H);
      s += '<ellipse cx="100" cy="' + (footY + 11) + '" rx="' + (40 * build.w) + '" ry="8" fill="#00000016"/>';
    }

    var cls = showScene ? "breathe" : "";
    s += '<g class="' + cls + '" transform="rotate(' + (-pose.lean * 0.7) + ' 100 ' + footY + ')">';

    /* ноги */
    var legGap = torsoW * 0.2;
    s += '<rect x="' + (hx - legGap - 8) + '" y="' + (hipY + 44) + '" width="16" height="' + (legH - 40) + '" fill="' + skin + '"/>';
    s += '<rect x="' + (hx + legGap - 8) + '" y="' + (hipY + 44) + '" width="16" height="' + (legH - 40) + '" fill="' + skin + '"/>';
    s += bottomShape(cfg.bottom || 0, hx, hipY - 4, torsoW * 0.92, botC);
    s += shoeShape(cfg.shoes || 0, hx, footY - 2, torsoW * 0.95, shoeC);

    /* руки — вместе с кистью, чтобы не отрывались при повороте */
    /* длина рукава зависит от типа верха: футболка и майка — короткий */
    var shortSleeve = [0, 4, 7, 12].indexOf((cfg.top || 0) % 15) >= 0;
    var sleeveLen = shortSleeve ? armLen * 0.4 : armLen * 0.86;
    function arm(side) {
      var px = hx + side * sx, py = torsoTop + 12;
      var ang = side * pose.arm;
      return '<g transform="rotate(' + ang + ' ' + px + ' ' + py + ')">' +
        '<rect x="' + (px - armW / 2 + 1) + '" y="' + (py - armW / 2) + '" width="' + (armW - 2) + '" height="' + armLen +
        '" rx="' + (armW / 2 - 1) + '" fill="' + skin + '"/>' +
        '<rect x="' + (px - armW / 2) + '" y="' + (py - armW / 2) + '" width="' + armW + '" height="' + sleeveLen +
        '" rx="' + (armW / 2) + '" fill="' + sleeveC + '"/>' +
        '<circle cx="' + px + '" cy="' + (py + armLen - armW / 2 - 1) + '" r="6.5" fill="' + skin + '"/></g>';
    }
    s += arm(-1) + arm(1);

    /* корпус */
    s += topShape(cfg.top || 0, hx, torsoTop, torsoW, torsoH, topC, topD);

    /* шея */
    s += '<rect x="' + (hx - 7) + '" y="' + (hy + ry - 7) + '" width="14" height="16" rx="3" fill="' + skinDark + '"/>';

    /* голова */
    s += '<g transform="rotate(' + pose.tilt + ' ' + hx + ' ' + (hy + ry) + ')">';
    s += '<ellipse cx="' + hx + '" cy="' + hy + '" rx="' + esc(rx) + '" ry="' + esc(ry) + '" fill="' + skin + '"/>';
    s += '<circle cx="' + (hx - rx + 1) + '" cy="' + (hy + 5) + '" r="4.5" fill="' + skinDark + '"/>';
    s += '<circle cx="' + (hx + rx - 1) + '" cy="' + (hy + 5) + '" r="4.5" fill="' + skinDark + '"/>';
    s += face(cfg, hx, hy, pose);
    s += '<g fill="' + hairC + '">' + hairPath(cfg.hair || 0, hx, hy, rx, ry) + '</g>';
    s += accShape(cfg.accessory, hx, hy, rx, accC);
    s += '</g>';

    s += '</g>';
    s += '</svg>';
    return s;
  }

  /* маленький портрет для аватара */
  function portrait(cfg) {
    var skin = SKIN[(cfg.skin || 0) % SKIN.length];
    var hairC = HAIRC[(cfg.hairColor || 0) % HAIRC.length];
    var s = '<svg viewBox="40 40 120 90" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect x="40" y="40" width="120" height="90" fill="' + shade(skin, .55) + '"/>';
    s += '<ellipse cx="100" cy="92" rx="30" ry="30" fill="' + skin + '"/>';
    s += face(cfg, 100, 92, POSES.part);
    s += '<g fill="' + hairC + '">' + hairPath(cfg.hair || 0, 100, 92, 29, 29) + '</g>';
    s += '</svg>';
    return s;
  }

  function shade(hex, amt) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    function p(v) {
      v = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
      v = Math.max(0, Math.min(255, Math.round(v)));
      return (v < 16 ? "0" : "") + v.toString(16);
    }
    return "#" + p(r) + p(g) + p(b);
  }

  function randomConfig() {
    function ri(n) { return Math.floor(Math.random() * n); }
    return {
      build: ri(3), skin: ri(SKIN.length), face: ri(FACES), eyes: ri(EYES), brows: ri(BROWS),
      nose: ri(NOSES), mouth: ri(MOUTHS), hair: ri(HAIRS.length), hairColor: ri(HAIRC.length),
      top: ri(TOPS.length), topColor: ri(CLOTH.length), bottom: ri(BOTTOMS.length),
      bottomColor: ri(BOTTOM.length), shoes: ri(SHOES.length), shoesColor: ri(SHOEC.length),
      accessory: Math.random() < 0.45 ? ri(ACCS.length) : -1, accColor: ri(CLOTH.length)
    };
  }

  global.Character = {
    render: render, portrait: portrait, randomConfig: randomConfig, shade: shade,
    SKIN: SKIN, HAIRC: HAIRC, CLOTH: CLOTH, BOTTOM: BOTTOM, SHOEC: SHOEC,
    BUILDS: BUILDS, HAIRS: HAIRS, TOPS: TOPS, BOTTOMS: BOTTOMS, SHOES: SHOES, ACCS: ACCS,
    EYES: EYES, BROWS: BROWS, NOSES: NOSES, MOUTHS: MOUTHS, FACES: FACES
  };
})(typeof window !== "undefined" ? window : globalThis);

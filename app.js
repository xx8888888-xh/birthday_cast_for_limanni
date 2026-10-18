/* ============================================================
   生日快乐贺卡 · 交互逻辑（可爱治愈风 · 手机优先）
   - 纯前端判断“今天是否为 11 月 16 日”（读取访问者本地时间）
   - 信封开场 / 点蜡烛 / 吹蜡烛 / 点击蛋糕掉落随机祝福
   - “我真的很好奇到底长啥样”是骗人的按钮：弹出可爱弹窗，不跳转
   - 生日歌播放真实 MP3（assets/track-1115.mp3，Mixkit 免费可商用）
   - 彩带 / 烟花 / 爱心复用 canvas-confetti (MIT)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 配置 ---------- */
  var BIRTHDAY = { month: 11, day: 16 }; // 11 月 16 日（自然月，非 0 起始）
  var NAME = "李曼妮";
  var SONG_SRC = "assets/track-1115.mp3";
  var IS_PREVIEW = /(?:\?|&)preview=1/.test(window.location.search) ||
                   window.location.hash === "#birthday";

  /* ---------- 小工具 ---------- */
  var $ = function (sel) { return document.querySelector(sel); };
  var rnd = function (min, max) { return Math.random() * (max - min) + min; };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 马卡龙色系，与页面主题一致 */
  var PALETTE = ["#ff8fab", "#ffb6c9", "#ffd6e0", "#ffd97d", "#9fd8c4", "#dcc8f0", "#ffffff"];
  var HEART_CHARS = ["♥", "♡", "♡"];

  /* ---------- 日期判断（纯前端） ---------- */
  function isBirthdayToday(now) {
    now = now || new Date();
    return (now.getMonth() + 1) === BIRTHDAY.month && now.getDate() === BIRTHDAY.day;
  }

  function nextBirthday(now) {
    now = now || new Date();
    var y = now.getFullYear();
    var target = new Date(y, BIRTHDAY.month - 1, BIRTHDAY.day, 0, 0, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target = new Date(y + 1, BIRTHDAY.month - 1, BIRTHDAY.day, 0, 0, 0, 0);
    }
    return target;
  }

  var IS_BIRTHDAY = isBirthdayToday() || IS_PREVIEW;

  /* ---------- 提示气泡 ---------- */
  var toastEl = null, toastTimer = null;
  function showToast(text, ms) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    void toastEl.offsetWidth; // 触发重排以便重新播放动画
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 3200);
  }

  /* ---------- 粒子 ---------- */
  function sparkle(x, y, color, size, duration) {
    var p = document.createElement("i");
    color = color || "#ffb6c9";
    size = size || 10;
    Object.assign(p.style, {
      position: "fixed", left: x + "px", top: y + "px",
      width: size + "px", height: size + "px",
      background: color, borderRadius: "50%",
      boxShadow: "0 0 " + size * 2 + "px " + color,
      pointerEvents: "none", zIndex: 60
    });
    document.body.appendChild(p);
    p.animate(
      [{ transform: "scale(1) rotate(0deg)", opacity: 1 },
       { transform: "scale(1.8) rotate(180deg)", opacity: 0.9 },
       { transform: "scale(0) rotate(360deg)", opacity: 0 }],
      { duration: duration || 700, easing: "cubic-bezier(0.4,0,0.2,1)" }
    ).onfinish = function () { p.remove(); };
  }

  function burstSparkles(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      (function (i) {
        setTimeout(function () {
          var a = Math.random() * Math.PI * 2;
          var d = rnd(12, 60);
          sparkle(x + Math.cos(a) * d, y + Math.sin(a) * d, color || "#ffb6c9", rnd(6, 12), rnd(500, 900));
        }, i * 28);
      })(i);
    }
  }

  /* ---------- 爱心 ---------- */
  function heartFX(count) {
    for (var i = 0; i < (count || 18); i++) {
      (function (i) {
        setTimeout(function () {
          var h = document.createElement("span");
          var size = rnd(12, 26);
          h.style.cssText =
            "position:fixed;left:" + rnd(6, 94) + "vw;bottom:-40px;width:" + size + "px;height:" + size +
            "px;background:" + pick(["#ff8fab", "#ffb6c9", "#ffd97d"]) +
            ";transform:rotate(45deg);pointer-events:none;z-index:55;border-radius:4px;";
          h.innerHTML =
            '<i style="position:absolute;width:100%;height:100%;border-radius:50%;background:inherit;left:-50%;top:0"></i>' +
            '<i style="position:absolute;width:100%;height:100%;border-radius:50%;background:inherit;top:-50%;left:0"></i>';
          document.body.appendChild(h);
          h.animate(
            [{ transform: "translateY(0) rotate(45deg) scale(0.6)", opacity: 0 },
             { transform: "translateY(-40vh) rotate(45deg) scale(1)", opacity: 1, offset: 0.2 },
             { transform: "translateY(-105vh) rotate(45deg) scale(1)", opacity: 0 }],
            { duration: rnd(3200, 5200), easing: "ease-out" }
          ).onfinish = function () { h.remove(); };
        }, i * 90);
      })(i);
    }
  }

  /* ---------- 彩带 / 烟花 / 爱心（canvas-confetti） ---------- */
  function hasConfetti() { return typeof window.confetti === "function"; }

  function effectConfetti() {
    if (!hasConfetti()) return;
    window.confetti({ particleCount: 110, spread: 78, startVelocity: 44, origin: { y: 0.62 }, colors: PALETTE });
    setTimeout(function () {
      window.confetti({ particleCount: 55, spread: 100, origin: { x: 0.15, y: 0.7 }, colors: PALETTE });
      window.confetti({ particleCount: 55, spread: 100, origin: { x: 0.85, y: 0.7 }, colors: PALETTE });
    }, 180);
  }

  function effectFireworks(duration) {
    if (!hasConfetti()) return;
    var end = Date.now() + (duration || 2400);
    (function frame() {
      window.confetti({ particleCount: 8, spread: 360, startVelocity: rnd(20, 40), gravity: 0.9,
        ticks: 90, origin: { x: rnd(0.15, 0.85), y: rnd(0.15, 0.5) }, colors: PALETTE, scalar: rnd(0.8, 1.2) });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  function effectStars() {
    if (!hasConfetti()) return;
    window.confetti({ particleCount: 80, spread: 360, startVelocity: 28, shapes: ["star"], colors: ["#ffd97d", "#ffffff", "#ffb6c9"] });
  }

  function effectRain() {
    if (!hasConfetti()) return;
    var end = Date.now() + 1600;
    (function frame() {
      window.confetti({ particleCount: 6, angle: 90, spread: 60, startVelocity: 0, gravity: 0.6,
        ticks: 200, origin: { x: rnd(0, 1), y: -0.1 }, colors: PALETTE });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  function effectHearts() {
    if (!hasConfetti()) return;
    window.confetti({ particleCount: 40, spread: 100, startVelocity: 32, gravity: 0.7,
      origin: { y: 0.6 }, colors: ["#ff8fab", "#ffb6c9", "#ffd6e0"], shapes: ["heart"], scalar: 1.4 });
  }

  function effectBalloons() { spawnBalloons(14); }

  /* ---------- 背景：漂浮的小爱心 ---------- */
  function buildBackground() {
    var wrap = $("#hearts");
    if (!wrap) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 16; i++) {
      var h = document.createElement("i");
      var size = rnd(10, 22);
      h.textContent = pick(HEART_CHARS);
      h.style.left = rnd(0, 100) + "vw";
      h.style.fontSize = size + "px";
      h.style.color = pick(["#ffb6c9", "#ffd6e0", "#ffd97d", "#dcc8f0", "#9fd8c4"]);
      h.style.opacity = 0;
      h.style.animationDuration = rnd(12, 22) + "s";
      h.style.animationDelay = rnd(0, 14) + "s";
      frag.appendChild(h);
    }
    wrap.appendChild(frag);
  }

  /* ---------- 气球 ---------- */
  function spawnBalloons(n) {
    if (reduceMotion) return;
    for (var i = 0; i < (n || 8); i++) {
      (function (i) {
        setTimeout(function () {
          var b = document.createElement("div");
          b.className = "balloon";
          b.style.left = rnd(3, 95) + "vw";
          b.style.background = "radial-gradient(circle at 34% 30%, #fff, " + pick(["#ffb6c9", "#ffd97d", "#9fd8c4", "#dcc8f0"]) + " 68%)";
          b.style.animationDuration = rnd(9, 15) + "s";
          document.body.appendChild(b);
          setTimeout(function () { b.remove(); }, 16000);
        }, i * 180);
      })(i);
    }
  }

  /* ---------- 生日歌：真实 MP3 ---------- */
  var music = {
    el: null, playing: false,
    ensure: function () {
      if (!this.el) {
        this.el = new Audio(SONG_SRC);
        this.el.loop = true;
        this.el.preload = "auto";
        this.el.volume = 0.7;
      }
      return this.el;
    },
    start: function () {
      var el = this.ensure();
      el.play().then(function () {
        music.playing = true;
        syncMusicBtn();
      }).catch(function () {
        // 浏览器可能因缺少用户手势而拒绝，交由按钮兜底
        music.playing = false;
        syncMusicBtn();
      });
    },
    stop: function () {
      if (this.el) this.el.pause();
      this.playing = false;
      syncMusicBtn();
    },
    toggle: function () {
      if (this.playing) { this.stop(); return false; }
      this.start();
      return true;
    }
  };

  /* ---------- 祝福内容（可爱治愈） ---------- */
  var WISHES = [
    "愿你的每一天，都像蛋糕一样甜～",
    "愿喜欢的人，恰好也喜欢你！",
    "愿你今天比昨天多笑一次！",
    "愿好运一直黏着你，甩都甩不掉～",
    "愿你眼里有光，心里有糖。",
    "愿你把烦恼都吃掉，长胖一点点也没关系！",
    "愿你不用逞强，也被温柔以待。",
    "愿你的这一年，每一天都比前一天更精彩！"
  ];

  var CARDS = [
    { num: "01", tt: "关于你的心情", back: "愿你像小猫咪一样，想睡就睡，醒来还有小鱼干。" },
    { num: "02", tt: "关于你的日子", back: "愿你的每一天，都像马卡龙一样甜甜软软。" },
    { num: "03", tt: "关于你的未来", back: "愿你想去的地方，都有人陪你一起抵达。" },
    { num: "04", tt: "关于你的愿望", back: "愿你想要的都拥有，得不到的都变成新的期待。" }
  ];

  function buildWishCards() {
    var wrap = $("#wishes");
    if (!wrap) return;
    CARDS.forEach(function (c, i) {
      var card = document.createElement("div");
      card.className = "flip";
      card.style.transitionDelay = (i * 0.09) + "s";
      card.innerHTML =
        '<div class="flip-inner">' +
          '<div class="flip-face flip-front">' +
            '<span class="num">' + c.num + '</span>' +
            '<span class="tt">' + c.tt + '</span>' +
            '<span class="hint">点一下翻开 ♡</span>' +
          '</div>' +
          '<div class="flip-face flip-back">' + c.back + '</div>' +
        '</div>';
      card.addEventListener("click", function () {
        card.classList.toggle("flipped");
        if (card.classList.contains("flipped")) {
          var r = card.getBoundingClientRect();
          burstSparkles(r.left + r.width / 2, r.top + r.height / 2, 8);
        }
      });
      wrap.appendChild(card);
    });
  }

  /* ---------- 打字机 ---------- */
  function typewriter(el, text, speed) {
    el.innerHTML = '<span class="caret"></span>';
    var span = document.createElement("span");
    el.insertBefore(span, el.firstChild);
    var i = 0;
    (function step() {
      if (i <= text.length) {
        span.textContent = text.slice(0, i);
        i++;
        setTimeout(step, speed || 50);
      }
    })();
  }

  /* ---------- 倒计时 ---------- */
  function startCountdown() {
    var dEl = $("#cdD"), hEl = $("#cdH"), mEl = $("#cdM"), sEl = $("#cdS");
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var now = new Date();
      if (isBirthdayToday(now)) { location.reload(); return; }
      var diff = nextBirthday(now).getTime() - now.getTime();
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      dEl.textContent = d; hEl.textContent = pad(h); mEl.textContent = pad(m); sEl.textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 蜡烛 ---------- */
  var cake = null, blowBtn = null, candlesBlown = false;

  function lightCandles() {
    if (!cake) return;
    cake.classList.remove("blown");
    cake.classList.add("lit");
    candlesBlown = false;
    if (blowBtn) blowBtn.disabled = false;
  }

  function blowCandles() {
    if (!cake || candlesBlown) return;
    candlesBlown = true;
    cake.classList.remove("smoke-run");
    void cake.offsetWidth;
    cake.classList.remove("lit");
    cake.classList.add("blown", "smoke-run");
    if (blowBtn) blowBtn.disabled = true;

    var r = cake.getBoundingClientRect();
    effectConfetti();
    effectFireworks(2000);
    burstSparkles(r.left + r.width / 2, r.top + r.height / 2 - 40, 22, "#ffd97d");
    setTimeout(function () { showToast("愿望已经替你送出去了，一定会实现的！", 4200); }, 420);
    setTimeout(function () { showToast("生日快乐，" + NAME + " ♡", 5000); }, 4800);
  }

  var EFFECTS = [effectConfetti, effectFireworks, effectStars, effectRain, effectHearts, effectBalloons, function () { heartFX(16); }];

  function clickCake() {
    if (!cake) return;
    cake.classList.add("pop");
    setTimeout(function () { cake.classList.remove("pop"); }, 240);
    var r = cake.getBoundingClientRect();
    burstSparkles(r.left + r.width / 2, r.top + r.height / 2, 12);
    pick(EFFECTS)();
    showToast(pick(WISHES));
  }

  /* ---------- 开场信封 ---------- */
  function openEnvelope() {
    var screen = $("#envelopeScreen"), env = $("#envelope"), content = $("#cardContent");
    if (!env || env.classList.contains("opening")) return;
    env.classList.add("opening");

    var flash = document.createElement("div");
    flash.style.cssText = "position:fixed;inset:0;background:#fff;z-index:35;pointer-events:none;opacity:0;";
    document.body.appendChild(flash);
    flash.animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: 520, easing: "ease-out" })
      .onfinish = function () { flash.remove(); };

    setTimeout(function () { effectConfetti(); effectHearts(); }, 620);

    setTimeout(function () {
      screen.classList.add("hidden");
      content.setAttribute("aria-hidden", "false");
      content.classList.add("visible");
      revealSections();
      if (IS_BIRTHDAY) {
        setTimeout(effectFireworks, 300);
        setTimeout(effectFireworks, 1500);
      }
    }, 1150);

    // 在用户手势内预加载并启动真实生日歌（浏览器允许自动播放）
    if (IS_BIRTHDAY) {
      music.ensure();
      setTimeout(function () { setMusic(true); }, 900);
    }
  }

  function revealSections() {
    var nodes = document.querySelectorAll(".card, .flip");
    Array.prototype.forEach.call(nodes, function (n, i) {
      setTimeout(function () { n.classList.add("reveal"); }, 120 + i * 110);
    });
  }

  /* ---------- 音乐按钮 ---------- */
  var musicBtn = null;
  function syncMusicBtn() {
    if (!musicBtn) return;
    musicBtn.classList.toggle("playing", music.playing);
    musicBtn.querySelector("span").textContent = music.playing ? "生日歌 播放中" : "生日歌";
  }

  function setMusic(on) {
    if (!musicBtn) return;
    if (on === undefined) {
      music.toggle();
    } else if (on) {
      if (!music.playing) music.start();
    } else {
      music.stop();
    }
    syncMusicBtn();
  }

  /* ---------- 骗人的预览按钮 ---------- */
  function initTrick() {
    var btn = $("#previewBtn"), modal = $("#trickModal"), close = $("#modalClose");
    if (!btn || !modal) return;
    var escHandler = function (e) { if (e.key === "Escape") closeTrick(); };

    function openTrick() {
      modal.hidden = false;
      modal.focus();
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", escHandler);
      effectHearts();
      setTimeout(function () { showToast("骗到你了吧！嘿嘿 (๑˃ᴗ˂)ﻭ"); }, 250);
    }
    function closeTrick() {
      modal.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", escHandler);
    }

    btn.addEventListener("click", openTrick);
    if (close) close.addEventListener("click", closeTrick);
    modal.addEventListener("click", function (e) {
      if (e.target === modal || !e.target.closest(".modal-card")) closeTrick();
    });
    modal.setAttribute("tabindex", "-1");
  }

  /* ---------- 初始化 ---------- */
  function init() {
    buildBackground();
    buildWishCards();
    initTrick();

    cake = $("#cake");
    blowBtn = $("#blowBtn");
    musicBtn = $("#musicBtn");

    var env = $("#envelope");
    if (env) {
      env.addEventListener("click", openEnvelope);
      env.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelope(); }
      });
    }

    var bEl = $("#statusBirthday"), cEl = $("#statusCountdown");
    if (IS_BIRTHDAY) {
      if (bEl) bEl.hidden = false;
      if (cEl) cEl.hidden = true;
      lightCandles();
    } else {
      if (bEl) bEl.hidden = true;
      if (cEl) cEl.hidden = false;
      startCountdown();
    }

    if (cake) {
      cake.addEventListener("click", clickCake);
      cake.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickCake(); }
      });
    }
    if (blowBtn) blowBtn.addEventListener("click", blowCandles);

    if (musicBtn) {
      musicBtn.addEventListener("click", function () { setMusic(); });
      musicBtn.style.display = "inline-flex";
    }

    var sub = $("#heroSub");
    if (sub) {
      if (IS_PREVIEW && !isBirthdayToday()) {
        var now = new Date();
        typewriter(sub, "预览模式 · 今天是 " + now.getFullYear() + " 年 " + (now.getMonth() + 1) + " 月 " + now.getDate() + " 日，蜡烛提前为你亮起啦。", 40);
      } else if (IS_BIRTHDAY) {
        typewriter(sub, "今天是 " + BIRTHDAY.month + " 月 " + BIRTHDAY.day + " 日。生日快乐，" + NAME + "！这一天专门为你而来 ♡", 45);
      } else {
        var n2 = new Date();
        typewriter(sub, "今天是 " + n2.getFullYear() + " 年 " + (n2.getMonth() + 1) + " 月 " + n2.getDate() + " 日，这张卡片正在偷偷倒数，等 " + BIRTHDAY.month + " 月 " + BIRTHDAY.day + " 日。", 40);
      }
    }

    if (!reduceMotion) {
      spawnBalloons(6);
      setInterval(function () { spawnBalloons(3); }, 7000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

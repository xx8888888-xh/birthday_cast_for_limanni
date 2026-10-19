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

  /* 手帐风配色，与页面主题一致 */
  var PALETTE = ["#f6a2b6", "#ffe6ee", "#f6cf7b", "#8ed3bd", "#c8b5e6", "#a9cfe6", "#fffdf8"];
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

  /* 11 月 16 日（含）之后才解锁。
     解锁一次后会记在本地，避免过完生日又被重新锁上；
     只有 ?preview=1 / #birthday 这种「特殊技术手段」才能提前打开。 */
  var UNLOCK_KEY = "limanni-1116-unlocked";
  function hasBirthdayArrived(now) {
    now = now || new Date();
    var m = now.getMonth() + 1;
    if (m > BIRTHDAY.month) return true;
    if (m === BIRTHDAY.month && now.getDate() >= BIRTHDAY.day) return true;
    return false;
  }
  function isUnlocked() {
    if (IS_PREVIEW) return true;
    if (hasBirthdayArrived()) {
      try { localStorage.setItem(UNLOCK_KEY, "1"); } catch (e) { /* 忽略 */ }
      return true;
    }
    try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch (e) { return false; }
  }
  var IS_UNLOCKED = isUnlocked();

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

  function effectHearts() {
    if (!hasConfetti()) return;
    window.confetti({ particleCount: 40, spread: 100, startVelocity: 32, gravity: 0.7,
      origin: { y: 0.6 }, colors: ["#d8557a", "#f6a2b6", "#ffe6ee"], shapes: ["heart"], scalar: 1.4 });
  }

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
          b.style.background = pick(["#f6a2b6", "#f6cf7b", "#8ed3bd", "#c8b5e6", "#a9cfe6"]);
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

  /* ---------- 祝福抽奖池（文字祝福 + 蛋糕照片，完全随机） ---------- */
  var LOTTERY = [
    { type: "text", icon: "🍰", text: "愿你的每一天，都像蛋糕一样甜～" },
    { type: "text", icon: "💖", text: "愿喜欢的人，恰好也喜欢你！" },
    { type: "text", icon: "😊", text: "愿你今天比昨天多笑一次！" },
    { type: "text", icon: "🍀", text: "愿好运一直黏着你，甩都甩不掉～" },
    { type: "text", icon: "✨", text: "愿你眼里有光，心里有糖。" },
    { type: "text", icon: "🍮", text: "愿你把烦恼都吃掉，长胖一点点也没关系！" },
    { type: "text", icon: "🤍", text: "愿你不用逞强，也被温柔以待。" },
    { type: "text", icon: "🌷", text: "愿你的这一年，每一天都比前一天更精彩！" },
    { type: "text", icon: "🌊", text: "祝她历经波折，也能找到自己喜欢、对方也喜欢自己的人。" },
    { type: "text", icon: "🧸", text: "希望你能找到一个真正的好朋友，一起大笑、一起长大。" },
    { type: "text", icon: "📚", text: "愿你考试都能考好，会的全对，蒙的也全对！" },
    { type: "photo", src: "assets/photos/cake.jpg",   alt: "一块漂亮的奶油蛋糕", cap: "抽到一块甜甜的蛋糕，先替 11 月 16 日尝一口～" },
    { type: "photo", src: "assets/photos/candles.jpg", alt: "点着蜡烛的生日蛋糕", cap: "蜡烛和烟花都在排队，等生日那天一起放～" },
    { type: "photo", src: "assets/photos/confetti.jpg", alt: "五彩缤纷的彩带", cap: "彩带都准备好了，只差生日那天撒下来！" },
    { type: "photo", src: "assets/photos/cupcake.jpg", alt: "一颗可爱的小蛋糕", cap: "小小的一颗，也是为你准备的心意～" },
    { type: "photo", src: "assets/photos/dessert.jpg", alt: "覆盆子蛋糕切块", cap: "酸酸甜甜，像极了期待生日的心情～" }
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
  var cake = null, gachaQ = null, lotteryResult = null, lotteryCard = null, drawAgain = null;

  function lightCandles() {
    if (!cake) return;
    cake.classList.add("lit");
  }

  /* ---------- 蛋糕抽奖机 ---------- */
  function renderLottery(item) {
    if (!lotteryResult || !lotteryCard) return;
    if (item.type === "photo") {
      lotteryCard.innerHTML =
        '<figure class="lottery-photo">' +
          '<img src="' + item.src + '" alt="' + item.alt + '" width="1200" height="800" />' +
          '<figcaption>' + item.cap + '</figcaption>' +
        '</figure>';
    } else {
      lotteryCard.innerHTML =
        '<span class="lottery-icon">' + item.icon + '</span>' +
        '<p class="lottery-text">' + item.text + '</p>';
    }
    lotteryResult.hidden = false;
    lotteryCard.classList.remove("lottery-pop");
    void lotteryCard.offsetWidth; // 触发重排以便重新播放弹出动画
    lotteryCard.classList.add("lottery-pop");
  }

  function drawLottery() {
    if (!cake || cake.classList.contains("shaking")) return;
    // 摇一摇抽奖机
    cake.classList.add("shaking");
    if (gachaQ) gachaQ.classList.add("spin");
    var r = cake.getBoundingClientRect();
    setTimeout(function () {
      cake.classList.remove("shaking");
      if (gachaQ) gachaQ.classList.remove("spin");
      renderLottery(pick(LOTTERY)); // 完全随机，抽之前看不到选项
      effectConfetti();
      burstSparkles(r.left + r.width / 2, r.top + r.height / 2, 14);
      if (gachaQ) {
        gachaQ.textContent = "♪";
        setTimeout(function () { if (gachaQ) gachaQ.textContent = "？"; }, 900);
      }
    }, 660);
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

  /* ---------- 信封小弹窗（还没到日期 + 骗人的按钮） ---------- */
  var trick = { open: null };

  function initTrick() {
    var modal = $("#trickModal"), waitView = $("#waitView"), trickView = $("#trickView"), trickBtn = $("#trickBtn");
    if (!modal) return;
    var closeBtns = modal.querySelectorAll(".modal-close");
    var escHandler = function (e) { if (e.key === "Escape") closeTrick(); };

    function showView(v) {
      if (waitView) waitView.hidden = (v !== "wait");
      if (trickView) trickView.hidden = (v !== "trick");
    }
    function openTrick() {
      showView("wait");
      modal.hidden = false;
      modal.focus();
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", escHandler);
    }
    function openJoke() {
      showView("trick");
      effectHearts();
      setTimeout(function () { showToast("骗到你了吧！嘿嘿 (๑˃ᴗ˂)ﻭ"); }, 250);
    }
    function closeTrick() {
      modal.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", escHandler);
      // 关键：绝不提前放行 —— 关掉弹窗后只回到信封，贺卡要等 11 月 16 日才打开
      showToast("乖，还没到 11 月 16 日，信封不能提前拆哦～");
    }

    if (trickBtn) trickBtn.addEventListener("click", openJoke);
    Array.prototype.forEach.call(closeBtns, function (b) { b.addEventListener("click", closeTrick); });
    modal.addEventListener("click", function (e) {
      if (e.target === modal || !e.target.closest(".modal-card")) closeTrick();
    });
    modal.setAttribute("tabindex", "-1");
    trick.open = openTrick;
  }

  /* ---------- 初始化 ---------- */
  function init() {
    buildBackground();
    buildWishCards();
    initTrick();

    cake = $("#cake");
    gachaQ = $("#gachaQ");
    lotteryResult = $("#lotteryResult");
    lotteryCard = $("#lotteryCard");
    drawAgain = $("#drawAgain");
    musicBtn = $("#musicBtn");

    var env = $("#envelope");
    if (env) {
      function onEnvOpen() {
        // 未解锁：只弹出「还没到日期」，绝不打开贺卡
        if (!IS_UNLOCKED) { if (trick.open) trick.open(); return; }
        openEnvelope();
      }
      env.addEventListener("click", onEnvOpen);
      env.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEnvOpen(); }
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
      cake.addEventListener("click", drawLottery);
      cake.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drawLottery(); }
      });
    }
    if (drawAgain) drawAgain.addEventListener("click", drawLottery);

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

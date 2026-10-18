/* personal-home · main interactions
   丝滑的关键：只动 transform / opacity，统一在 rAF 里读写，避免布局抖动 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- 1. Hero 标题逐字入场 ---------- */
  (function splitHero() {
    var groups = doc.querySelectorAll('.split');
    if (!groups.length) return;
    var index = 0;

    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var text = child.textContent;
          if (!text.trim()) return;
          var frag = doc.createDocumentFragment();
          for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (!ch.trim()) { frag.appendChild(doc.createTextNode(ch)); continue; }
            var span = doc.createElement('span');
            span.className = 'char';
            span.style.setProperty('--i', index++);
            span.textContent = ch;
            frag.appendChild(span);
          }
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    }

    groups.forEach(walk);
  })();

  /* ---------- 2. 滚动显现 ---------- */
  (function reveal() {
    var items = doc.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 3. 数字滚动 ---------- */
  (function counters() {
    var nums = doc.querySelectorAll('[data-count]');
    if (!nums.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var dur = 1500, t0 = performance.now();
      function frame(now) {
        var p = Math.min((now - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    if (reduce || !('IntersectionObserver' in window)) {
      nums.forEach(function (el) {
        el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 4. 滚动进度 / 导航收放 / 视差 ---------- */
  var nav = doc.getElementById('nav');
  var bar = doc.getElementById('progressBar');
  var blobs = Array.prototype.slice.call(doc.querySelectorAll('.blob'));
  var lastY = window.scrollY;
  var ticking = false;

  function onScrollFrame() {
    var y = window.scrollY;
    var max = root.scrollHeight - window.innerHeight;

    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';

    if (nav) {
      nav.classList.toggle('is-solid', y > 24);
      var goingDown = y > lastY && y > 320;
      nav.classList.toggle('is-hidden', goingDown);
    }

    if (!reduce) {
      for (var i = 0; i < blobs.length; i++) {
        var speed = parseFloat(blobs[i].getAttribute('data-parallax')) || 0;
        blobs[i].style.translate = '0 ' + (y * speed).toFixed(1) + 'px';
      }
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScrollFrame);
  }, { passive: true });
  onScrollFrame();

  /* ---------- 5. 跟随光标的光晕 ---------- */
  (function glow() {
    var el = doc.getElementById('cursorGlow');
    if (!el || reduce || !finePointer) return;
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty, shown = false;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { cx = tx; cy = ty; shown = true; el.style.opacity = '1'; }
    }, { passive: true });

    doc.addEventListener('pointerleave', function () { el.style.opacity = '0'; });

    (function loop() {
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      el.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------- 6. 页脚时钟 ---------- */
  (function clock() {
    var el = doc.getElementById('clock');
    if (!el) return;
    function tick() {
      var t;
      try {
        t = new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
      } catch (e) {
        t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      }
      el.textContent = '杭州 · ' + t;
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- 7. 锚点平滑滚动（兜底，兼容不支持 scroll-behavior 的环境） ---------- */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var target = doc.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 0 : 76);
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* ---------- 8. 标签页不可见时暂停装饰性动画，省电 ---------- */
  doc.addEventListener('visibilitychange', function () {
    doc.body.classList.toggle('is-away', doc.hidden);
  });
})();

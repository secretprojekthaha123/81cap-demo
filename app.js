/* 81 CAP product page — behaviour
   - hero feature cards synced to video.currentTime
   - loop with a short fade at the end (video starts near-black, so the fade hides the cut)
   - counters & bars on scroll (IntersectionObserver)
   - variant picker → Shopify cart permalink
   - mobile sticky buy bar
*/
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     1. Hero reveal (title, lede, buttons) — staggered ~150 ms
     --------------------------------------------------------------------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  function revealAll() {
    reveals.forEach(function (el) {
      var i = Number(el.getAttribute('data-reveal') || 0);
      setTimeout(function () { el.classList.add('is-in'); }, reduceMotion ? 0 : 250 + i * 150);
    });
  }

  /* ---------------------------------------------------------------------
     2. Feature cards synced to video time
     --------------------------------------------------------------------- */
  var video = document.getElementById('heroVideo');
  var fade = document.getElementById('heroFade');
  var features = Array.prototype.slice.call(document.querySelectorAll('#heroFeatures .feature'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.feature-dots li'));
  var cues = features.map(function (f) { return parseFloat(f.getAttribute('data-at')); });
  var activeIndex = -1;
  var FADE_BEFORE_END = 0.35; // seconds of darkening before the loop restarts

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCount(el, target, opts) {
    opts = opts || {};
    var decimals = opts.decimals || 0;
    var duration = opts.duration || 900;
    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
    var start = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - start) / duration);
      el.textContent = (target * easeOut(p)).toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function setFeature(i, animate) {
    if (i === activeIndex) return;
    activeIndex = i;
    features.forEach(function (f, k) { f.classList.toggle('is-active', k === i); });
    dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    var f = features[i];
    var num = f.querySelector('.num');
    if (num && f.hasAttribute('data-count') && animate) {
      animateCount(num, parseFloat(f.getAttribute('data-count')), { duration: 800 });
    }
  }

  function indexForTime(t) {
    var idx = 0;
    for (var k = 0; k < cues.length; k++) if (t >= cues[k]) idx = k;
    return idx;
  }

  function tick() {
    if (!video) return;
    var t = video.currentTime;
    var d = video.duration || 10;
    // which card belongs to this moment
    setFeature(indexForTime(t), true);
    // darken right before the end so the cut back to the near-black first frame is invisible
    if (fade) fade.classList.toggle('is-on', d - t < FADE_BEFORE_END && t > 1);
    requestAnimationFrame(tick);
  }

  function startVideo() {
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        // autoplay blocked: show bright poster and the first card, keep page usable
        video.setAttribute('poster', 'media/81cap-hero-poster.jpg');
        video.load();
        setFeature(0, false);
      });
    }
  }

  if (video && !reduceMotion) {
    // 720p on narrow screens (browsers ignore <source media> inside <video>)
    var src = video.querySelector('source');
    if (src && window.innerWidth < 768 && src.getAttribute('data-src-mobile')) {
      src.setAttribute('src', src.getAttribute('data-src-mobile'));
      video.load();
    }
    video.addEventListener('loadedmetadata', function () {
      requestAnimationFrame(tick);
    });
    // start only when the hero is on screen; pause when it is far away (saves battery)
    if ('IntersectionObserver' in window) {
      var vo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) startVideo(); else video.pause();
        });
      }, { threshold: 0.15 });
      vo.observe(video);
    } else {
      startVideo();
    }
    // card cycling even if the video never starts (e.g. data saver): fallback timer
    setTimeout(function () {
      if (video.paused && video.currentTime === 0) {
        var i = 0;
        setFeature(0, true);
        setInterval(function () { i = (i + 1) % features.length; setFeature(i, true); }, 2500);
      }
    }, 3000);
  } else {
    setFeature(0, false);
  }
  revealAll();

  /* ---------------------------------------------------------------------
     3. Counters and bars on scroll
     --------------------------------------------------------------------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      if (el.hasAttribute('data-bars')) el.classList.add('is-in');
      if (el.classList.contains('count')) {
        animateCount(el, parseFloat(el.getAttribute('data-count')), {
          decimals: Number(el.getAttribute('data-decimals') || 0), duration: 1200
        });
      }
      io.unobserve(el);
    });
  }, { threshold: 0.35 }) : null;

  if (io) {
    document.querySelectorAll('[data-bars], .count').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('[data-bars]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------------------
     4. Variant picker → Shopify cart permalink
        https://www.81cap.com/cart/{VARIANT_ID}:{QUANTITY}
        IDs from https://www.81cap.com/products/81-cap.js (checked 2026-10-26)
     --------------------------------------------------------------------- */
  var SHOP = 'https://www.81cap.com';
  var VARIANTS = {
    male:   { 5: { id: '48320506003788', price: 9.75 }, 10: { id: '48320506036556', price: 19.50 }, 20: { id: '48320506069324', price: 39.00 } },
    female: { 5: { id: '48320506102092', price: 9.75 }, 10: { id: '48320506134860', price: 19.50 }, 20: { id: '48320506167628', price: 39.00 } }
  };
  var picker = document.getElementById('picker');
  var addBtn = document.getElementById('addToCart');
  var priceEl = document.getElementById('cartPrice');
  var summaryEl = document.getElementById('cartSummary');

  function fmt(n) { return '€' + n.toFixed(2); }

  function updateCart() {
    var type = picker.querySelector('input[name="type"]:checked').value;
    var qty = picker.querySelector('input[name="qty"]:checked').value;
    var v = VARIANTS[type][qty];
    addBtn.href = SHOP + '/cart/' + v.id + ':1';
    addBtn.setAttribute('data-variant', v.id);
    priceEl.textContent = fmt(v.price);
    summaryEl.textContent = qty + '× 81 ' + type.toUpperCase();
  }
  if (picker) {
    picker.addEventListener('change', updateCart);
    updateCart();
  }

  /* ---------------------------------------------------------------------
     5. Mobile sticky bar — visible after the hero, hidden while #buy is on screen
     --------------------------------------------------------------------- */
  var sticky = document.getElementById('stickyBar');
  var hero = document.getElementById('hero');
  var buy = document.getElementById('buy');
  if (sticky && hero && buy && 'IntersectionObserver' in window) {
    var heroVisible = true, buyVisible = false;
    function updateSticky() {
      var show = !heroVisible && !buyVisible;
      sticky.classList.toggle('is-visible', show);
      document.body.classList.toggle('has-sticky', show);
    }
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; updateSticky(); }, { threshold: 0.1 }).observe(hero);
    new IntersectionObserver(function (en) { buyVisible = en[0].isIntersecting; updateSticky(); }, { threshold: 0.1 }).observe(buy);
  }
})();

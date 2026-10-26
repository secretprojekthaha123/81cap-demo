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
     4. Variant pickers -> Shopify cart permalinks
        https://www.81cap.com/cart/{VARIANT_ID}:{QUANTITY}
        IDs and prices from /products/{handle}.js (checked 2026-10-26)
     --------------------------------------------------------------------- */
  var SHOP = 'https://www.81cap.com';
  var PRODUCTS = {
    '81cap': {
      name: '81 CAP',
      variants: {
        male:   { 5: { id: '48320506003788', price: 9.75 }, 10: { id: '48320506036556', price: 19.50 }, 20: { id: '48320506069324', price: 39.00 } },
        female: { 5: { id: '48320506102092', price: 9.75 }, 10: { id: '48320506134860', price: 19.50 }, 20: { id: '48320506167628', price: 39.00 } }
      },
      photo: function (type, qty) {
        return {
          main: 'media/products/81cap-' + type + '.webp',
          mainAlt: '81 CAP ' + type.toUpperCase() + ': one cap standing, one showing the ' + (type === 'male' ? 'pin' : 'socket') + ' on the underside',
          pack: 'media/products/81cap-' + type + '-' + qty + '.webp',
          packAlt: 'Pack of ' + qty + ' x 81 CAP ' + type.toUpperCase(),
          caption: '81 CAP ' + type.toUpperCase() + ' · pack of ' + qty
        };
      }
    },
    'firecap': {
      name: 'FIRE CAP',
      variants: {
        female: { 10: { id: '52896573292876', price: 10 }, 20: { id: '52896573325644', price: 20 }, 50: { id: '52896573358412', price: 50 } },
        male:   { 10: { id: '58931544195404', price: 10 }, 20: { id: '58931544228172', price: 20 }, 50: { id: '58931544260940', price: 50 } }
      },
      photo: function (type, qty) {
        return {
          main: 'media/products/firecap-' + qty + '.webp',
          mainAlt: 'Pack of ' + qty + ' FIRE CAPs',
          caption: 'FIRE CAP ' + type.toUpperCase() + ' · pack of ' + qty
        };
      }
    },
    'x360': {
      name: '81X360°',
      variants: {
        female: { 5: { id: '58931320586572', price: 15 }, 10: { id: '58931320619340', price: 30 }, 20: { id: '58931320652108', price: 60 } },
        male:   { 5: { id: '58931378585932', price: 15 }, 10: { id: '58931378618700', price: 30 }, 20: { id: '58931378651468', price: 60 } }
      },
      photo: function (type, qty) {
        return {
          main: 'media/products/x360-' + type + '-base.webp',
          mainAlt: '81X360° ' + type.toUpperCase() + ': underside with the ' + (type === 'male' ? 'pin' : 'socket'),
          caption: '81X360° ' + type.toUpperCase() + ' · ' + (type === 'male' ? 'pin' : 'socket') + ' · pack of ' + qty
        };
      }
    }
  };

  function fmt(n) { return '€' + n.toFixed(2); }

  function setupPicker(form) {
    var key = form.getAttribute('data-product');
    var P = PRODUCTS[key];
    var photoBox = document.getElementById('photo-' + key);
    var addBtn = form.querySelector('[data-role="add"]');
    var priceEl = form.querySelector('[data-role="price"]');
    var summaryEl = form.querySelector('[data-role="summary"]');
    var imgMain = photoBox ? photoBox.querySelector('img[data-role="main"]') : null;
    var imgPack = photoBox ? photoBox.querySelector('img[data-role="pack"]') : null;
    var capEl = photoBox ? photoBox.querySelector('[data-role="caption"]') : null;

    function update() {
      var type = form.querySelector('input[name="type"]:checked').value;
      var qty = form.querySelector('input[name="qty"]:checked').value;
      var v = P.variants[type][qty];
      addBtn.href = SHOP + '/cart/' + v.id + ':1';
      addBtn.setAttribute('data-variant', v.id);
      priceEl.textContent = fmt(v.price);
      summaryEl.textContent = qty + '× ' + P.name + ' ' + type.toUpperCase();
      if (photoBox) {
        var ph = P.photo(type, qty);
        var changed = (imgMain && imgMain.getAttribute('src') !== ph.main) || (imgPack && imgPack.getAttribute('src') !== ph.pack);
        if (changed && !reduceMotion) photoBox.classList.add('is-swapping');
        setTimeout(function () {
          if (imgMain) { imgMain.src = ph.main; imgMain.alt = ph.mainAlt; }
          if (imgPack && ph.pack) { imgPack.src = ph.pack; imgPack.alt = ph.packAlt; }
          if (capEl) capEl.textContent = ph.caption;
          photoBox.classList.remove('is-swapping');
        }, changed && !reduceMotion ? 180 : 0);
      }
    }
    form.addEventListener('change', update);
    update();
  }
  document.querySelectorAll('form.picker[data-product]').forEach(setupPicker);

  /* ---------------------------------------------------------------------
     4b. 81X360 - the top part (disc + nozzle) turns around the disc centre,
         the body stays fixed. Auto sweep -90 .. +90 deg; the slider takes
         over while the visitor drags it, the sweep resumes after 4 s.
     --------------------------------------------------------------------- */
  var rotor = document.getElementById('x360Rotor');
  var slider = document.getElementById('x360Angle');
  var degEl = document.getElementById('x360Deg');
  var stage = document.getElementById('x360Stage');
  if (rotor && slider) {
    var angle = 0, target = 0, userUntil = 0, visible = true, dir = 1, holdUntil = 0, autoPhase = 0;
    var SWEEP = 3200;          // ms for one full -90 -> +90 sweep
    var HOLD = 900;            // ms pause at the ends
    var last = performance.now();
    function setAngle(a) {
      angle = a;
      rotor.style.transform = 'rotate(' + a + 'deg)';   // positive = nozzle to the right (clockwise on screen)
      degEl.textContent = Math.round(a) + '°';
    }
    function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function frame(now) {
      var dt = Math.min(50, now - last); last = now;
      if (visible) {
        if (now < userUntil || reduceMotion) {
          target = Number(slider.value);
          setAngle(angle + (target - angle) * Math.min(1, dt / 90));
        } else if (now >= holdUntil) {
          autoPhase += dt / SWEEP;
          if (autoPhase >= 1) { autoPhase = 0; dir = -dir; holdUntil = now + HOLD; }
          var p = easeInOut(Math.min(1, autoPhase));
          var a = dir > 0 ? -90 + 180 * p : 90 - 180 * p;
          setAngle(a);
          slider.value = Math.round(a);
        }
      }
      requestAnimationFrame(frame);
    }
    function userTouch() {
      // resume the sweep from the slider position, not from -90
      userUntil = performance.now() + 4000;
      var a = Number(slider.value);
      dir = a >= 0 ? -1 : 1;
      autoPhase = dir > 0 ? (a + 90) / 180 : (90 - a) / 180;
    }
    slider.addEventListener('input', userTouch);
    slider.addEventListener('pointerdown', userTouch);
    slider.addEventListener('keydown', userTouch);
    if (reduceMotion) { slider.value = 0; setAngle(0); userUntil = Infinity; }
    if ('IntersectionObserver' in window && stage) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; last = performance.now(); }, { threshold: 0.05 }).observe(stage);
    }
    autoPhase = 0.5; dir = 1;   // start at 0 deg moving right
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     5. Mobile sticky bar — visible after the hero, hidden while #buy is on screen
     --------------------------------------------------------------------- */
  var sticky = document.getElementById('stickyBar');
  var hero = document.getElementById('hero');
  var buys = document.querySelectorAll('.buy');
  if (sticky && hero && buys.length && 'IntersectionObserver' in window) {
    var heroVisible = true, buyVisible = false, buyState = {};
    function updateSticky() {
      var show = !heroVisible && !buyVisible;
      sticky.classList.toggle('is-visible', show);
      document.body.classList.toggle('has-sticky', show);
    }
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; updateSticky(); }, { threshold: 0.1 }).observe(hero);
    buys.forEach(function (b, i) {
      new IntersectionObserver(function (en) {
        buyState[i] = en[0].isIntersecting;
        buyVisible = Object.keys(buyState).some(function (k) { return buyState[k]; });
        updateSticky();
      }, { threshold: 0.1 }).observe(b);
    });
  }
})();

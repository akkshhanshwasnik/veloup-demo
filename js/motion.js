// VeloUp motion: scroll reveals, step sequence, chat typing, hero pause. Plain JavaScript, no libraries.
// If anything fails, or "reduce motion" is on, content simply shows in its final state.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Viewing modes for comparing: default is calm (no tilt or glow); ?motion=full adds tilt and glow; ?motion=still turns all motion off
  var modeMatch = /[?&]motion=(full|calm|still)/.exec(location.search);
  var mode = modeMatch ? modeMatch[1] : 'calm';
  root.classList.add('mode-' + mode);
  if (reduce || mode === 'still' || !('IntersectionObserver' in window)) { return; }

  root.classList.add('motion-ready');

  // Soft spotlight that follows the pointer over tiles and cards (mouse and trackpad only)
  if (mode === 'full' && window.matchMedia('(hover: hover)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  function onView(el, callback, threshold, once) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { callback(entry.target); if (once) { io.unobserve(entry.target); } }
      });
    }, { threshold: threshold });
    io.observe(el);
    return io;
  }

  // 1. Scroll reveals: sections below the first screen fade in and rise once.
  var GRIDS = '.card-grid, .bento, .why-grid, .steps, .steps-detail, .info-grid, .faq-list, .ind-grid, .miss-list, .founder-cards, .need-grid';
  var sections = document.querySelectorAll('main > section:not(.hero):not(.page-hero)');
  Array.prototype.forEach.call(sections, function (section) {
    var box = section.querySelector('.container');
    if (!box) { return; }
    Array.prototype.forEach.call(box.children, function (child) {
      var items = child.matches(GRIDS) ? Array.prototype.slice.call(child.children) : [child];
      items.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.setProperty('--d', Math.min(i, 3) * 80 + 'ms');
        onView(el, function (t) { t.classList.add('is-in'); }, 0.15, true);
      });
    });
  });

  // 2. Home page steps: circle, line, circle, line, circle.
  var steps = document.querySelector('.steps');
  if (steps) { onView(steps, function (t) { t.classList.add('is-seq'); }, 0.4, true); }

  // 3. Example conversation: messages appear one by one; assistant replies show typing dots first.
  Array.prototype.forEach.call(document.querySelectorAll('.chat-body'), function (body) {
    var msgs = Array.prototype.slice.call(body.querySelectorAll('.chat-msg'));
    msgs.forEach(function (m) { m.classList.add('is-waiting'); });
    onView(body, function () {
      var i = 0;
      (function next() {
        if (i >= msgs.length) { return; }
        var m = msgs[i++];
        var assistant = m.classList.contains('chat-assistant');
        if (assistant) { m.classList.add('is-typing'); }
        m.classList.remove('is-waiting');
        setTimeout(function () {
          m.classList.remove('is-typing');
          setTimeout(next, 1000);
        }, assistant ? 700 : 0);
      })();
    }, 0.5, true);
  });

  // 4. Hero loop: pause when the tab is hidden or the hero is off screen.
  var hero = document.querySelector('.hero');
  var svg = document.querySelector('.hero-loop');
  if (hero && svg) {
    var visible = true;
    function sync() {
      var paused = document.hidden || !visible;
      hero.classList.toggle('is-paused', paused);
      if (svg.pauseAnimations) { paused ? svg.pauseAnimations() : svg.unpauseAnimations(); }
    }
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }).observe(hero);
    document.addEventListener('visibilitychange', sync);
  }

  // 5. 3D tilt: tiles and the chat lean toward the pointer (mouse and trackpad only)
  if (mode === 'full' && window.matchMedia('(hover: hover)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('.bento-tile, .info-card, .chat'), function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = ((e.clientX - r.left) / r.width - 0.5) * 2, dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
        var deg = Math.min(1, Math.hypot(dx, dy)) * 4;
        el.style.rotate = (-dy).toFixed(3) + ' ' + dx.toFixed(3) + ' 0 ' + deg.toFixed(2) + 'deg';
      });
      el.addEventListener('pointerleave', function () { el.style.rotate = 'none'; });
    });
  }

  // 3D hero loader removed: js/hero3d.js is not deployed (the 582 KB build is kept outside upload/)
})();

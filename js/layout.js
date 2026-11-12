// VeloUp shared layout: header, footer, mobile menu, bottom bar, WhatsApp button.
// Reads settings from config.js. All links are relative so the site works on any address.
// Each page already contains a plain HTML header and footer; this script replaces them
// with the full version. If this script fails, the plain version stays.

(function () {
  'use strict';

  var cfg = window.config || {};

  var PAGES = [
    { href: 'index.html', label: 'Home' },
    { href: 'services.html', label: 'Services' },
    { href: 'how-it-works.html', label: 'How it works' },
    { href: 'about.html', label: 'About' },
    { href: 'faq.html', label: 'FAQ' },
    { href: 'contact.html', label: 'Contact' }
  ];

  var LOGO_MARK = '<svg class="logo-mark" viewBox="0 0 120 80" aria-hidden="true" focusable="false"><path d="M100 50 C100 67 79 71 68 57 C59 45 52 27 35 27 C20 27 13 38 13 48 C13 63 31 69 45 56 C58 44 70 31 90 17" fill="none" stroke="#C4B5FD" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path transform="translate(92 15) rotate(-48)" d="M13 0 L-5 -12 L-5 12 Z" fill="#67E8F9" stroke="#67E8F9" stroke-width="5" stroke-linejoin="round"/></svg>';

  // ---------- helpers ----------

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isWebAddress(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
  }

  // Until a real booking link is added to config.js, send visitors to the contact page.
  function bookingHref() {
    return isWebAddress(cfg.bookingLink) ? cfg.bookingLink : 'contact.html';
  }

  // Build a WhatsApp chat link with the pre-filled message. Placeholder numbers fall back to the contact page.
  function whatsappHref() {
    var raw = String(cfg.whatsappNumber || '');
    var digits = raw.replace(/\D/g, '');
    if (/x/i.test(raw) || digits.length < 8) { return 'contact.html'; }
    var text = cfg.whatsappMessage || "Hi, I'd like to know more about VeloUp";
    // Phones: wa.me opens the WhatsApp app. Computers: go straight to WhatsApp Web, because
    // wa.me's "Continue to chat" does nothing in Chrome when the desktop app isn't installed.
    var phone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    return (phone ? 'https://wa.me/' + digits + '?text=' : 'https://web.whatsapp.com/send?phone=' + digits + '&text=') + encodeURIComponent(text);
  }

  // Extra attributes for links that leave the site (open in a new tab safely).
  function linkAttrs(href) {
    return isWebAddress(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
  }

  function newTabNote(href) {
    return isWebAddress(href) ? '<span class="visually-hidden"> (opens in a new tab)</span>' : '';
  }

  // Show a number as +91 XXXXX XXXXX when it has that shape.
  function prettyNumber(raw) {
    var s = String(raw || '');
    return /^\+91\S{10}$/.test(s) ? '+91 ' + s.slice(3, 8) + ' ' + s.slice(8) : s;
  }

  function currentFile() {
    var file = window.location.pathname.split('/').pop();
    if (file === '') { return 'index.html'; }
    // GitHub Pages also serves /about for about.html
    return /\.html$/.test(file) ? file : file + '.html';
  }

  // ---------- markup ----------

  function navItems() {
    var file = currentFile();
    return PAGES.map(function (p) {
      var current = p.href === file ? ' aria-current="page"' : '';
      return '<li><a href="' + p.href + '"' + current + '>' + p.label + '</a></li>';
    }).join('');
  }

  function bookButton(extraClass) {
    var href = bookingHref();
    return '<a class="btn btn-primary ' + extraClass + '" href="' + esc(href) + '"' + linkAttrs(href) + '>' +
      'Book a free 15-minute call' + newTabNote(href) + '</a>';
  }

  function whatsappButton(extraClass, label) {
    var href = whatsappHref();
    return '<a class="btn btn-secondary ' + extraClass + '" href="' + esc(href) + '"' + linkAttrs(href) + '>' +
      label + newTabNote(href) + '</a>';
  }

  function headerHTML() {
    return '' +
      '<header class="site-header">' +
        '<div class="container header-inner">' +
          '<a class="logo" href="index.html" aria-label="VeloUp home">'+LOGO_MARK+'<span class="logo-velo">Velo</span><span class="logo-up">Up</span></a>' +
          '<nav class="site-nav" id="site-nav" aria-label="Main">' +
            '<ul class="nav-list">' + navItems() + '</ul>' +
            '<div class="nav-actions">' + bookButton('') + whatsappButton('', 'Chat on WhatsApp') + '</div>' +
          '</nav>' +
          bookButton('header-cta') +
          '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">' +
            '<span class="bar"></span><span class="bar"></span><span class="bar"></span>' +
          '</button>' +
        '</div>' +
      '</header>';
  }

  function footerHTML() {
    var email = String(cfg.businessEmail || '');
    var emailHTML = email && email.indexOf('[') === -1
      ? '<a href="mailto:' + esc(email) + '">' + esc(email) + '</a>'
      : esc(email);
    var waHref = whatsappHref();
    var number = esc(prettyNumber(cfg.whatsappNumber));
    var numberHTML = waHref === 'contact.html'
      ? number
      : '<a href="' + esc(waHref) + '"' + linkAttrs(waHref) + '>' + number + newTabNote(waHref) + '</a>';

    var pageLinks = PAGES.map(function (p) {
      return '<li><a href="' + p.href + '">' + p.label + '</a></li>';
    }).join('') + '<li><a href="ai-automation-pune.html">AI automation in Pune</a></li>';

    return '' +
      '<footer class="site-footer">' +
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-brand">' +
              '<a class="logo" href="index.html" aria-label="VeloUp home">'+LOGO_MARK+'<span class="logo-velo">Velo</span><span class="logo-up">Up</span></a>' +
              '<p class="footer-tagline">You define the challenge. We build the engine.</p>' +
            '</div>' +
            '<div><h2>Pages</h2><ul class="footer-list">' + pageLinks + '</ul></div>' +
            '<div><h2>Contact</h2><ul class="footer-list">' +
              '<li>' + emailHTML + '</li>' +
              '<li>WhatsApp: ' + numberHTML + '</li>' +
              '<li>Pune, India</li>' +
            '</ul></div>' +
            '<div><h2>Legal</h2><ul class="footer-list">' +
              '<li><a href="privacy.html">Privacy policy</a></li>' +
            '</ul></div>' +
          '</div>' +
          '<div class="footer-bottom"><p>&copy; ' + new Date().getFullYear() + ' VeloUp. All rights reserved.</p></div>' +
        '</div>' +
      '</footer>';
  }

  function actionBarHTML() {
    var book = bookingHref();
    var wa = whatsappHref();
    return '' +
      '<div class="action-bar" id="action-bar">' +
        '<a class="btn btn-primary" href="' + esc(book) + '"' + linkAttrs(book) + '>Book a free call' + newTabNote(book) + '</a>' +
        '<a class="btn btn-secondary" href="' + esc(wa) + '"' + linkAttrs(wa) + '>WhatsApp' + newTabNote(wa) + '</a>' +
      '</div>';
  }

  function whatsappFloatHTML() {
    var wa = whatsappHref();
    return '' +
      '<a class="wa-float" href="' + esc(wa) + '"' + linkAttrs(wa) + ' data-tooltip="Chat on WhatsApp" aria-label="Chat with VeloUp on WhatsApp' + (isWebAddress(wa) ? ' (opens in a new tab)' : '') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
          '<path d="M3 21l1.65-4.9A8.5 8.5 0 1 1 8 19.4L3 21z"/>' +
          '<path d="M9 8.5c0 3.3 2.7 6 6 6l1.2-1.4-2-1-.9.7a3.6 3.6 0 0 1-1.6-1.6l.7-.9-1-2L9 8.5z"/>' +
        '</svg>' +
      '</a>';
  }

  // ---------- behaviour ----------

  function setupMenu() {
    var root = document.documentElement;
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) { return; }

    function isOpen() { return root.classList.contains('menu-open'); }

    function openMenu() {
      root.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      var first = nav.querySelector('a');
      if (first) { first.focus(); }
    }

    function closeMenu(returnFocus) {
      root.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Menu');
      if (returnFocus) { toggle.focus(); }
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) { closeMenu(true); } else { openMenu(); }
    });

    // Close when a link is tapped
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) { closeMenu(false); }
    });

    document.addEventListener('keydown', function (event) {
      if (!isOpen()) { return; }
      if (event.key === 'Escape') { closeMenu(true); return; }
      if (event.key === 'Tab') {
        // Keep keyboard focus inside the open menu (links, then the close button)
        var links = nav.querySelectorAll('a');
        var first = links[0];
        var last = toggle;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    // Close if the window grows to desktop width
    if (window.matchMedia) {
      var desktop = window.matchMedia('(min-width: 1024px)');
      var onChange = function (e) { if (e.matches) { closeMenu(false); } };
      if (desktop.addEventListener) { desktop.addEventListener('change', onChange); }
      else if (desktop.addListener) { desktop.addListener(onChange); }
    }
  }

  // Hide the bottom bar while a form field is focused, so the keyboard does not cover content
  function setupActionBarHiding() {
    var root = document.documentElement;
    var fields = 'input, textarea, select';
    document.addEventListener('focusin', function (event) {
      if (event.target.matches && event.target.matches(fields)) { root.classList.add('field-focus'); }
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var active = document.activeElement;
        if (!(active && active.matches && active.matches(fields))) { root.classList.remove('field-focus'); }
      }, 0);
    });
  }

  // Wire buttons in the page content (marked data-book / data-whatsapp) to the settings in config.js
  function wireContentLinks() {
    function wire(selector, href) {
      var links = document.querySelectorAll(selector);
      for (var i = 0; i < links.length; i++) {
        var a = links[i];
        a.setAttribute('href', href);
        if (isWebAddress(href)) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.insertAdjacentHTML('beforeend', newTabNote(href));
        }
      }
    }
    wire('[data-book]', bookingHref());
    wire('[data-whatsapp]', whatsappHref());
  }

  function init() {
    var headerBox = document.getElementById('header-container');
    var footerBox = document.getElementById('footer-container');

    // Build everything first; only replace the plain fallback if nothing failed
    var header, footer, bar, wa;
    try {
      header = headerHTML();
      footer = footerHTML();
      bar = actionBarHTML();
      wa = whatsappFloatHTML();
    } catch (error) {
      return;
    }

    if (headerBox) { headerBox.innerHTML = header; }
    if (footerBox) { footerBox.innerHTML = footer; }
    document.body.insertAdjacentHTML('beforeend', bar + wa);

    wireContentLinks();
    setupMenu();
    setupActionBarHiding();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

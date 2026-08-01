// =========================================================
// ATMOS Homes — site interactions
// =========================================================

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Telemetry ticker ----------
  // Mirrors the app's own dashboard readout: a handful of live-feeling
  // sensor values that drift slightly, rendered as a scrolling strip.
  var readings = [
    { label: 'TEMP', value: 22.4, unit: '\u00B0C', min: 20, max: 24, drift: 0.15 },
    { label: 'HUMIDITY', value: 45, unit: '%', min: 30, max: 55, drift: 0.8 },
    { label: 'PM2.5', value: 12, unit: '\u00B5g/m\u00B3', min: 6, max: 20, drift: 0.4 },
    { label: 'NOISE', value: 35, unit: 'dB', min: 25, max: 45, drift: 0.6 },
    { label: 'LIGHT', value: 320, unit: 'lux', min: 200, max: 480, drift: 6 }
  ];

  function statusColor(reading) {
    var mid = (reading.min + reading.max) / 2;
    var range = (reading.max - reading.min) / 2;
    var distance = Math.abs(reading.value - mid) / range;
    if (distance < 0.5) return 'var(--sage)';
    if (distance < 0.85) return 'var(--amber-warn)';
    return 'var(--ember)';
  }

  function renderTicker() {
    var track = document.getElementById('tickerTrack');
    if (!track) return;

    var itemsHtml = readings.map(function (r) {
      return (
        '<span class="ticker__item">' +
          '<span class="dot" style="background:' + statusColor(r) + '"></span>' +
          r.label +
        '</span>'
      );
    }).join('');

    // Duplicate the sequence so the marquee loops seamlessly.
    track.innerHTML = itemsHtml + itemsHtml;
  }

  function driftReadings() {
    readings.forEach(function (r) {
      var delta = (Math.random() - 0.5) * r.drift;
      r.value = Math.min(r.max + r.drift, Math.max(r.min - r.drift, r.value + delta));
    });
    renderTicker();
  }

  renderTicker();
  if (!prefersReducedMotion) {
    setInterval(driftReadings, 2600);
  }

  // ---------- Video placeholder fallback ----------
  Array.prototype.slice.call(document.querySelectorAll('.video-frame')).forEach(function (frame) {
    var video = frame.querySelector('video');
    var placeholder = frame.querySelector('.video-frame__placeholder');
    if (!video || !placeholder) return;

    video.addEventListener('error', function () {
      video.style.display = 'none';
      placeholder.style.display = 'flex';
    }, true);

    // If there's no real <source> reachable, `error` fires on the source
    // element rather than bubbling cleanly in every browser — this check
    // catches that case shortly after load.
    window.addEventListener('load', function () {
      setTimeout(function () {
        if (video.readyState === 0 && video.error) {
          video.style.display = 'none';
          placeholder.style.display = 'flex';
        }
      }, 800);
    });
  });

  // ---------- Scroll reveal, parallax, and active nav ----------
  var revealTargets = document.querySelectorAll('[data-reveal], .section__title, .section__body, .feature-card, .gallery-grid figure, .footer__cta');
  revealTargets.forEach(function (el) {
    el.classList.add('reveal');
    if (el.dataset.reveal) {
      el.classList.add('reveal--' + el.dataset.reveal);
    }
  });

  // Stagger reveal timing grouped by section so items animate sequentially
  Array.prototype.slice.call(document.querySelectorAll('main section')).forEach(function (sec) {
    var items = sec.querySelectorAll('.reveal');
    items.forEach(function (el, idx) {
      // small stagger per item
      el.style.setProperty('--delay', (idx * 0.06) + 's');
    });
  });

  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    // Reveal observer: toggle visible state on enter/leave so animations run both directions
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          entry.target.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.18 });

    revealTargets.forEach(function (el) { revealObserver.observe(el); });

    // Section observer: highlight active nav link
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          sectionLinks.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { threshold: 0.45 });

    sections.forEach(function (section) { sectionObserver.observe(section); });

    // Parallax: subtle background shift on hero
    var hero = document.querySelector('.hero');
    if (hero) {
      hero.style.backgroundPosition = 'center 0px';
      window.addEventListener('scroll', function () {
        var sc = window.pageYOffset || document.documentElement.scrollTop;
        hero.style.backgroundPosition = 'center ' + (sc * 0.15) + 'px';
      }, { passive: true });
    }

    // Tilt interaction for cards (sensor showcase, panels, features)
    var tiltCards = document.querySelectorAll('.sensor-showcase__card, .panel-card, .feature-card, .team-tile');
    tiltCards.forEach(function (card) {
      card.style.transformStyle = 'preserve-3d';
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var rx = (py - 0.5) * 8; // rotateX
        var ry = (px - 0.5) * -8; // rotateY
        card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(0)';
        card.style.transition = 'transform 0.12s ease';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(.2,.8,.2,1)';
      });
    });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---------- Scroll sequence: split panels on scroll ----------
  var scrollSequence = document.querySelector('.scroll-sequence');
  var scrollChapters = scrollSequence
    ? Array.prototype.slice.call(scrollSequence.querySelectorAll('.scroll-chapter'))
    : [];
  var scrollCounter = document.getElementById('scrollCounter');
  var scrollRailFill = document.getElementById('scrollRailFill');
  var chapterCount = scrollChapters.length;
  var scrollTicking = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function setChapterVars(chapter, split, reveal) {
    chapter.style.setProperty('--split', String(split));
    chapter.style.setProperty('--reveal', String(reveal));
  }

  function updateScrollSequence() {
    if (!scrollSequence || !chapterCount) return;

    var isMobile = window.matchMedia('(max-width: 900px)').matches;
    if (isMobile || prefersReducedMotion) {
      scrollSequence.style.height = 'auto';
      scrollChapters.forEach(function (chapter) {
        chapter.classList.add('is-active');
        setChapterVars(chapter, 1, 1);
      });
      if (scrollRailFill) scrollRailFill.style.height = '100%';
      if (scrollCounter) scrollCounter.textContent = String(chapterCount).padStart(2, '0');
      return;
    }

    scrollSequence.style.height = (chapterCount * 100) + 'vh';

    var rect = scrollSequence.getBoundingClientRect();
    var viewport = window.innerHeight;
    var scrollable = scrollSequence.offsetHeight - viewport;
    var scrolled = clamp(-rect.top, 0, scrollable);
    var progress = scrollable > 0 ? scrolled / scrollable : 0;
    var index = clamp(Math.floor(progress * chapterCount), 0, chapterCount - 1);
    var local = clamp(progress * chapterCount - index, 0, 1);
    var split = easeOutCubic(Math.min(local * 1.35, 1));
    var reveal = easeOutCubic(clamp((local - 0.08) / 0.92, 0, 1));

    scrollChapters.forEach(function (chapter, i) {
      var isActive = i === index;
      chapter.classList.toggle('is-active', isActive);
      if (isActive) {
        setChapterVars(chapter, split, reveal);
      } else if (i < index) {
        setChapterVars(chapter, 1, 1);
      } else {
        setChapterVars(chapter, 0, 0);
      }
    });

    if (scrollCounter) {
      scrollCounter.textContent = String(index + 1).padStart(2, '0');
    }
    if (scrollRailFill) {
      scrollRailFill.style.height = ((index + local) / chapterCount * 100) + '%';
    }

    var intro = scrollSequence.querySelector('.scroll-sequence__intro');
    if (intro) {
      intro.style.opacity = String(1 - clamp(progress * 2.5, 0, 1));
    }
  }

  function onScrollSequenceFrame() {
    scrollTicking = false;
    updateScrollSequence();
  }

  function requestScrollSequenceUpdate() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(onScrollSequenceFrame);
    }
  }

  if (scrollSequence && chapterCount) {
    if (prefersReducedMotion) {
      scrollSequence.style.height = 'auto';
    } else {
      scrollSequence.style.height = (chapterCount * 100) + 'vh';
    }
    updateScrollSequence();
    window.addEventListener('scroll', requestScrollSequenceUpdate, { passive: true });
    window.addEventListener('resize', updateScrollSequence);
  }

  // ---------- Mobile nav toggle ----------
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.querySelector('.nav__links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('nav__links--open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
})();

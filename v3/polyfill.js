'use strict';

(() => {
  if (typeof chrome === 'undefined' || !chrome || (chrome.system && chrome.system.display)) {
    return;
  }

  const s = typeof window === 'object' && window.screen ? window.screen : null;

  const number = (v, fallback) => Number.isFinite(v) ? v : fallback;

  const build = () => {
    const bounds = {
      left: 0,
      top: 0,
      width: number(s && s.width, 1920),
      height: number(s && s.height, 1080)
    };
    const workArea = {
      left: number(s && s.availLeft, bounds.left),
      top: number(s && s.availTop, bounds.top),
      width: number(s && s.availWidth, bounds.width),
      height: number(s && s.availHeight, bounds.height)
    };
    return {
      id: 'screen-0',
      name: 'Display',
      isEnabled: true,
      isPrimary: true,
      isInternal: true,
      mirroringSourceId: '',
      overscan: {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      },
      rotation: 0,
      dpiX: 96,
      dpiY: 96,
      bounds,
      workArea
    };
  };

  const signature = () => JSON.stringify([
    number(s && s.width, 0),
    number(s && s.height, 0),
    number(s && s.availWidth, 0),
    number(s && s.availHeight, 0),
    number(s && s.availLeft, 0),
    number(s && s.availTop, 0)
  ]);

  const seen = new Map();

  const displays = () => {
    const display = build();
    seen.set(signature(), display);
    return [display, ...[...seen.values()].filter(d => d !== display)];
  };

  const getInfo = (options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    const promise = Promise.resolve(displays());
    if (typeof cb === 'function') {
      promise.then(info => cb(info), e => console.error(e));
      return;
    }
    return promise;
  };

  const listeners = new Set();

  const onDisplayChanged = {
    addListener: fn => listeners.add(fn),
    removeListener: fn => listeners.delete(fn),
    hasListener: fn => listeners.has(fn)
  };

  const emit = () => {
    for (const fn of [...listeners]) {
      try {
        fn();
      }
      catch (e) {
        console.error(e);
      }
    }
  };

  if (s && typeof window.addEventListener === 'function') {
    let last = signature();

    window.addEventListener('resize', () => {
      const current = signature();
      if (current !== last) {
        last = current;
        emit();
      }
    });
  }

  chrome.system = chrome.system || {};
  chrome.system.display = {
    getInfo,
    onDisplayChanged,
    __polyfilled: true
  };
})();

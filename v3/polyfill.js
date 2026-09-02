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

  const getInfo = (options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    const promise = Promise.resolve([build()]);
    if (typeof cb === 'function') {
      promise.then(info => cb(info), e => console.error(e));
      return;
    }
    return promise;
  };

  chrome.system = chrome.system || {};
  chrome.system.display = {
    getInfo
  };
})();

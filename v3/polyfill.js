'use strict';

/* chrome.system.display */
{
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
    console.log(display);

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

  console.log(1);
  chrome.system = chrome.system || {};
  chrome.system.display = {
    getInfo,
    onDisplayChanged,
    __polyfilled: true
  };
}

// Firefox (X11) applies move before resize and the WM may drop a move that
// would overflow the screen at the window's old size, leaving the position
// stale. Intercept update: apply once, verify, re-apply on mismatch (no loop).
// https://github.com/brian-girko/window-resizer/issues/11
{
  const pending = new Set();
  try {
    chrome.windows.update = new Proxy(chrome.windows.update, {
      apply(target, self, args) {
        const [id, updateInfo] = args;
        // only guard full-geometry layout calls; correction calls pass through
        if (!updateInfo || pending.has(id) ||
            [updateInfo.left, updateInfo.top, updateInfo.width, updateInfo.height].some(v => v == null)) {
          return Reflect.apply(target, self, args);
        }
        return Reflect.apply(target, self, args).then(async win => {
          pending.add(id);
          try {
            await new Promise(r => setTimeout(r, 150)); // X11 geometry settles async
            const now = await chrome.windows.get(id);
            const off = Math.abs(now.left - updateInfo.left) + Math.abs(now.top - updateInfo.top) +
              Math.abs(now.width - updateInfo.width) + Math.abs(now.height - updateInfo.height);
            if (off > 24) {
              console.info('reapplying dimensions', off);
              return Reflect.apply(target, self, args); // single correction, then trust it
            }
          }
          finally {
            pending.delete(id);
          }
          return win;
        });
      }
    });
  }
  catch (e) {}
}

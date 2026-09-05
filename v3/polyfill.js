'use strict';

/* chrome.system.display */
if (typeof window === 'object' && typeof screen === 'object') {
  if (typeof chrome.system === 'undefined' || typeof chrome.system.display === 'undefined') {
    const seen = new Map();
    const listeners = new Set();
    const number = (v, fallback) => Number.isFinite(v) ? v : fallback;
    const signature = () => JSON.stringify([
      number(screen.width, 0),
      number(screen.height, 0),
      number(screen.availWidth, 0),
      number(screen.availHeight, 0),
      number(screen.availLeft, 0),
      number(screen.availTop, 0)
    ]);
    let last = signature();
    const build = () => {
      const bounds = {
        left: 0,
        top: 0,
        width: number(screen.width, 1920),
        height: number(screen.height, 1080)
      };
      const workArea = {
        left: number(screen.availLeft, bounds.left),
        top: number(screen.availTop, bounds.top),
        width: number(screen.availWidth, bounds.width),
        height: number(screen.availHeight, bounds.height)
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

    // resize observer
    {
      const resize = () => {
        const current = signature();

        if (current !== last) {
          last = current;
          emit();
        }
      };
      let id;
      // when popup opens in not primary monitor, Firefox resizes popup from primary to secondary. so we can track both
      addEventListener('resize', () => {
        clearTimeout(id);
        id = setTimeout(resize, 250);
      });
    }

    try {
      chrome.system = chrome.system || {};
      chrome.system.display = chrome.system.display || {
        getInfo(options, callback) {
          const cb = typeof options === 'function' ? options : callback;

          const display = build();
          seen.set(signature(), display);
          const r = [display, ...[...seen.values()].filter(d => d !== display)];

          const promise = Promise.resolve(r);
          if (typeof cb === 'function') {
            promise.then(info => cb(info), e => console.error(e));
            return;
          }
          return promise;
        },
        onDisplayChanged: {
          addListener: fn => listeners.add(fn),
          removeListener: fn => listeners.delete(fn),
          hasListener: fn => listeners.has(fn)
        },
        __polyfilled: true
      };
    }
    catch (e) {}
  }
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
        if (!updateInfo || pending.has(id)) {
          return Reflect.apply(target, self, args);
        }
        return Reflect.apply(target, self, args).then(async win => {
          pending.add(id);
          try {
            await new Promise(r => setTimeout(r, 150)); // X11 geometry settles async
            const now = await chrome.windows.get(id);
            const off = Math.abs(now.left - updateInfo.left) + Math.abs(now.top - updateInfo.top) +
              Math.abs(now.width - updateInfo.width) + Math.abs(now.height - updateInfo.height);
            console.log(off);
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

'use strict';

const spawnCommander = (win, top, right, bottom, left, unit = '%') => {
  const args = new URLSearchParams();
  args.append('id', win.id);
  args.append('top', top);
  args.append('left', left);
  args.append('right', right);
  args.append('bottom', bottom);
  args.append('unit', unit);

  return chrome.windows.create({
    url: '/data/commander/index.html?' + args.toString(),
    width: 300,
    height: 300,
    left: parseInt(win.left + win.width / 2 - 150),
    top: parseInt(win.top + win.height / 2 - 150),
    type: 'popup'
  });
};

const resize = async (id, top, right, bottom, left, unit = '%') => {
  const win = await chrome.windows.get(id);

  if (chrome.system.display && chrome.system.display.__polyfilled) {
    return spawnCommander(win, top, right, bottom, left, unit);
  }

  const displays = await chrome.system.display.getInfo();

  const display = displays.find(d => {
    const {left, top, width, height} = d.bounds;

    return (
      win.left >= left &&
      win.left < left + width &&
      win.top >= top &&
      win.top < top + height
    );
  }) || displays[0];

  const box = unit === 'px' ? {
    left: parseInt(display.workArea.left + Number(left)),
    top: parseInt(display.workArea.top + Number(top)),
    width: parseInt(Number(right) - Number(left)),
    height: parseInt(Number(bottom) - Number(top))
  } : {
    left: parseInt(display.workArea.left + Number(left) / 100 * display.workArea.width),
    top: parseInt(display.workArea.top + Number(top) / 100 * display.workArea.height),
    width: parseInt(Number(right - left) / 100 * display.workArea.width),
    height: parseInt(Number(bottom - top) / 100 * display.workArea.height)
  };

  const prefs = await chrome.storage.local.get({
    'Win': {
      pw: 16,
      ph: 14
    }
  });
  const padding = prefs[navigator.platform.substr(0, 3)];
  if (padding) {
    box.left -= padding.pw / 2;
    box.width += padding.pw;
    box.height += padding.ph / 2;
  }
  await chrome.windows.update(id, {
    state: 'normal',
    ...box
  });
};

chrome.commands.onCommand.addListener(async command => {
  const prefs = await chrome.storage.local.get({
    'entries': [{
      size: [0, 100, 100, 0]
    }, {
      size: [0, 50, 50, 0]
    }, {
      size: [0, 100, 50, 50]
    }, {
      size: [50, 50, 100, 0]
    }, {
      size: [50, 100, 100, 50]
    }, {
      size: [0, 100, 50, 0]
    }, {
      size: [50, 100, 100, 0]
    }, {
      size: [0, 50, 100, 0]
    }, {
      size: [0, 100, 100, 50]
    }]
  });
  const index = Number(command.replace('layout-', ''));
  const entry = prefs.entries[index];
  if (entry) {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    if (tabs.length) {
      const [top, right, bottom, left] = entry.size;
      const win = await chrome.windows.get(tabs[0].windowId);
      spawnCommander(win, top, right, bottom, left, entry.unit || '%');
    }
  }
});

// message
chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'resize') {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs.length) {
        chrome.windows.update(tabs[0].windowId, {
          left: request.left,
          top: request.top,
          width: request.width,
          height: request.height,
          state: 'normal'
        }).then(() => response(true)).catch(e => {
          response(e.message);
        });
      }
      else {
        response('cannot detect the active tab');
      }
    });

    return true;
  }
  else if (request.method === 'log') {
    console.log(request);
  }
});

// startup
chrome.runtime.onStartup.addListener(() => chrome.storage.local.get({
  'startup-size': [],
  'startup-unit': '%'
}, prefs => {
  if (prefs['startup-size'].length) {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs.length) {
        const [top, right, bottom, left] = prefs['startup-size'];

        resize(tabs[0].windowId, top, right, bottom, left, prefs['startup-unit']);
      }
    });
  }
}));

chrome.windows.onCreated.addListener(win => {
  if (win.type !== 'normal') {
    return;
  }
  chrome.storage.local.get({
    'startup-size': [],
    'startup-unit': '%',
    'resize-new-window': true
  }).then(prefs => {
    if (prefs['resize-new-window'] && prefs['startup-size'].length) {
      const [top, right, bottom, left] = prefs['startup-size'];
      resize(win.id, top, right, bottom, left, prefs['startup-unit']);
    }
  });
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}

'use strict';

const box = {
  width: 300,
  height: 300,
  left: 0,
  top: 0,
  type: 'popup'
};

chrome.commands.onCommand.addListener(command => chrome.storage.local.get({
  entries: [{
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
}, prefs => {
  const index = Number(command.replace('layout-', ''));
  const entry = prefs.entries[index];
  if (entry) {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs.length) {
        const [top, right, bottom, left] = entry.size;
        const args = new URLSearchParams();
        args.append('id', tabs[0].windowId);
        args.append('top', top);
        args.append('left', left);
        args.append('right', right);
        args.append('bottom', bottom);

        chrome.windows.create({
          url: '/data/commander/index.html?' + args.toString(),
          ...box
        });
      }
    });
  }
}));

// message
chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'resize') {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs.length) {
        setTimeout(() => chrome.windows.update(tabs[0].windowId, {
          left: request.left,
          top: request.top,
          width: request.width,
          height: request.height,
          state: 'normal'
        }), 100);
        response(true);
      }
    });

    return true;
  }
});

// startup
chrome.runtime.onStartup.addListener(() => chrome.storage.local.get({
  'startup-size': []
}, prefs => {
  if (prefs['startup-size'].length) {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs.length) {
        const [top, right, bottom, left] = prefs['startup-size'];

        const args = new URLSearchParams();
        args.append('id', tabs[0].windowId);
        args.append('top', top);
        args.append('left', left);
        args.append('right', right);
        args.append('bottom', bottom);

        chrome.windows.create({
          url: '/data/commander/index.html?' + args.toString(),
          ...box
        });
      }
    });
  }
}));

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

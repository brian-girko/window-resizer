'use strict';

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
        chrome.windows.update(tabs[0].windowId, {
          left: parseInt(screen.availLeft + Number(left) / 100 * screen.availWidth),
          top: parseInt(screen.availTop + Number(top) / 100 * screen.availHeight),
          width: parseInt(Number(right - left) / 100 * screen.availWidth),
          height: parseInt(Number(bottom - top) / 100 * screen.availHeight)
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
            tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}

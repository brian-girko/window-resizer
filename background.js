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

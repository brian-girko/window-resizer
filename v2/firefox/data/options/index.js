'use strict';

const toast = document.getElementById('toast');

const r = {
  left: document.querySelector('[name=left]'),
  right: document.querySelector('[name=right]'),
  top: document.querySelector('[name=top]'),
  bottom: document.querySelector('[name=bottom]')
};

chrome.storage.local.get({
  'startup-size': []
}, prefs => {
  if (prefs['startup-size'].length) {
    r.top.value = prefs['startup-size'][0];
    r.right.value = prefs['startup-size'][1];
    r.bottom.value = prefs['startup-size'][2];
    r.left.value = prefs['startup-size'][3];
  }
});

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});

// preview
document.getElementById('preview').addEventListener('click', () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=Oq4vTTLGWuY'
}));

// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));

// unset
document.getElementById('unset').addEventListener('click', () => {
  r.top.value = '';
  r.right.value = '';
  r.bottom.value = '';
  r.left.value = '';
  chrome.storage.local.remove('startup-size');
});

// save
document.addEventListener('submit', e => {
  e.preventDefault();
  chrome.storage.local.set({
    'startup-size': [
      Number(r.top.value),
      Number(r.right.value),
      Number(r.bottom.value),
      Number(r.left.value)
    ]
  }, () => {
    toast.textContent = 'Options Saved';
    window.setTimeout(() => toast.textContent = '', 750);
  });
});

document.addEventListener('input', e => {
  const rv = Number(r.right.value);
  const lv = Number(r.left.value);
  const bv = Number(r.bottom.value);
  const tv = Number(r.top.value);

  if (isNaN(lv) === false && isNaN(rv) === false) {
    r.left.setCustomValidity(lv >= rv ? 'Need to be smaller than the right percent' : '');
  }
  if (isNaN(tv) === false && isNaN(bv) === false) {
    r.top.setCustomValidity(tv >= bv ? 'Need to be smaller than the bottom percent' : '');
  }
});

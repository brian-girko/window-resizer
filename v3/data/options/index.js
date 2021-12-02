'use strict';

const toast = document.getElementById('toast');

const r = {
  left: document.querySelector('[name=left]'),
  right: document.querySelector('[name=right]'),
  top: document.querySelector('[name=top]'),
  bottom: document.querySelector('[name=bottom]')
};

chrome.storage.local.get({
  'startup-size': [],
  'validate': true
}, prefs => {
  if (prefs['startup-size'].length) {
    r.top.value = prefs['startup-size'][0];
    r.right.value = prefs['startup-size'][1];
    r.bottom.value = prefs['startup-size'][2];
    r.left.value = prefs['startup-size'][3];
  }
  document.getElementById('validate').checked = prefs.validate === false;
  document.getElementById('validate').dispatchEvent(new Event('change'));
});

document.getElementById('validate').onchange = e => {
  chrome.storage.local.set({
    'validate': e.target.checked === false
  });
  if (e.target.checked) {
    r.left.removeAttribute('min');
    r.left.removeAttribute('max');
    r.top.removeAttribute('min');
    r.top.removeAttribute('max');
    r.right.removeAttribute('min');
    r.right.removeAttribute('max');
    r.bottom.removeAttribute('min');
    r.bottom.removeAttribute('max');
  }
  else {
    r.left.setAttribute('min', 0);
    r.left.setAttribute('max', 100);
    r.top.setAttribute('min', 0);
    r.top.setAttribute('max', 100);
    r.right.setAttribute('min', 0);
    r.right.setAttribute('max', 100);
    r.bottom.setAttribute('min', 0);
    r.bottom.setAttribute('max', 100);
  }
};

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

  toast.textContent = 'startup resizing is disabled';
  window.setTimeout(() => toast.textContent = '', 3000);
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

document.addEventListener('input', () => {
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

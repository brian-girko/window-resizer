'use strict';

const toast = document.getElementById('toast');
const unitSelect = document.getElementById('unit');

const r = {
  left: document.querySelector('[name=left]'),
  right: document.querySelector('[name=right]'),
  top: document.querySelector('[name=top]'),
  bottom: document.querySelector('[name=bottom]')
};

const prefs = {
  'startup-size': [],
  'startup-unit': '%',
  'resize-new-window': true,
  'validate': true
};

const applyConstraints = () => {
  const unit = unitSelect.value;

  for (const input of Object.values(r)) {
    input.removeAttribute('min');
    input.removeAttribute('max');
  }
  if (prefs.validate !== false) {
    for (const input of Object.values(r)) {
      input.setAttribute('min', 0);
    }
    if (unit === '%') {
      for (const input of Object.values(r)) {
        input.setAttribute('max', 100);
      }
    }
  }
};

const updateUnits = () => {
  document.querySelectorAll('.unit').forEach(span => span.textContent = unitSelect.value);
};

chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);

  if (prefs['startup-size'].length) {
    r.top.value = prefs['startup-size'][0];
    r.right.value = prefs['startup-size'][1];
    r.bottom.value = prefs['startup-size'][2];
    r.left.value = prefs['startup-size'][3];
  }
  unitSelect.value = prefs['startup-unit'] || '%';
  updateUnits();
  applyConstraints();
  document.getElementById('validate').checked = prefs.validate === false;
  document.getElementById('resize-new-window').checked = prefs['resize-new-window'];
});

document.getElementById('validate').onchange = e => {
  prefs.validate = e.target.checked === false;
  chrome.storage.local.set({
    'validate': prefs.validate
  });
  applyConstraints();
};

unitSelect.onchange = () => {
  updateUnits();
  applyConstraints();
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
    ],
    'startup-unit': unitSelect.value,
    'resize-new-window': document.getElementById('resize-new-window').checked
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
    r.left.setCustomValidity(lv >= rv ? 'Need to be smaller than the right value' : '');
  }
  if (isNaN(tv) === false && isNaN(bv) === false) {
    r.top.setCustomValidity(tv >= bv ? 'Need to be smaller than the bottom value' : '');
  }
});

// export
document.getElementById('export').addEventListener('click', () => {
  chrome.storage.local.get(null, prefs => {
    const text = JSON.stringify(prefs, null, '  ');
    const blob = new Blob([text], {type: 'application/json'});
    const objectURL = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: objectURL,
      type: 'application/json',
      download: 'window-resizer-preferences.json'
    }).dispatchEvent(new MouseEvent('click'));
    setTimeout(() => URL.revokeObjectURL(objectURL));
  });
});

// import
document.getElementById('import').addEventListener('click', () => {
  const input = document.createElement('input');
  input.style.display = 'none';
  input.type = 'file';
  input.accept = '.json';
  input.acceptCharset = 'utf-8';

  document.body.appendChild(input);
  input.initialValue = input.value;
  input.onchange = readFile;
  input.click();

  function readFile() {
    if (input.value !== input.initialValue) {
      const file = input.files[0];
      if (file.size > 100e6) {
        return console.warn('The file is too large!');
      }
      const reader = new FileReader();
      reader.onloadend = e => {
        input.remove();
        const json = JSON.parse(e.target.result);
        chrome.storage.local.set(json, () => chrome.runtime.reload());
      };
      reader.readAsText(file, 'utf-8');
    }
  }
});

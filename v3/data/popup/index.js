/* globals Sortable */
'use strict';

const template = document.getElementById('template');
const prefs = {
  color: 'rgba(0, 0, 255, 0.1)',
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
  }],
  validate: true
};

const add = ({
  size: [top, right, bottom, left]
}) => {
  const clone = document.importNode(template.content, true);
  clone.querySelector('div').dataset.id = [top, right, bottom, left].join(',');
  const svg = clone.querySelector('svg');

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('height', (bottom - top) / 100 * 256 + 'px');
  rect.setAttribute('width', (right - left) / 100 * 448 + 'px');
  rect.setAttribute('x', (left / 100 * 448 + 32) + 'px');
  rect.setAttribute('y', (top / 100 * 256 + 62) + 'px');
  rect.setAttribute('fill', prefs.color);
  svg.appendChild(rect);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '50%');
  text.setAttribute('y', '450px');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('style', 'font-size: 48px');
  text.appendChild(document.createTextNode(`(${top},${left}) - (${bottom},${right})`));
  svg.appendChild(text);

  document.getElementById('monitor').appendChild(clone);
};

document.addEventListener('DOMContentLoaded', () => chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);

  if (prefs.validate === false) {
    const left = document.querySelector('#add [name=left]');
    left.removeAttribute('min');
    left.removeAttribute('max');
    const right = document.querySelector('#add [name=right]');
    right.removeAttribute('min');
    right.removeAttribute('max');
    const top = document.querySelector('#add [name=top]');
    top.removeAttribute('min');
    top.removeAttribute('max');
    const bottom = document.querySelector('#add [name=bottom]');
    bottom.removeAttribute('min');
    bottom.removeAttribute('max');
  }

  prefs.entries.forEach(add);
  Sortable.create(document.getElementById('monitor'), {
    handle: '.dragable',
    animation: 150,
    store: {
      set(sortable) {
        const order = sortable.toArray();
        prefs.entries = order.map(s => ({
          size: s.split(',').map(Number)
        }));
        chrome.storage.local.set(prefs);
      }
    }
  });
}));

document.addEventListener('click', e => {
  const command = e.target.dataset.command;
  if (command === 'remove') {
    const target = e.target.closest('.dragable');
    const [top, right, bottom, left] = target.dataset.id.split(',').map(Number);
    prefs.entries = prefs.entries.filter(({size}) => {
      return size[3] !== left || size[0] !== top || size[2] !== bottom || size[1] !== right;
    });
    if (prefs.entries.length > 0) {
      chrome.storage.local.set(prefs, () => target.remove());
    }
    else {
      alert('Cannot remove the last entry');
    }
  }
  else if (command === 'change') {
    const [top, right, bottom, left] = e.target.dataset.id.split(',');
    const display = JSON.parse(document.getElementById('display').value);

    const box = {
      left: parseInt(display.left + Number(left) / 100 * display.width),
      width: parseInt(Number(right - left) / 100 * display.width),
      top: parseInt(display.top + Number(top) / 100 * display.height),
      height: parseInt(Number(bottom - top) / 100 * display.height)
    };

    chrome.storage.local.get({
      'Win': {
        pw: 16,
        ph: 14
      }
    }, prefs => {
      const padding = prefs[navigator.platform.substr(0, 3)];
      if (padding) {
        box.left -= padding.pw / 2;
        box.width += padding.pw;
        box.height += padding.ph / 2;
      }
      chrome.runtime.sendMessage({
        method: 'resize',
        ...box
      }, () => window.close());
    });
  }
});
document.addEventListener('transitionend', e => {
  e.target.classList.remove('active');
});

{
  const left = document.querySelector('#add [name=left]');
  const right = document.querySelector('#add [name=right]');
  const top = document.querySelector('#add [name=top]');
  const bottom = document.querySelector('#add [name=bottom]');

  document.getElementById('add').addEventListener('input', () => {
    const rv = Number(right.value);
    const lv = Number(left.value);
    const bv = Number(bottom.value);
    const tv = Number(top.value);

    if (isNaN(lv) === false && isNaN(rv) === false) {
      left.setCustomValidity(lv >= rv ? 'Need to be smaller than the right percent' : '');
    }
    if (isNaN(tv) === false && isNaN(bv) === false) {
      top.setCustomValidity(tv >= bv ? 'Need to be smaller than the bottom percent' : '');
    }
  });
  document.getElementById('add').addEventListener('submit', e => {
    e.preventDefault();
    const object = {
      size: [top.value, right.value, bottom.value, left.value].map(Number)
    };
    prefs.entries.push(object);
    chrome.storage.local.set(prefs, () => add(object));
  });

  // displays
  chrome.system.display.getInfo({}, info => {
    const select = document.getElementById('display');

    for (const o of info) {
      const option = document.createElement('option');
      option.textContent = o.bounds.width + '×' + o.bounds.height;
      option.value = JSON.stringify(o.workArea);

      select.appendChild(option);
    }
    const fix = n => Math.max(0, Math.min(100, n));
    chrome.windows.getCurrent(win => {
      // center position must be within the window (position of the action button)
      const o = info.filter(o => {
        const x = win.left + win.width / 2;
        const y = win.top + win.height / 2;
        return x >= o.workArea.left && x <= o.workArea.left + o.workArea.width &&
          y >= o.workArea.top && y <= o.workArea.top + o.workArea.height;
      }).shift() || info[0];

      select.options[info.indexOf(o)].selected = true;

      left.value = fix(Math.round((win.left - o.workArea.left) / o.workArea.width * 100));
      right.value = fix(Math.round((win.left - o.workArea.left + win.width) / o.workArea.width * 100));
      top.value = fix(Math.round((win.top - o.workArea.top) / o.workArea.height * 100));
      bottom.value = fix(Math.round((win.top - o.workArea.top + win.height) / o.workArea.height * 100));
    });
  });
}

document.getElementById('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
document.getElementById('test').addEventListener('click', () => chrome.tabs.create({
  url: 'https://webbrowsertools.com/screen-size/'
}));

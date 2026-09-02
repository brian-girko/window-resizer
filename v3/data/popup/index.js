/* globals Sortable */
'use strict';

const template = document.getElementById('template');
const unitSelect = document.getElementById('unit');
const inputs = {
  left: document.querySelector('#add [name=left]'),
  right: document.querySelector('#add [name=right]'),
  top: document.querySelector('#add [name=top]'),
  bottom: document.querySelector('#add [name=bottom]')
};
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
  validate: true,
  'popup-unit': '%'
};

let workArea = null;
let currentWin = null;

const counter = () => {
  document.documentElement.style.setProperty('--cols', document.querySelectorAll('.dragable').length);
};

const add = ({
  size: [top, right, bottom, left],
  unit = '%'
}, scroll = false) => {
  const id = [unit, top, right, bottom, left].join(',');

  const e = document.querySelector(`[data-id="${id}"]`);
  if (e) {
    if (scroll) {
      e.scrollIntoView();
    }
    return;
  }

  const clone = document.importNode(template.content, true);
  const div = clone.querySelector('div');
  div.dataset.id = id;
  const svg = clone.querySelector('svg');

  const wa = workArea || {
    width: 1920,
    height: 1080
  };
  const x = v => unit === 'px' ? v / wa.width * 448 : v / 100 * 448;
  const y = v => unit === 'px' ? v / wa.height * 256 : v / 100 * 256;

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('height', y(bottom - top) + 'px');
  rect.setAttribute('width', x(right - left) + 'px');
  rect.setAttribute('x', (x(left) + 32) + 'px');
  rect.setAttribute('y', (y(top) + 62) + 'px');
  rect.setAttribute('fill', prefs.color);
  svg.appendChild(rect);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '50%');
  text.setAttribute('y', '450px');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('style', 'font-size: 40px');
  text.appendChild(document.createTextNode(`(${top},${left}) - (${bottom},${right}) ${unit}`));
  svg.appendChild(text);

  document.getElementById('monitor').appendChild(clone);
  if (scroll) {
    div.scrollIntoView();
  }
};

const render = () => {
  document.getElementById('monitor').textContent = '';
  prefs.entries.forEach(o => add(o));
  counter();
};

const prefill = () => {
  if (currentWin && workArea) {
    if (unitSelect.value === 'px') {
      const clamp = (n, max) => Math.max(0, Math.min(max, n));
      inputs.left.value = clamp(Math.round(currentWin.left - workArea.left), workArea.width);
      inputs.right.value = clamp(Math.round(currentWin.left - workArea.left + currentWin.width), workArea.width);
      inputs.top.value = clamp(Math.round(currentWin.top - workArea.top), workArea.height);
      inputs.bottom.value = clamp(Math.round(currentWin.top - workArea.top + currentWin.height), workArea.height);
    }
    else {
      const fix = n => Math.max(0, Math.min(100, n));
      inputs.left.value = fix(Math.round((currentWin.left - workArea.left) / workArea.width * 100));
      inputs.right.value = fix(Math.round((currentWin.left - workArea.left + currentWin.width) / workArea.width * 100));
      inputs.top.value = fix(Math.round((currentWin.top - workArea.top) / workArea.height * 100));
      inputs.bottom.value = fix(Math.round((currentWin.top - workArea.top + currentWin.height) / workArea.height * 100));
    }
  }
};

const applyUnitUI = () => {
  const unit = unitSelect.value;

  document.querySelectorAll('#add .unit').forEach(span => span.textContent = unit);

  for (const input of Object.values(inputs)) {
    input.removeAttribute('min');
    input.removeAttribute('max');
  }
  if (prefs.validate !== false) {
    for (const input of Object.values(inputs)) {
      input.setAttribute('min', 0);
    }
    if (unit === '%') {
      for (const input of Object.values(inputs)) {
        input.setAttribute('max', 100);
      }
    }
  }
  prefill();
  document.getElementById('add').dispatchEvent(new Event('input'));
};

chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);
  unitSelect.value = prefs['popup-unit'] || '%';

  // displays
  chrome.system.display.getInfo({}, info => {
    const select = document.getElementById('display');

    for (const o of info) {
      const option = document.createElement('option');
      option.textContent = o.bounds.width + '×' + o.bounds.height;
      option.value = JSON.stringify(o.workArea);

      select.appendChild(option);
    }

    chrome.windows.getCurrent(win => {
      // center position must be within the window (position of the action button)
      const o = info.filter(o => {
        const x = win.left + win.width / 2;
        const y = win.top + win.height / 2;
        return x >= o.workArea.left && x <= o.workArea.left + o.workArea.width &&
          y >= o.workArea.top && y <= o.workArea.top + o.workArea.height;
      }).shift() || info[0];

      select.options[info.indexOf(o)].selected = true;
      workArea = o.workArea;
      currentWin = win;

      applyUnitUI();
      render();

      Sortable.create(document.getElementById('monitor'), {
        handle: '.dragable',
        animation: 150,
        store: {
          set(sortable) {
            const order = sortable.toArray();
            prefs.entries = order.map(s => {
              const [unit, top, right, bottom, left] = s.split(',');
              return {
                size: [Number(top), Number(right), Number(bottom), Number(left)],
                unit
              };
            });
            chrome.storage.local.set(prefs);
          }
        }
      });
    });
  });
});

document.addEventListener('click', async e => {
  const command = e.target.dataset.command;
  if (command === 'remove') {
    const target = e.target.closest('.dragable');
    const [unit, top, right, bottom, left] = target.dataset.id.split(',');

    prefs.entries = prefs.entries.filter(({size, unit: u = '%'}) => {
      return size[3] !== Number(left) || size[0] !== Number(top) || size[2] !== Number(bottom) || size[1] !== Number(right) || (u || '%') !== unit;
    });
    if (prefs.entries.length > 0) {
      const size = `(${top},${left}) - (${bottom},${right}) ${unit}`;

      if (confirm(`Are you sure you want to remove ` + size + ' resizing command?')) {
        chrome.storage.local.set(prefs, () => {
          target.remove();
          counter();
        });
      }
    }
    else {
      alert('Cannot remove the last entry');
    }
  }
  else if (command === 'change') {
    const [unit, top, right, bottom, left] = e.target.dataset.id.split(',');
    const display = JSON.parse(document.getElementById('display').value);

    const box = unit === 'px' ? {
      left: parseInt(display.left + Number(left)),
      width: parseInt(Number(right) - Number(left)),
      top: parseInt(display.top + Number(top)),
      height: parseInt(Number(bottom) - Number(top))
    } : {
      left: parseInt(display.left + Number(left) / 100 * display.width),
      width: parseInt(Number(right - left) / 100 * display.width),
      top: parseInt(display.top + Number(top) / 100 * display.height),
      height: parseInt(Number(bottom - top) / 100 * display.height)
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
    const b = await chrome.runtime.sendMessage({
      method: 'resize',
      ...box
    });
    if (b === true) {
      window.close();
    }
    else {
      alert(b);
    }
  }
});
document.addEventListener('transitionend', e => {
  e.target.classList.remove('active');
});

{
  document.getElementById('add').addEventListener('input', () => {
    const rv = inputs.right.valueAsNumber;
    const lv = inputs.left.valueAsNumber;
    const bv = inputs.bottom.valueAsNumber;
    const tv = inputs.top.valueAsNumber;

    if (isNaN(lv) === false && isNaN(rv) === false) {
      inputs.left.setCustomValidity(lv >= rv ? 'Need to be smaller than the right value' : '');
    }
    if (isNaN(tv) === false && isNaN(bv) === false) {
      inputs.top.setCustomValidity(tv >= bv ? 'Need to be smaller than the bottom value' : '');
    }
  });
  document.getElementById('add').addEventListener('submit', e => {
    e.preventDefault();
    const object = {
      size: [inputs.top.valueAsNumber, inputs.right.valueAsNumber, inputs.bottom.valueAsNumber, inputs.left.valueAsNumber],
      unit: unitSelect.value
    };
    // is this a new size?
    for (const o of prefs.entries) {
      o.unit = o.unit || '%';

      if (o.unit === object.unit) {
        if (
          o.size[0] === object.size[0] &&
          o.size[1] === object.size[1] &&
          o.size[2] === object.size[2] &&
          o.size[3] === object.size[3]
        ) {
          return alert('This size is already stored');
        }
      }
    }

    prefs.entries.push(object);
    chrome.storage.local.set(prefs, () => {
      add(object, true);
      counter();
    });
  });

  // switching displays re-scales px previews
  document.getElementById('display').addEventListener('change', () => {
    workArea = JSON.parse(document.getElementById('display').value);
    render();
  });

  unitSelect.addEventListener('change', () => {
    prefs['popup-unit'] = unitSelect.value;
    chrome.storage.local.set({
      'popup-unit': prefs['popup-unit']
    });
    applyUnitUI();
  });
}

document.getElementById('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
document.getElementById('test').addEventListener('click', () => chrome.tabs.create({
  url: 'https://webbrowsertools.com/screen-size/'
}));

/* globals Sortable */
'use strict';

var template = document.getElementById('template');
var prefs = {
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
  }]
};

var add = ({
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

chrome.storage.local.get(prefs, ps => {
  Object.assign(prefs, ps);

  prefs.entries.forEach(add);
  Sortable.create(document.getElementById('monitor'), {
    handle: 'svg',
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
});

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
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs.length) {
        chrome.windows.update(tabs[0].windowId, {
          left: parseInt(display.left + Number(left) / 100 * display.width),
          top: parseInt(display.top + Number(top) / 100 * display.height),
          width: parseInt(Number(right - left) / 100 * display.width),
          height: parseInt(Number(bottom - top) / 100 * display.height)
        });
      }
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

  document.getElementById('add').addEventListener('input', e => {
    const rv = Number(right.value);
    const lv = Number(left.value);
    const bv = Number(bottom.value);
    const tv = Number(top.value);

    if (e.target.name === 'left' && rv) {
      e.target.setCustomValidity(lv > rv ? 'Need to be smaller than the right percent' : '');
    }
    if (e.target.name === 'right' && lv) {
      e.target.setCustomValidity(rv < lv ? 'Need to be bigger than the left percent' : '');
    }
    if (e.target.name === 'top' && bv) {
      e.target.setCustomValidity(tv > bv ? 'Need to be smaller than the bottom percent' : '');
    }
    if (e.target.name === 'bottom' && tv) {
      e.target.setCustomValidity(bv < tv ? 'Need to be bigger than the top percent' : '');
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
}

// display
chrome.system.display.getInfo({}, info => {
  const select = document.getElementById('display');
  for (const o of info) {
    const option = document.createElement('option');
    option.textContent = o.bounds.width + '×' + o.bounds.height;
    option.value = JSON.stringify(o.workArea);

    select.appendChild(option);
  }
  for (const o of info) {
    if (o.workArea.left === screen.availLeft && o.workArea.top === screen.availTop) {
      select.options[info.indexOf(o)].selected = true;
    }
  }
});

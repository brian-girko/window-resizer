const args = new URLSearchParams(location.search);

{
  const left = args.get('left');
  const top = args.get('top');
  const right = args.get('right');
  const bottom = args.get('bottom');
  const unit = args.get('unit') || '%';

  const id = parseInt(args.get('id'));

  const availLeft = screen.availLeft || 0;
  const availTop = screen.availTop || 0;

  const box = unit === 'px' ? {
    left: parseInt(availLeft + Number(left)),
    top: parseInt(availTop + Number(top)),
    width: parseInt(Number(right) - Number(left)),
    height: parseInt(Number(bottom) - Number(top))
  } : {
    left: parseInt(availLeft + Number(left) / 100 * screen.availWidth),
    top: parseInt(availTop + Number(top) / 100 * screen.availHeight),
    width: parseInt(Number(right - left) / 100 * screen.availWidth),
    height: parseInt(Number(bottom - top) / 100 * screen.availHeight)
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
    chrome.windows.update(id, {
      state: 'normal',
      ...box
    }, () => window.close());
  });
}

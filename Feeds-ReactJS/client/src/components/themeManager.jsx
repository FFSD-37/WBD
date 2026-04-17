import { useSelector } from 'react-redux';
import React from 'react';

function ThemeManager() {
  const mode = useSelector(state => state.theme.mode);

  React.useEffect(() => {
    const root = document.body;

    root.classList.remove('normal-theme', 'channel-theme', 'kid-theme');

    if (mode === 'Normal') root.classList.add('normal-theme');
    if (mode === 'Channel') root.classList.add('channel-theme');
    if (mode === 'Kids') root.classList.add('kid-theme');
  }, [mode]);

  return null;
}

export default ThemeManager;

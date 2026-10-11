try {
  const theme = localStorage.getItem('campus-theme');
  document.documentElement.dataset.theme =
    theme === 'light' || theme === 'dark'
      ? theme
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
} catch {}

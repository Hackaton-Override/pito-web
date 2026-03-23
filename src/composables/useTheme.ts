import { ref, watch, onMounted } from 'vue';

type Theme = 'light' | 'dark';

const theme = ref<Theme>('light');

function applyTheme(value: Theme) {
  document.documentElement.setAttribute('data-theme', value);
  localStorage.setItem('theme', value);
}

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }

  function setTheme(value: Theme) {
    theme.value = value;
  }

  onMounted(() => {
    const saved = localStorage.getItem('theme') as Theme | null;

    if (saved) {
      theme.value = saved;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme.value = prefersDark ? 'dark' : 'light';
    }

    applyTheme(theme.value);
  });

  watch(theme, (value) => {
    applyTheme(value);
  });

  return {
    theme,
    toggle,
    setTheme,
    isDark: () => theme.value === 'dark',
  };
}
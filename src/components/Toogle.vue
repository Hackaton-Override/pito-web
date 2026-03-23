<script setup lang="ts">
import { useTheme } from '../composables/useTheme';

const { theme, toggle } = useTheme();
</script>

<template>
  <div class="flex items-center mx-2">
    <input
      type="checkbox"
      class="toggle bg-primary text-primary-content/40 checked:bg-secondary checked:text-secondary-content/80"
      :checked="theme === 'dark'"
      @change="toggle"
    />
  </div>
</template>
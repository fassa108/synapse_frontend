<script setup>
/**
 * AppSelect — select stylisé pour les formulaires.
 *
 * options : [{ value, label }]
 * placeholderSelectable : le placeholder redevient un choix (champ facultatif,
 *   ex. « Aucune ») au lieu d'une simple invite désactivée.
 */
defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Sélectionner…',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  placeholderSelectable: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.value)"
      class="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-9 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-zinc-400 disabled:cursor-not-allowed transition"
    >
      <option value="" :disabled="!placeholderSelectable">{{ placeholder }}</option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>

    <span
      class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
    >
      <i class="fa-solid fa-chevron-down text-xs"></i>
    </span>
  </div>
</template>

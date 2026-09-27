<script setup>
/**
 * FilterSelect — select stylisé pour les filtres.
 *
 * options : [{ value, label }]
 */
defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Tous',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      class="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 font-['Plus_Jakarta_Sans'] text-sm text-zinc-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
    >
      <option value="">{{ placeholder }}</option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>

    <span
      class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
    >
      <i class="fa-solid fa-chevron-down text-xs"></i>
    </span>
  </div>
</template>

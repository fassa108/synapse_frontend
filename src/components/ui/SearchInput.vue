<script setup>
/**
 * SearchInput — champ de recherche avec icône.
 * Utilise v-model via modelValue/update:modelValue.
 */
defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Rechercher…',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative">
    <span
      class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
    >
      <i class="fa-solid fa-magnifying-glass text-sm"></i>
    </span>

    <input
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
      class="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
    />
  </div>
</template>

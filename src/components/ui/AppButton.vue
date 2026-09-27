<script setup>
/**
 * AppButton — bouton principal et secondaire.
 *
 * Props :
 *   - variant : 'primary' | 'secondary' | 'danger' | 'ghost'
 *   - loading : bool — affiche un spinner et désactive
 *   - disabled : bool
 *   - type : submit | button | reset
 *   - icon : classe FA (facultatif, avant le label)
 */
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost'].includes(v),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'button',
  },
  icon: {
    type: String,
    default: '',
  },
})

const variantClasses = {
  primary:
    'bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-500/30 shadow-sm',
  secondary:
    'bg-white text-gray-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300/40 shadow-sm',
  danger:
    'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500/30 shadow-sm',
  ghost:
    'bg-transparent text-zinc-600 hover:bg-slate-100 focus:ring-slate-300/40',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold leading-5 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
    :class="variantClasses[variant]"
  >
    <i
      v-if="loading"
      class="fa-solid fa-circle-notch animate-spin text-sm"
    ></i>
    <i
      v-else-if="icon"
      :class="icon"
      class="text-sm"
    ></i>
    <slot />
  </button>
</template>

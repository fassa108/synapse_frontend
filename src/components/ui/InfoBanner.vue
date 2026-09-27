<script setup>
/**
 * InfoBanner — bannière d'information / erreur / succès.
 *
 * variant : 'info' | 'success' | 'warning' | 'error'
 */
defineProps({
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['info', 'success', 'warning', 'error'].includes(v),
  },
  message: {
    type: String,
    default: '',
  },
})

const config = {
  info:    { classes: 'bg-sky-50 border-sky-200 text-sky-800',     icon: 'fa-solid fa-circle-info text-sky-500' },
  success: { classes: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: 'fa-solid fa-circle-check text-emerald-500' },
  warning: { classes: 'bg-orange-50 border-orange-200 text-orange-800', icon: 'fa-solid fa-triangle-exclamation text-orange-500' },
  error:   { classes: 'bg-red-50 border-red-200 text-red-800',     icon: 'fa-solid fa-circle-xmark text-red-500' },
}
</script>

<template>
  <div
    v-if="message || $slots.default"
    class="flex items-start gap-3 rounded-xl border px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm"
    :class="config[variant].classes"
    role="alert"
  >
    <i :class="config[variant].icon" class="mt-0.5 shrink-0"></i>
    <span>
      <slot>{{ message }}</slot>
    </span>
  </div>
</template>

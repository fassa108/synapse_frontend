<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  iconBackground: {
    type: String,
    default: 'bg-indigo-50',
  },
  iconColor: {
    type: String,
    default: 'text-indigo-600',
  },
})
</script>

<template>
  <div
    class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm"
  >
    <!-- Icône -->
    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      :class="iconBackground"
    >
      <i :class="[icon, iconColor]" class="text-sm"></i>
    </div>

    <!-- Chiffre + label -->
    <div class="flex flex-col">
      <span class="font-['Sora'] text-2xl font-semibold leading-7 text-gray-900">
        {{ value }}
      </span>
      <span class="font-['Plus_Jakarta_Sans'] text-xs font-medium uppercase tracking-wide text-zinc-400">
        {{ label }}
      </span>
    </div>
  </div>
</template>

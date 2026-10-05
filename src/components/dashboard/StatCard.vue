<script setup>
/**
 * StatCard — indicateur chiffré d'un tableau de bord.
 *
 * Facultatif : « aide » (précision sous le libellé), « alerte » (mise en
 * avant quand une action est attendue), « to » (carte cliquable).
 */
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
  aide: {
    type: String,
    default: '',
  },
  alerte: {
    type: Boolean,
    default: false,
  },
  to: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to || undefined"
    class="flex items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm transition"
    :class="[
      alerte ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/80',
      to ? 'hover:border-indigo-200 hover:shadow-md' : '',
    ]"
  >
    <!-- Icône -->
    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      :class="iconBackground"
    >
      <i :class="[icon, iconColor]" class="text-sm"></i>
    </div>

    <!-- Chiffre + label -->
    <div class="flex min-w-0 flex-col">
      <span class="font-['Sora'] text-2xl font-semibold leading-7 text-gray-900">
        {{ value }}
      </span>
      <span class="truncate font-['Plus_Jakarta_Sans'] text-xs font-medium uppercase tracking-wide text-zinc-400" :title="label">
        {{ label }}
      </span>
      <span v-if="aide" class="truncate font-['Plus_Jakarta_Sans'] text-[11px] text-zinc-400">
        {{ aide }}
      </span>
    </div>
  </component>
</template>

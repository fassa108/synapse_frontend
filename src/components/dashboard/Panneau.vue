<script setup>
/**
 * Panneau — bloc titré d'un tableau de bord, avec lien « Tout voir »
 * facultatif et état vide.
 *
 * Props : titre, lien (route), libelleLien, vide (bool), messageVide, iconeVide
 */
defineProps({
  titre:       { type: String, required: true },
  lien:        { type: String, default: '' },
  libelleLien: { type: String, default: 'Tout voir' },
  vide:        { type: Boolean, default: false },
  messageVide: { type: String, default: 'Rien pour le moment.' },
  iconeVide:   { type: String, default: 'fa-solid fa-circle-check' },
})
</script>

<template>
  <section class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-baseline justify-between gap-3">
      <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
        {{ titre }}
        <slot name="badge" />
      </h2>
      <RouterLink v-if="lien" :to="lien" class="shrink-0 font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline">
        {{ libelleLien }}
      </RouterLink>
    </div>

    <div v-if="vide" class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center text-zinc-400">
      <i :class="iconeVide" class="text-xl"></i>
      <p class="font-['Plus_Jakarta_Sans'] text-sm">{{ messageVide }}</p>
    </div>
    <slot v-else />
  </section>
</template>

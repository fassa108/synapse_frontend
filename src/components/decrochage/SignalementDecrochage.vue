<script setup>
/**
 * Niveau de décrochage (À surveiller / À risque) et motifs courts
 * (« 2 retards », « sans dépôt 16 j »…), calculés par le backend.
 */
defineProps({
  niveau: { type: String, default: '' },
  signaux: { type: Array, default: () => [] },
  // Motifs détaillés (libellés complets) plutôt que courts
  detaille: { type: Boolean, default: false },
})

const NIVEAUX = {
  A_RISQUE: { label: 'À risque', classes: 'bg-rose-50 text-rose-700 ring-rose-200' },
  A_SURVEILLER: { label: 'À surveiller', classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
}

const ICONES = {
  RETARDS: 'fa-hourglass-end',
  INACTIVITE: 'fa-file-circle-xmark',
  ABSENCE: 'fa-user-clock',
  PROGRESSION: 'fa-chart-line',
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span
      v-if="NIVEAUX[niveau]"
      class="inline-flex items-center rounded-full px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold ring-1"
      :class="NIVEAUX[niveau].classes"
    >
      {{ NIVEAUX[niveau].label }}
    </span>
    <span
      v-for="s in signaux"
      :key="s.code"
      class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] text-zinc-600"
      :title="s.libelle"
    >
      <i class="fa-solid text-[10px] text-zinc-400" :class="ICONES[s.code] ?? 'fa-circle-exclamation'"></i>
      {{ detaille ? s.libelle : s.court }}
    </span>
  </div>
</template>

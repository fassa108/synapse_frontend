<script setup>
/**
 * JaugeProgression — anneau « X / Y » avec pourcentage au centre.
 *
 * Props : titre, valeur, total, couleur (hex)
 */
import { computed } from 'vue'
import Graphique from './Graphique.vue'

const props = defineProps({
  titre:   { type: String, required: true },
  valeur:  { type: Number, required: true },
  total:   { type: Number, required: true },
  couleur: { type: String, default: '#6366f1' },
})

const pourcentage = computed(() => (props.total ? Math.round((props.valeur / props.total) * 100) : 0))

const data = computed(() => ({
  labels: ['Validé', 'Reste'],
  datasets: [{
    data: [props.valeur, Math.max(props.total - props.valeur, 0) || (props.total ? 0 : 1)],
    backgroundColor: [props.couleur, '#e4e4e7'],
    borderWidth: 0,
  }],
}))
const options = { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
</script>

<template>
  <div class="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="relative h-28 w-28 shrink-0">
      <Graphique type="doughnut" :data="data" :options="options" />
      <span class="absolute inset-0 flex items-center justify-center font-['Sora'] text-lg font-semibold text-gray-900">
        {{ pourcentage }}%
      </span>
    </div>
    <div class="font-['Plus_Jakarta_Sans']">
      <p class="text-sm text-zinc-500">{{ titre }}</p>
      <p class="mt-1 font-['Sora'] text-2xl font-semibold text-gray-900">
        {{ valeur }} <span class="text-base font-normal text-zinc-400">/ {{ total }}</span>
      </p>
    </div>
  </div>
</template>

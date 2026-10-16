<script setup>
/**
 * CourbeEvolution — % de compétences acquises, semaine par semaine.
 *
 * Props :
 *   - series  : [{ label, points: [{ semaine: 'AAAA-MM-JJ', pct }], couleur, pointilles }]
 *               (les semaines peuvent différer d'une série à l'autre : axe commun)
 *   - hauteur : hauteur du graphique (CSS)
 */
import { computed } from 'vue'
import Graphique from './Graphique.vue'

const props = defineProps({
  series: { type: Array, required: true },
  hauteur: { type: String, default: '16rem' },
})

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6']

const versDate = (cle) => {
  const [a, m, j] = cle.split('-').map(Number)
  return new Date(a, m - 1, j)
}

const semaines = computed(() =>
  [...new Set(props.series.flatMap((s) => s.points.map((p) => p.semaine)))].sort(),
)

const vide = computed(() => semaines.value.length === 0)

const donnees = computed(() => ({
  labels: semaines.value.map((s) => versDate(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })),
  datasets: props.series.map((s, i) => {
    const parSemaine = new Map(s.points.map((p) => [p.semaine, p.pct]))
    const couleur = s.couleur ?? PALETTE[i % PALETTE.length]
    return {
      label: s.label,
      data: semaines.value.map((sem) => parSemaine.get(sem) ?? null),
      borderColor: couleur,
      backgroundColor: couleur,
      borderDash: s.pointilles ? [6, 4] : [],
      borderWidth: 2,
      pointRadius: 2.5,
      pointHoverRadius: 5,
      tension: 0.3,
    }
  }),
}))

const options = computed(() => ({
  interaction: { mode: 'index', intersect: false },
  scales: {
    y: { min: 0, max: 100, ticks: { stepSize: 25, callback: (v) => `${v} %` }, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
  },
  plugins: {
    legend: { display: props.series.length > 1, position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label} : ${ctx.parsed.y} %` } },
  },
}))
</script>

<template>
  <div v-if="vide" class="flex flex-col items-center justify-center gap-2 py-8 text-center text-zinc-400" :style="{ minHeight: hauteur }">
    <i class="fa-solid fa-chart-line text-xl"></i>
    <p class="font-['Plus_Jakarta_Sans'] text-sm">La courbe apparaîtra dès le début de la promotion.</p>
  </div>
  <div v-else :style="{ height: hauteur }">
    <Graphique type="line" :data="donnees" :options="options" />
  </div>
</template>

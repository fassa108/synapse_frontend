<script setup>
/**
 * Graphique — enveloppe minimale de Chart.js.
 * Recréé quand les données changent ; détruit au démontage.
 *
 * Props : type ('doughnut', 'bar'…), data, options (Chart.js)
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'

const props = defineProps({
  type:    { type: String, required: true },
  data:    { type: Object, required: true },
  options: { type: Object, default: () => ({}) },
})

const canvas = ref(null)
let graphique = null

const dessiner = () => {
  graphique?.destroy()
  graphique = new Chart(canvas.value, {
    type: props.type,
    data: props.data,
    options: { responsive: true, maintainAspectRatio: false, ...props.options },
  })
}

onMounted(dessiner)
watch(() => [props.data, props.options], dessiner, { deep: true })
onBeforeUnmount(() => graphique?.destroy())
</script>

<template>
  <div class="relative h-full w-full">
    <canvas ref="canvas"></canvas>
  </div>
</template>

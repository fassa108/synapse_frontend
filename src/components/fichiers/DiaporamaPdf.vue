<script setup>
/**
 * DiaporamaPdf — affiche un PDF slide par slide (aperçu d'un PPTX).
 *
 * Une slide à la fois, ajustée à l'espace disponible ; navigation par
 * boutons, flèches du clavier et miniatures ; plein écran.
 * pdf.js n'est chargé qu'à la première ouverture d'un diaporama.
 *
 * Props :
 *   - pdf : Blob du PDF (une page = une slide)
 *
 * Émet : erreur (PDF illisible)
 */
import { ref, shallowRef, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  pdf: { type: Blob, required: true },
})
const emit = defineEmits(['erreur'])

const racine     = ref(null)
const scene      = ref(null)
const canvas     = ref(null)
const miniatures = ref([])
const document_  = shallowRef(null)
const total      = ref(0)
const courante   = ref(1)
const chargement = ref(true)
const pleinEcran = ref(false)

let rendu = null        // rendu en cours de la slide affichée (annulable)
let chargementPdf = null // tâche pdf.js : sa destruction libère le document
let observateur = null
let annule = false

const chargerPdfjs = async () => {
  const pdfjs = await import('pdfjs-dist')
  const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  return pdfjs
}

const ouvrir = async () => {
  chargement.value = true
  try {
    const pdfjs = await chargerPdfjs()
    chargementPdf = pdfjs.getDocument({ data: await props.pdf.arrayBuffer(), isEvalSupported: false })
    const doc = await chargementPdf.promise
    if (annule) return chargementPdf.destroy() // fermé pendant le chargement
    document_.value = doc
    total.value = doc.numPages
    courante.value = 1
    chargement.value = false
    await nextTick()
    await afficher()
    dessinerMiniatures()
  } catch {
    if (!annule) emit('erreur')
  }
}

// Slide courante, à la taille de la scène (net sur les écrans haute densité)
const afficher = async () => {
  const doc = document_.value
  if (!doc || !scene.value || !canvas.value) return
  rendu?.cancel()
  const page = await doc.getPage(courante.value)
  const base = page.getViewport({ scale: 1 })
  const largeur = scene.value.clientWidth - 32
  const hauteur = scene.value.clientHeight - 32
  const echelle = Math.max(0.1, Math.min(largeur / base.width, hauteur / base.height))
  const ratio = window.devicePixelRatio || 1
  const vue = page.getViewport({ scale: echelle * ratio })
  const c = canvas.value
  c.width = Math.floor(vue.width)
  c.height = Math.floor(vue.height)
  c.style.width = `${Math.floor(vue.width / ratio)}px`
  c.style.height = `${Math.floor(vue.height / ratio)}px`
  rendu = page.render({ canvasContext: c.getContext('2d'), viewport: vue, canvas: c })
  try {
    await rendu.promise
  } catch {
    // rendu annulé par une nouvelle slide : rien à faire
  }
}

// Miniatures dessinées l'une après l'autre, sans bloquer l'affichage
const dessinerMiniatures = async () => {
  const doc = document_.value
  for (let n = 1; n <= total.value && !annule && document_.value === doc; n += 1) {
    const c = miniatures.value[n - 1]
    if (!c) continue
    const page = await doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const vue = page.getViewport({ scale: (120 * (window.devicePixelRatio || 1)) / base.width })
    c.width = Math.floor(vue.width)
    c.height = Math.floor(vue.height)
    await page.render({ canvasContext: c.getContext('2d'), viewport: vue, canvas: c }).promise.catch(() => {})
  }
}

const aller = (n) => {
  if (n < 1 || n > total.value || n === courante.value) return
  courante.value = n
}
watch(courante, async (n) => {
  afficher()
  await nextTick()
  miniatures.value[n - 1]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
})

const surTouche = (e) => {
  if (!document_.value) return
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') aller(courante.value + 1)
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') aller(courante.value - 1)
  else if (e.key === 'Home') aller(1)
  else if (e.key === 'End') aller(total.value)
  else return
  e.preventDefault()
}

const basculerPleinEcran = () => {
  if (document.fullscreenElement) document.exitFullscreen()
  else racine.value?.requestFullscreen?.()
}
const surPleinEcran = () => {
  pleinEcran.value = document.fullscreenElement === racine.value
  nextTick(afficher)
}

onMounted(() => {
  window.addEventListener('keydown', surTouche)
  document.addEventListener('fullscreenchange', surPleinEcran)
  observateur = new ResizeObserver(() => afficher())
  if (scene.value) observateur.observe(scene.value)
  ouvrir()
})

onBeforeUnmount(() => {
  annule = true
  window.removeEventListener('keydown', surTouche)
  document.removeEventListener('fullscreenchange', surPleinEcran)
  observateur?.disconnect()
  rendu?.cancel()
  chargementPdf?.destroy()
})
</script>

<template>
  <div ref="racine" class="flex h-full flex-col bg-zinc-900">
    <!-- Slide -->
    <div ref="scene" class="relative flex min-h-0 flex-1 items-center justify-center">
      <i v-if="chargement" class="fa-solid fa-spinner fa-spin text-2xl text-zinc-500"></i>
      <canvas v-show="!chargement" ref="canvas" class="bg-white shadow-2xl"></canvas>

      <template v-if="!chargement">
        <button
          type="button"
          class="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-20"
          aria-label="Slide précédente"
          :disabled="courante === 1"
          @click="aller(courante - 1)"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button
          type="button"
          class="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-20"
          aria-label="Slide suivante"
          :disabled="courante === total"
          @click="aller(courante + 1)"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </template>
    </div>

    <!-- Barre : miniatures, position, plein écran -->
    <div v-if="!chargement" class="flex items-center gap-3 border-t border-white/10 px-3 py-2">
      <div class="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
        <button
          v-for="n in total"
          :key="n"
          type="button"
          class="shrink-0 rounded ring-2 transition"
          :class="n === courante ? 'ring-indigo-400' : 'ring-transparent opacity-60 hover:opacity-100'"
          :aria-label="`Slide ${n}`"
          @click="aller(n)"
        >
          <canvas :ref="(el) => { if (el) miniatures[n - 1] = el }" class="block h-auto w-[120px] bg-white"></canvas>
        </button>
      </div>
      <span class="shrink-0 font-['Plus_Jakarta_Sans'] text-sm tabular-nums text-zinc-300">{{ courante }} / {{ total }}</span>
      <button
        type="button"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10"
        :aria-label="pleinEcran ? 'Quitter le plein écran' : 'Plein écran'"
        :title="pleinEcran ? 'Quitter le plein écran' : 'Plein écran'"
        @click="basculerPleinEcran"
      >
        <i :class="pleinEcran ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
      </button>
    </div>
  </div>
</template>

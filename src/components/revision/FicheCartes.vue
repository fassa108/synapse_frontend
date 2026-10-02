<script setup>
/**
 * FicheCartes — une fiche de révision en cartes à retourner, une à la fois.
 *
 * Chaque point devient une carte : la notion au recto, l'explication au
 * verso (point « Notion : explication » coupé au premier « : » ; sinon le
 * titre de la section au recto). « À retenir » sert d'écran final.
 * Clavier : ← → pour naviguer, espace ou entrée pour retourner.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  contenu: {
    type: Object,
    required: true,
  },
})

const LONGUEUR_MAX_NOTION = 80

const decouper = (point, section) => {
  const i = point.indexOf(':')
  const notion = i > 0 ? point.slice(0, i).trim() : ''
  if (notion && notion.length <= LONGUEUR_MAX_NOTION && point.slice(i + 1).trim()) {
    return { notion, explication: point.slice(i + 1).trim() }
  }
  return { notion: section, explication: point }
}

const cartes = computed(() =>
  props.contenu.sections.flatMap((s) => s.points.map((p) => ({ section: s.titre, ...decouper(p, s.titre) })))
)

const index = ref(0)
const retournee = ref(false)
const fin = computed(() => index.value >= cartes.value.length)
const carte = computed(() => cartes.value[index.value])
const progression = computed(() => Math.round((Math.min(index.value + 1, cartes.value.length) / cartes.value.length) * 100))

const aller = (i) => {
  index.value = Math.max(0, Math.min(i, cartes.value.length))
  retournee.value = false
}
const suivante = () => aller(index.value + 1)
const precedente = () => aller(index.value - 1)
const retourner = () => {
  if (!fin.value) retournee.value = !retournee.value
}

const clavier = (e) => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
  if (e.key === 'ArrowRight') suivante()
  else if (e.key === 'ArrowLeft') precedente()
  else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    retourner()
  }
}
onMounted(() => window.addEventListener('keydown', clavier))
onBeforeUnmount(() => window.removeEventListener('keydown', clavier))
</script>

<template>
  <div class="flex flex-col gap-5 font-['Plus_Jakarta_Sans']">
    <p class="text-sm leading-relaxed text-zinc-500">{{ contenu.resume }}</p>

    <!-- Progression -->
    <div class="flex items-center gap-3">
      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div class="h-full rounded-full bg-indigo-500 transition-all duration-300" :style="{ width: `${fin ? 100 : progression}%` }"></div>
      </div>
      <span class="shrink-0 text-xs font-medium tabular-nums text-zinc-500">
        {{ fin ? 'Terminé' : `${index + 1} / ${cartes.length}` }}
      </span>
    </div>

    <!-- Carte -->
    <template v-if="!fin">
      <p class="text-center text-xs font-semibold uppercase tracking-wide text-indigo-500">{{ carte.section }}</p>

      <button
        type="button"
        class="group mx-auto h-72 w-full max-w-xl [perspective:1200px] focus:outline-none"
        :aria-pressed="retournee"
        :aria-label="retournee ? 'Revenir à la notion' : 'Révéler l\'explication'"
        @click="retourner"
      >
        <div
          class="relative h-full w-full rounded-3xl transition-transform duration-500 [transform-style:preserve-3d]"
          :class="{ '[transform:rotateY(180deg)]': retournee }"
        >
          <!-- Recto : la notion -->
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm [backface-visibility:hidden] group-focus-visible:ring-4 group-focus-visible:ring-indigo-500/20">
            <span class="text-center font-['Sora'] text-2xl font-semibold leading-snug text-gray-900">{{ carte.notion }}</span>
            <span class="flex items-center gap-2 text-xs text-zinc-400">
              <i class="fa-solid fa-rotate"></i> Cliquer pour révéler
            </span>
          </div>

          <!-- Verso : l'explication -->
          <div class="absolute inset-0 flex flex-col justify-center gap-3 overflow-y-auto rounded-3xl border border-indigo-200 bg-indigo-50 p-8 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span class="font-['Sora'] text-sm font-semibold text-indigo-600">{{ carte.notion }}</span>
            <span class="text-lg leading-relaxed text-gray-900">{{ carte.explication }}</span>
          </div>
        </div>
      </button>

      <div class="flex items-center justify-between">
        <button
          type="button" :disabled="index === 0"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-slate-100 disabled:opacity-30"
          @click="precedente"
        ><i class="fa-solid fa-arrow-left"></i> Précédente</button>
        <span class="hidden text-xs text-zinc-400 sm:block">← → pour naviguer · espace pour retourner</span>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
          @click="suivante"
        >{{ index === cartes.length - 1 ? 'Terminer' : 'Suivante' }} <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </template>

    <!-- Écran final : à retenir -->
    <div v-else class="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-indigo-200 bg-indigo-50 p-8">
      <h3 class="flex items-center gap-2 font-['Sora'] text-lg font-semibold text-indigo-700">
        <i class="fa-solid fa-lightbulb"></i> À retenir
      </h3>
      <ul class="flex flex-col gap-3">
        <li v-for="(point, j) in contenu.a_retenir" :key="j" class="flex gap-3 text-base leading-relaxed text-gray-900">
          <i class="fa-solid fa-circle-check mt-1 text-indigo-500"></i>
          <span>{{ point }}</span>
        </li>
      </ul>
      <div class="flex justify-between pt-2">
        <button type="button" class="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-indigo-600" @click="precedente">
          <i class="fa-solid fa-arrow-left"></i> Dernière carte
        </button>
        <button type="button" class="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline" @click="aller(0)">
          <i class="fa-solid fa-rotate-right"></i> Recommencer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * MenuExport — bouton « Exporter » et sa liste de téléchargements.
 *
 * Props :
 *   - elements : [{ label, description?, icon, action: async () => {} }]
 *   - libelle  : texte du bouton
 * Se ferme au clic en dehors et à Échap ; l'élément en cours affiche un spinner.
 */
import { onMounted, onUnmounted, ref } from 'vue'

defineProps({
  elements: { type: Array, required: true },
  libelle: { type: String, default: 'Exporter' },
})

const ouvert = ref(false)
const enCours = ref(null)
const erreur = ref('')
const racine = ref(null)

const lancer = async (element) => {
  enCours.value = element.label
  erreur.value = ''
  try {
    await element.action()
    ouvert.value = false
  } catch {
    erreur.value = "L'export a échoué. Réessayez."
  } finally {
    enCours.value = null
  }
}

const clicDehors = (e) => {
  if (racine.value && !racine.value.contains(e.target)) ouvert.value = false
}
const touche = (e) => {
  if (e.key === 'Escape') ouvert.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', clicDehors)
  document.addEventListener('keydown', touche)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', clicDehors)
  document.removeEventListener('keydown', touche)
})
</script>

<template>
  <div ref="racine" class="relative">
    <button
      type="button"
      class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold leading-5 text-gray-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
      :aria-expanded="ouvert"
      @click="ouvert = !ouvert"
    >
      <i class="fa-solid fa-file-export text-sm"></i>
      {{ libelle }}
      <i class="fa-solid fa-chevron-down text-[10px] text-zinc-400 transition" :class="{ 'rotate-180': ouvert }"></i>
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="ouvert"
        class="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
      >
        <button
          v-for="element in elements"
          :key="element.label"
          type="button"
          class="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50 disabled:opacity-60"
          :disabled="enCours !== null"
          @click="lancer(element)"
        >
          <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <i :class="enCours === element.label ? 'fa-solid fa-circle-notch animate-spin' : element.icon" class="text-xs"></i>
          </span>
          <span class="min-w-0">
            <span class="block font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-800">{{ element.label }}</span>
            <span v-if="element.description" class="block font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              {{ element.description }}
            </span>
          </span>
        </button>
        <p v-if="erreur" class="px-3 py-2 font-['Plus_Jakarta_Sans'] text-xs text-red-600">{{ erreur }}</p>
      </div>
    </Transition>
  </div>
</template>

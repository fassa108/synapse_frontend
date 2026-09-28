<script setup>
/**
 * VisionneuseFichier — consultation d'un fichier dans la plateforme.
 *
 * - PDF, aperçu PDF d'un DOCX : visionneuse du navigateur
 * - Aperçu PDF d'un PPTX : diaporama, slide par slide
 * - TXT : texte brut
 * - Aperçu Office pas encore prêt : message et réessai automatique
 *
 * Props :
 *   - fichier : { chemin, nom, extension } — chemin API (`ressources/<id>` ou
 *               `fichiers-livrables/<id>`) ; null = fermé
 *   - telecharger : fonction de téléchargement de l'original
 *
 * Émet : fermer
 */
import { ref, shallowRef, watch, onMounted, onBeforeUnmount } from 'vue'
import AppButton from '../ui/AppButton.vue'
import DiaporamaPdf from './DiaporamaPdf.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { consulterFichier } from '../../services/activites'

const props = defineProps({
  fichier:     { type: Object, default: null },
  telecharger: { type: Function, required: true },
})
const emit = defineEmits(['fermer'])

const authStore = useAuthStore()

const chargement = ref(false)
const urlPdf     = ref('')
const diaporama  = shallowRef(null) // Blob PDF affiché slide par slide (PPTX)
const texte      = ref(null)
const apercu     = ref('')   // EN_COURS | ECHEC | INDISPONIBLE
const erreur     = ref('')
const envoiDl    = ref(false)

let minuterie = null
let essais = 0
const ESSAIS_MAX = 20 // ~1 min à 3 s d'intervalle

const reinitialiser = () => {
  clearTimeout(minuterie)
  if (urlPdf.value) URL.revokeObjectURL(urlPdf.value)
  urlPdf.value = ''
  diaporama.value = null
  texte.value = null
  apercu.value = ''
  erreur.value = ''
  essais = 0
}

const charger = async () => {
  const f = props.fichier
  if (!f) return
  chargement.value = !apercu.value
  try {
    const res = await consulterFichier(authStore.tenantCourant?.id, f.chemin)
    if (props.fichier !== f) return // fermé ou changé entre-temps
    if (res.pdf) {
      apercu.value = ''
      if (f.extension === 'pptx') diaporama.value = res.pdf
      else urlPdf.value = URL.createObjectURL(res.pdf)
    } else if (res.texte !== undefined) {
      texte.value = res.texte
    } else {
      apercu.value = res.apercu
      // Aperçu en préparation : on réessaie tout seul
      if (res.apercu === 'EN_COURS' && essais < ESSAIS_MAX) {
        essais += 1
        minuterie = setTimeout(charger, 3000)
      }
    }
  } catch {
    if (props.fichier === f) erreur.value = "Impossible d'afficher ce fichier."
  } finally {
    chargement.value = false
  }
}

watch(() => props.fichier, () => { reinitialiser(); charger() }, { immediate: true })

const surTouche = (e) => { if (e.key === 'Escape' && props.fichier) emit('fermer') }
onMounted(() => window.addEventListener('keydown', surTouche))
onBeforeUnmount(() => { window.removeEventListener('keydown', surTouche); reinitialiser() })

const reessayer = () => { essais = 0; charger() }

const telechargerOriginal = async () => {
  envoiDl.value = true
  erreur.value = ''
  try {
    await props.telecharger()
  } catch {
    erreur.value = 'Impossible de télécharger ce fichier.'
  } finally {
    envoiDl.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="fichier"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      @click.self="emit('fermer')"
    >
      <div class="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div class="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <i class="fa-solid fa-file-lines text-zinc-400"></i>
          <h2 class="min-w-0 flex-1 truncate font-['Sora'] text-sm font-semibold text-gray-900" :title="fichier.nom">
            {{ fichier.nom }}
          </h2>
          <AppButton variant="secondary" icon="fa-solid fa-download" :loading="envoiDl" @click="telechargerOriginal">
            Télécharger
          </AppButton>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
            aria-label="Fermer"
            @click="emit('fermer')"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="relative flex-1 overflow-auto bg-slate-50">
          <InfoBanner v-if="erreur" variant="error" :message="erreur" class="m-5" />

          <div v-if="chargement" class="flex h-full items-center justify-center text-zinc-400">
            <i class="fa-solid fa-spinner fa-spin text-2xl"></i>
          </div>

          <DiaporamaPdf
            v-else-if="diaporama"
            :pdf="diaporama"
            @erreur="diaporama = null; erreur = 'Impossible d\'afficher ce diaporama.'"
          />

          <iframe
            v-else-if="urlPdf"
            :src="urlPdf"
            :title="fichier.nom"
            class="h-full w-full border-0"
          ></iframe>

          <pre
            v-else-if="texte !== null"
            class="m-0 min-h-full whitespace-pre-wrap break-words bg-white p-6 font-mono text-sm text-gray-800"
          >{{ texte }}</pre>

          <div v-else-if="apercu" class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center font-['Plus_Jakarta_Sans']">
            <template v-if="apercu === 'EN_COURS'">
              <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i>
              <p class="text-sm font-semibold text-gray-900">Aperçu en préparation…</p>
              <p class="text-xs text-zinc-500">
                Le fichier vient d'être déposé et sa conversion prend quelques secondes.
              </p>
              <AppButton variant="secondary" icon="fa-solid fa-rotate" @click="reessayer">Réessayer</AppButton>
            </template>
            <template v-else>
              <i class="fa-solid fa-eye-slash text-2xl text-zinc-300"></i>
              <p class="text-sm font-semibold text-gray-900">Aperçu indisponible pour ce fichier</p>
              <p class="text-xs text-zinc-500">Vous pouvez le télécharger pour l'ouvrir.</p>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

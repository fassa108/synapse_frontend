<script setup>
/**
 * GenerationModal — demande de génération d'un quiz ou d'une fiche.
 *
 * Sources : ressources (fichiers) de la bibliothèque, fichiers des
 * livrables déposés sur les briefs du module (promotions du formateur),
 * fichiers ajoutés. Entre 1 et NB_SOURCES_MAX fichiers au total.
 * La génération continue en tâche de fond : la modale se ferme aussitôt.
 */
import { ref, computed, onMounted } from 'vue'
import AppButton from '../ui/AppButton.vue'
import FormField from '../ui/FormField.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { getRessources, getLivrables } from '../../services/activites'
import { genererSupport } from '../../services/revision'
import { ACCEPT_FICHIERS, verifierFichier, tailleLisible } from '../../utils/fichiers'
import { NB_SOURCES_MAX, NB_QUESTIONS_MAX, libelleDifficulte, messageErreur } from '../../utils/revision'

const props = defineProps({
  tenantId: { type: [Number, String], required: true },
  module: { type: Object, required: true },
  type: { type: String, required: true }, // 'QUIZ' | 'FICHE'
  difficulte: { type: String, default: '' },
})
const emit = defineEmits(['fermer', 'genere'])

const estQuiz = computed(() => props.type === 'QUIZ')
const titre = computed(() =>
  estQuiz.value
    ? `Générer le quiz ${libelleDifficulte(props.difficulte).toLowerCase()}`
    : 'Générer une fiche de révision'
)

const chargement = ref(true)
const envoi = ref(false)
const erreur = ref('')

const ressources = ref([])
const fichiersLivrables = ref([])
const choixRessources = ref([])
const choixLivrables = ref([])
const fichiers = ref([])
const erreurFichiers = ref('')
const nbQuestions = ref(10)

onMounted(async () => {
  try {
    const [r, l] = await Promise.all([
      getRessources(props.tenantId),
      getLivrables(props.tenantId, { module: props.module.id }),
    ])
    // Un lien ne peut pas servir de source : fichiers seulement
    ressources.value = r.filter((x) => !x.url)
    fichiersLivrables.value = l.flatMap((livrable) =>
      livrable.fichiers
        .filter((f) => !f.url)
        .map((f) => ({
          id: f.id,
          nom: f.nom,
          detail: `${livrable.brief_titre} · ${livrable.cible?.nom ?? livrable.deposant_nom} · Dépôt n°${livrable.numero}`,
        }))
    )
  } catch {
    erreur.value = 'Impossible de charger les sources.'
  } finally {
    chargement.value = false
  }
})

const total = computed(() => choixRessources.value.length + choixLivrables.value.length + fichiers.value.length)
const tropDeSources = computed(() => total.value > NB_SOURCES_MAX)

const ajouterFichiers = (event) => {
  erreurFichiers.value = ''
  for (const fichier of event.target.files ?? []) {
    const probleme = verifierFichier(fichier)
    if (probleme) {
      erreurFichiers.value = `${fichier.name} : ${probleme}`
      continue
    }
    fichiers.value.push(fichier)
  }
  event.target.value = ''
}

const retirerFichier = (index) => fichiers.value.splice(index, 1)

const fermer = () => {
  if (!envoi.value) emit('fermer')
}

const generer = async () => {
  if (total.value === 0) {
    erreur.value = 'Choisissez au moins une source.'
    return
  }
  if (tropDeSources.value) return

  const donnees = new FormData()
  donnees.append('module', props.module.id)
  donnees.append('type', props.type)
  if (estQuiz.value) {
    donnees.append('difficulte', props.difficulte)
    donnees.append('nb_questions', nbQuestions.value)
  }
  choixRessources.value.forEach((id) => donnees.append('ressources', id))
  choixLivrables.value.forEach((id) => donnees.append('fichiers_livrables', id))
  fichiers.value.forEach((f) => donnees.append('fichiers', f))

  envoi.value = true
  erreur.value = ''
  try {
    emit('genere', await genererSupport(props.tenantId, donnees))
  } catch (e) {
    erreur.value = messageErreur(e, 'La génération n\'a pas pu être lancée.')
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" @click.self="fermer">
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div class="border-b border-slate-100 px-6 py-4">
          <h2 class="font-['Sora'] text-base font-semibold text-gray-900">{{ titre }}</h2>
          <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">Module : {{ module.nom }}</p>
        </div>

        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="generer">
          <div class="flex flex-col gap-5 overflow-y-auto px-6 py-5">
            <InfoBanner v-if="erreur" variant="error" :message="erreur" />

            <FormField v-if="estQuiz" label="Nombre de questions" :hint="`Entre 1 et ${NB_QUESTIONS_MAX}.`">
              <input
                v-model.number="nbQuestions" type="number" min="1" :max="NB_QUESTIONS_MAX" :disabled="envoi"
                class="h-11 w-32 rounded-xl border border-slate-200 px-4 font-['Plus_Jakarta_Sans'] text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
            </FormField>

            <div class="flex items-center justify-between font-['Plus_Jakarta_Sans'] text-sm">
              <span class="font-semibold text-gray-900">Sources</span>
              <span :class="tropDeSources ? 'font-semibold text-red-600' : 'text-zinc-500'">
                {{ total }} / {{ NB_SOURCES_MAX }} fichiers
              </span>
            </div>

            <p v-if="chargement" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
              <i class="fa-solid fa-spinner fa-spin mr-2"></i>Chargement des sources…
            </p>

            <template v-else>
              <fieldset class="flex flex-col gap-2">
                <legend class="mb-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Ressources de la bibliothèque
                </legend>
                <p v-if="!ressources.length" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Aucune ressource de type fichier.</p>
                <label
                  v-for="r in ressources" :key="r.id"
                  class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm hover:bg-slate-50"
                >
                  <input v-model="choixRessources" type="checkbox" :value="r.id" :disabled="envoi" class="h-4 w-4 accent-indigo-600" />
                  <i class="fa-solid fa-file-lines text-zinc-400"></i>
                  <span class="flex-1 text-zinc-700">{{ r.titre }}</span>
                  <span class="text-xs uppercase text-zinc-400">{{ r.extension }}</span>
                </label>
              </fieldset>

              <fieldset class="flex flex-col gap-2">
                <legend class="mb-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Livrables des apprenants (briefs du module)
                </legend>
                <p v-if="!fichiersLivrables.length" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Aucun fichier déposé sur les briefs de ce module.</p>
                <label
                  v-for="f in fichiersLivrables" :key="f.id"
                  class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm hover:bg-slate-50"
                >
                  <input v-model="choixLivrables" type="checkbox" :value="f.id" :disabled="envoi" class="h-4 w-4 accent-indigo-600" />
                  <i class="fa-solid fa-inbox text-zinc-400"></i>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-zinc-700">{{ f.nom }}</span>
                    <span class="block truncate text-xs text-zinc-400">{{ f.detail }}</span>
                  </span>
                </label>
              </fieldset>

              <FormField label="Ajouter des fichiers" :error="erreurFichiers" hint="PDF, DOCX, PPTX ou TXT, 10 Mo maximum chacun.">
                <input
                  type="file" multiple :accept="ACCEPT_FICHIERS" :disabled="envoi" @change="ajouterFichiers"
                  class="block w-full font-['Plus_Jakarta_Sans'] text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <ul v-if="fichiers.length" class="mt-2 flex flex-col gap-1">
                  <li v-for="(f, i) in fichiers" :key="i" class="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-600">
                    <i class="fa-solid fa-paperclip text-zinc-400"></i>
                    <span class="flex-1 truncate">{{ f.name }} · {{ tailleLisible(f.size) }}</span>
                    <button type="button" class="text-red-500 hover:text-red-600" :disabled="envoi" aria-label="Retirer" @click="retirerFichier(i)">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </li>
                </ul>
              </FormField>

              <InfoBanner
                variant="info"
                message="Le contenu généré arrive en brouillon : vous le relisez et le corrigez avant de le publier aux apprenants."
              />
            </template>
          </div>

          <div class="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <AppButton variant="secondary" :disabled="envoi" @click="fermer">Annuler</AppButton>
            <AppButton type="submit" icon="fa-solid fa-wand-magic-sparkles" :loading="envoi" :disabled="chargement || tropDeSources || total === 0">
              Générer
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

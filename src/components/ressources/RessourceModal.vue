<script setup>
/**
 * RessourceModal — ajout (fichier ou lien) ou modification d'une ressource
 * de la bibliothèque. Utilisée par la page Ressources et par le formulaire
 * de brief (la ressource créée y est cochée aussitôt).
 *
 * Props : tenantId, ressource (null : ajout ; sinon la ressource à modifier)
 * Émet : fermer, enregistree (la ressource renvoyée par le serveur)
 */
import { computed, reactive, ref } from 'vue'
import AppButton from '../ui/AppButton.vue'
import FormField from '../ui/FormField.vue'
import TextInput from '../ui/TextInput.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { creerRessource, modifierRessource } from '../../services/activites'
import { useFormulaire } from '../../composables/useFormulaire'
import { ACCEPT_FICHIERS, chargerLimitesFichiers, tailleLisible, tailleMaxMo, verifierFichier } from '../../utils/fichiers'

const props = defineProps({
  tenantId: { type: [Number, String], required: true },
  ressource: { type: Object, default: null },
})
const emit = defineEmits(['fermer', 'enregistree'])

chargerLimitesFichiers()

const nouvelle = computed(() => !props.ressource?.id)
const enCours = ref(false)
const erreurGenerale = ref('')
const erreurFichier = ref('') // fichier refusé à la sélection (type, taille)
const r = props.ressource
const form = reactive({
  titre: r?.titre ?? '',
  source: r?.url ? 'url' : 'fichier',
  url: r?.url ?? '',
  fichier: null,
})

const { erreur, quitter, surSortie, toutVerifier, erreursDuServeur } = useFormulaire({
  titre: () => (form.titre.trim() ? '' : 'Le titre est obligatoire.'),
  url: () => (form.source === 'url' && !form.url.trim() ? 'Le lien est obligatoire.' : ''),
  fichier: () => erreurFichier.value || (form.source === 'fichier' && nouvelle.value && !form.fichier ? 'Choisissez un fichier.' : ''),
}, { valeurs: form })

const fermer = () => {
  if (!enCours.value) emit('fermer')
}

const choisirFichier = (event) => {
  const fichier = event.target.files?.[0] ?? null
  erreurFichier.value = verifierFichier(fichier)
  form.fichier = erreurFichier.value ? null : fichier
  quitter('fichier')
  // Titre proposé à partir du nom du fichier
  if (form.fichier && !form.titre.trim()) form.titre = form.fichier.name.replace(/\.[^.]+$/, '')
}

const enregistrer = async () => {
  if (!toutVerifier()) return

  // Fichier : envoi en multipart ; lien : JSON (le fichier est alors retiré)
  let payload
  if (form.source === 'fichier' && form.fichier) {
    payload = new FormData()
    payload.append('titre', form.titre.trim())
    payload.append('fichier', form.fichier)
    if (!nouvelle.value) payload.append('url', '')
  } else if (form.source === 'url') {
    payload = { titre: form.titre.trim(), url: form.url.trim(), ...(nouvelle.value ? {} : { fichier: null }) }
  } else {
    payload = { titre: form.titre.trim() }
  }

  enCours.value = true
  erreurGenerale.value = ''
  try {
    const enregistree = nouvelle.value
      ? await creerRessource(props.tenantId, payload)
      : await modifierRessource(props.tenantId, props.ressource.id, payload)
    emit('enregistree', enregistree)
  } catch (e) {
    const data = e.response?.data
    if (data?.detail) erreurGenerale.value = data.detail
    else if (data && typeof data === 'object') erreurGenerale.value = erreursDuServeur(data)
    else erreurGenerale.value = "Impossible d'enregistrer la ressource."
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" @click.self="fermer">
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div class="border-b border-slate-100 px-6 py-4">
          <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
            {{ nouvelle ? 'Ajouter une ressource' : 'Modifier la ressource' }}
          </h2>
          <p v-if="nouvelle" class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">Elle rejoint la bibliothèque de l'organisme.</p>
        </div>
        <form class="flex flex-col gap-4 px-6 py-5" novalidate @focusout="surSortie" @submit.prevent="enregistrer">
          <InfoBanner v-if="erreurGenerale" variant="error" :message="erreurGenerale" />

          <div class="flex gap-2">
            <button
              v-for="opt in [{ v: 'fichier', l: 'Fichier', i: 'fa-file-arrow-up' }, { v: 'url', l: 'Lien', i: 'fa-link' }]"
              :key="opt.v" type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium transition"
              :class="form.source === opt.v ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-zinc-600 hover:bg-slate-50'"
              @click="form.source = opt.v"
            >
              <i :class="`fa-solid ${opt.i}`"></i>{{ opt.l }}
            </button>
          </div>

          <FormField v-if="form.source === 'url'" label="Lien" required :error="erreur('url')" data-champ="url">
            <TextInput v-model="form.url" placeholder="https://" :disabled="enCours" />
          </FormField>
          <FormField
            v-else
            label="Fichier"
            :required="nouvelle"
            :error="erreur('fichier')" data-champ="fichier"
            :hint="`${!nouvelle && !form.fichier ? 'Laissez vide pour garder le fichier actuel. ' : ''}PDF, DOCX, PPTX ou TXT, ${tailleMaxMo} Mo maximum.`"
          >
            <input
              type="file" :accept="ACCEPT_FICHIERS" :disabled="enCours" @change="choisirFichier"
              class="block w-full font-['Plus_Jakarta_Sans'] text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p v-if="form.fichier" class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              {{ form.fichier.name }} · {{ tailleLisible(form.fichier.size) }}
            </p>
          </FormField>

          <FormField label="Titre" required :error="erreur('titre')" data-champ="titre">
            <TextInput v-model="form.titre" :disabled="enCours" />
          </FormField>

          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <AppButton variant="secondary" :disabled="enCours" @click="fermer">Annuler</AppButton>
            <AppButton type="submit" :loading="enCours">{{ nouvelle ? 'Ajouter' : 'Enregistrer' }}</AppButton>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

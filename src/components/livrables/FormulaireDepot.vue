<script setup>
/**
 * FormulaireDepot — nouveau dépôt sur une assignation.
 *
 * Fichiers (pdf, docx, pptx, txt, taille max réglée par le backend) et/ou liens, au moins un et au plus
 * 10 éléments, commentaire facultatif. Envoyé en une fois. Le backend refait
 * tous les contrôles (dont le contenu réel des fichiers).
 *
 * Émet : depose (dépôt créé)
 */
import { ref, computed } from 'vue'
import AppButton from '../ui/AppButton.vue'
import TextInput from '../ui/TextInput.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { deposer } from '../../services/activites'
import {
  ACCEPT_FICHIERS,
  chargerLimitesFichiers,
  tailleLisible,
  tailleMaxMo,
  verifierFichier,
} from '../../utils/fichiers'

const props = defineProps({
  assignation: { type: Number, required: true },
  enRetard:    { type: Boolean, default: false },
})
const emit = defineEmits(['depose'])

const MAX_ELEMENTS = 10

chargerLimitesFichiers()

const authStore   = useAuthStore()
const fichiers    = ref([])
const liens       = ref([])
const nouveauLien = ref('')
const commentaire = ref('')
const erreurs     = ref([])
const envoi       = ref(false)

const total = computed(() => fichiers.value.length + liens.value.length)

const ajouterFichiers = (event) => {
  erreurs.value = []
  for (const f of event.target.files ?? []) {
    const probleme = verifierFichier(f)
    if (probleme) erreurs.value.push(`${f.name} : ${probleme}`)
    else if (total.value >= MAX_ELEMENTS) erreurs.value.push(`${f.name} : ${MAX_ELEMENTS} éléments maximum.`)
    else fichiers.value.push(f)
  }
  event.target.value = ''
}

const ajouterLien = () => {
  erreurs.value = []
  const url = nouveauLien.value.trim()
  if (!url) return
  if (!/^https?:\/\/\S+$/i.test(url)) {
    erreurs.value = ['Le lien doit commencer par http:// ou https://']
    return
  }
  if (total.value >= MAX_ELEMENTS) {
    erreurs.value = [`${MAX_ELEMENTS} éléments maximum.`]
    return
  }
  liens.value.push(url)
  nouveauLien.value = ''
}

const envoyer = async () => {
  if (nouveauLien.value.trim()) ajouterLien()
  if (total.value === 0) {
    erreurs.value = ['Ajoutez au moins un fichier ou un lien.']
    return
  }
  envoi.value = true
  erreurs.value = []
  try {
    const depot = await deposer(authStore.tenantCourant?.id, {
      assignation: props.assignation,
      commentaire: commentaire.value.trim(),
      fichiers: fichiers.value,
      liens: liens.value,
    })
    fichiers.value = []
    liens.value = []
    commentaire.value = ''
    emit('depose', depot)
  } catch (e) {
    const d = e.response?.data
    const premier = (v) => (Array.isArray(v) ? v : v ? [v] : [])
    erreurs.value = [
      ...premier(d?.fichiers),
      ...premier(d?.assignation),
      ...premier(d?.non_field_errors),
      ...premier(d?.liens).map((x) => (typeof x === 'string' ? x : 'Lien invalide.')),
      ...(d?.detail ? [d.detail] : []),
    ]
    if (!erreurs.value.length) erreurs.value = ['Le dépôt a échoué. Réessayez.']
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="envoyer">
    <InfoBanner
      v-if="enRetard"
      variant="warning"
      message="La date limite est dépassée : votre dépôt sera accepté mais marqué en retard."
    />

    <!-- Fichiers -->
    <div class="flex flex-col gap-2">
      <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-zinc-700">Fichiers</label>
      <input
        type="file" multiple :accept="ACCEPT_FICHIERS" :disabled="envoi" @change="ajouterFichiers"
        class="block w-full font-['Plus_Jakarta_Sans'] text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
      />
      <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">PDF, DOCX, PPTX ou TXT, {{ tailleMaxMo }} Mo maximum par fichier.</p>
    </div>

    <!-- Liens -->
    <div class="flex flex-col gap-2">
      <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-zinc-700">Liens</label>
      <div class="flex gap-2">
        <div class="flex-1">
          <TextInput v-model="nouveauLien" placeholder="https://github.com/…" :disabled="envoi" @keydown.enter.prevent="ajouterLien" />
        </div>
        <AppButton variant="secondary" icon="fa-solid fa-plus" :disabled="envoi || !nouveauLien.trim()" @click="ajouterLien">Ajouter</AppButton>
      </div>
    </div>

    <!-- Éléments du dépôt -->
    <ul v-if="total" class="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200">
      <li v-for="(f, i) in fichiers" :key="`f${i}`" class="flex items-center gap-3 px-3 py-2">
        <i class="fa-solid fa-file-lines text-xs text-zinc-400"></i>
        <span class="flex-1 truncate font-['Plus_Jakarta_Sans'] text-sm text-gray-900">{{ f.name }}</span>
        <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ tailleLisible(f.size) }}</span>
        <button type="button" class="text-xs text-red-600 hover:underline" :disabled="envoi" @click="fichiers.splice(i, 1)">Retirer</button>
      </li>
      <li v-for="(l, i) in liens" :key="`l${i}`" class="flex items-center gap-3 px-3 py-2">
        <i class="fa-solid fa-link text-xs text-zinc-400"></i>
        <span class="flex-1 truncate font-['Plus_Jakarta_Sans'] text-sm text-gray-900">{{ l }}</span>
        <button type="button" class="text-xs text-red-600 hover:underline" :disabled="envoi" @click="liens.splice(i, 1)">Retirer</button>
      </li>
    </ul>
    <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ total }} / {{ MAX_ELEMENTS }} éléments</p>

    <div class="flex flex-col gap-2">
      <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-zinc-700">Commentaire (facultatif)</label>
      <TextInput v-model="commentaire" type="textarea" :rows="2" placeholder="Ex. : j'ai corrigé le responsive" :disabled="envoi" />
    </div>

    <ul v-if="erreurs.length" class="list-disc rounded-xl border border-red-100 bg-red-50 py-2 pl-8 pr-3 font-['Plus_Jakarta_Sans'] text-xs text-red-700">
      <li v-for="(m, i) in erreurs" :key="i">{{ m }}</li>
    </ul>

    <div class="flex items-center justify-between gap-3">
      <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
        Un dépôt ne se modifie pas : pour corriger, faites un nouveau dépôt.
      </p>
      <AppButton type="submit" icon="fa-solid fa-paper-plane" :loading="envoi" :disabled="!total">Déposer</AppButton>
    </div>
  </form>
</template>

<script setup>
/**
 * RessourcesPage — bibliothèque de ressources de l'organisme
 *
 * - Formateur, Admin Organisme : consultation et ajout (fichier ou lien).
 * - Modification / suppression : créateur de la ressource ou admin.
 * - Une ressource jointe à un brief ne peut pas être supprimée.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import DataTable from '../../components/ui/DataTable.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import VisionneuseFichier from '../../components/fichiers/VisionneuseFichier.vue'
import { useAuthStore } from '../../stores/auth'
import {
  getRessources,
  creerRessource,
  modifierRessource,
  supprimerRessource,
  telechargerRessource,
} from '../../services/activites'
import { ACCEPT_FICHIERS, verifierFichier, tailleLisible } from '../../utils/fichiers'

const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
const moi       = authStore.utilisateur?.id
const isAdmin   = computed(() => authStore.role === 'ADMINISTRATEUR')

const ressources  = ref([])
const loading     = ref(true)
const error       = ref('')
const pageSuccess = ref('')
const search      = ref('')

const columns = [
  { key: 'titre',   label: 'Ressource' },
  { key: 'type',    label: 'Type', width: '110px' },
  { key: 'date',    label: 'Ajoutée le', width: '120px' },
  { key: 'actions', label: 'Actions', width: '130px' },
]

const charger = async () => {
  ressources.value = await getRessources(tenantId)
}

onMounted(async () => {
  try {
    await charger()
  } catch {
    error.value = 'Impossible de charger les ressources.'
  } finally {
    loading.value = false
  }
})

const filtrees = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? ressources.value.filter((r) => r.titre.toLowerCase().includes(q)) : ressources.value
})

const peutGerer = (r) => isAdmin.value || r.formateur === moi

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—')

const premier = (v) => (Array.isArray(v) ? v[0] : v)

// ─── Consultation ─────────────────────────────────────────────────────────────
// Fichier : consultation dans la plateforme ; lien : nouvel onglet
const ressourceConsultee = ref(null)
const fichierRessource = computed(() =>
  ressourceConsultee.value && {
    chemin: `ressources/${ressourceConsultee.value.id}`,
    nom: `${ressourceConsultee.value.titre}.${ressourceConsultee.value.extension}`,
    extension: ressourceConsultee.value.extension,
  }
)
const ouvrir = (r) => {
  if (r.url) {
    window.open(r.url, '_blank', 'noopener')
    return
  }
  ressourceConsultee.value = r
}

// ─── Ajout / modification ─────────────────────────────────────────────────────
const edition        = ref(null) // null = fermé, {} = ajout, ressource = modification
const editionLoading = ref(false)
const editionError   = ref('')
const erreurs        = ref({})
const form = reactive({ titre: '', source: 'fichier', url: '', fichier: null })

const ouvrirAjout = () => {
  Object.assign(form, { titre: '', source: 'fichier', url: '', fichier: null })
  erreurs.value = {}
  editionError.value = ''
  edition.value = {}
}

const ouvrirModification = (r) => {
  Object.assign(form, { titre: r.titre, source: r.url ? 'url' : 'fichier', url: r.url ?? '', fichier: null })
  erreurs.value = {}
  editionError.value = ''
  edition.value = r
}

const fermer = () => {
  if (!editionLoading.value) edition.value = null
}

const choisirFichier = (event) => {
  const fichier = event.target.files?.[0] ?? null
  erreurs.value.fichier = verifierFichier(fichier)
  form.fichier = erreurs.value.fichier ? null : fichier
}

const enregistrer = async () => {
  erreurs.value = {}
  if (!form.titre.trim()) erreurs.value.titre = 'Le titre est obligatoire.'
  const nouvelle = !edition.value.id
  if (form.source === 'url' && !form.url.trim()) erreurs.value.url = 'Le lien est obligatoire.'
  if (form.source === 'fichier' && nouvelle && !form.fichier) erreurs.value.fichier = 'Choisissez un fichier.'
  if (Object.keys(erreurs.value).some((k) => erreurs.value[k])) return

  // Fichier : envoi en multipart ; lien : JSON (le fichier est alors retiré)
  let payload
  if (form.source === 'fichier' && form.fichier) {
    payload = new FormData()
    payload.append('titre', form.titre.trim())
    payload.append('fichier', form.fichier)
    if (!nouvelle) payload.append('url', '')
  } else if (form.source === 'url') {
    payload = { titre: form.titre.trim(), url: form.url.trim(), ...(nouvelle ? {} : { fichier: null }) }
  } else {
    payload = { titre: form.titre.trim() }
  }

  editionLoading.value = true
  editionError.value = ''
  try {
    if (nouvelle) {
      await creerRessource(tenantId, payload)
      pageSuccess.value = 'Ressource ajoutée.'
    } else {
      await modifierRessource(tenantId, edition.value.id, payload)
      pageSuccess.value = 'Ressource modifiée.'
    }
    await charger()
    edition.value = null
  } catch (e) {
    const data = e.response?.data
    if (data?.detail) editionError.value = data.detail
    else if (data && typeof data === 'object') {
      erreurs.value = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, premier(v)]))
      if (data.non_field_errors) editionError.value = premier(data.non_field_errors)
    } else editionError.value = "Impossible d'enregistrer la ressource."
  } finally {
    editionLoading.value = false
  }
}

// ─── Suppression ──────────────────────────────────────────────────────────────
const aSupprimer         = ref(null)
const suppressionLoading = ref(false)
const suppressionError   = ref('')

const demanderSuppression = (r) => {
  suppressionError.value = ''
  aSupprimer.value = r
}

const supprimer = async () => {
  suppressionLoading.value = true
  suppressionError.value = ''
  try {
    await supprimerRessource(tenantId, aSupprimer.value.id)
    await charger()
    pageSuccess.value = 'Ressource supprimée.'
    aSupprimer.value = null
  } catch (e) {
    suppressionError.value = e.response?.data?.detail ?? 'Impossible de supprimer cette ressource.'
  } finally {
    suppressionLoading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Ressources"
        description="Bibliothèque de l'organisme : fichiers et liens à joindre aux briefs."
      >
        <template #actions>
          <AppButton icon="fa-solid fa-plus" @click="ouvrirAjout">Ajouter une ressource</AppButton>
        </template>
      </PageHeader>

      <div class="mt-5">
        <SearchInput v-model="search" placeholder="Rechercher une ressource…" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />
      <InfoBanner v-if="pageSuccess" variant="success" :message="pageSuccess" class="mt-4" />

      <div class="mt-4">
        <DataTable :columns="columns" :rows="filtrees" :loading="loading">
          <template #cell-titre="{ row }">
            <button type="button" class="text-left" @click="ouvrir(row)">
              <span class="font-semibold text-indigo-600 hover:underline">{{ row.titre }}</span>
              <p class="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                {{ row.url ?? `Fichier ${row.extension.toUpperCase()}` }}
              </p>
            </button>
          </template>
          <template #cell-type="{ row }">
            <span class="inline-flex items-center gap-1.5 text-zinc-600">
              <i :class="row.url ? 'fa-solid fa-link' : 'fa-solid fa-file-lines'" class="text-xs text-zinc-400"></i>
              {{ row.url ? 'Lien' : 'Fichier' }}
            </span>
          </template>
          <template #cell-date="{ row }">
            <span class="text-zinc-500">{{ formatDate(row.date_creation) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div v-if="peutGerer(row)" class="flex items-center gap-1">
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-slate-100"
                      aria-label="Modifier" title="Modifier" @click="ouvrirModification(row)">
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      aria-label="Supprimer" title="Supprimer" @click="demanderSuppression(row)">
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
            </div>
            <span v-else class="text-xs text-zinc-400">—</span>
          </template>
          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-folder-open text-2xl"></i>
              <span class="text-sm">{{ search ? 'Aucun résultat.' : 'Aucune ressource pour le moment.' }}</span>
            </div>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Ajout / modification -->
    <Teleport to="body">
      <div v-if="edition" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" @click.self="fermer">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
              {{ edition.id ? 'Modifier la ressource' : 'Ajouter une ressource' }}
            </h2>
          </div>
          <form class="flex flex-col gap-4 px-6 py-5" @submit.prevent="enregistrer">
            <InfoBanner v-if="editionError" variant="error" :message="editionError" />
            <FormField label="Titre" required :error="erreurs.titre">
              <TextInput v-model="form.titre" :disabled="editionLoading" />
            </FormField>

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

            <FormField v-if="form.source === 'url'" label="Lien" required :error="erreurs.url">
              <TextInput v-model="form.url" placeholder="https://" :disabled="editionLoading" />
            </FormField>
            <FormField
              v-else
              label="Fichier"
              :required="!edition.id"
              :error="erreurs.fichier"
              :hint="edition.id && !form.fichier ? 'Laissez vide pour garder le fichier actuel. PDF, DOCX, PPTX ou TXT, 10 Mo maximum.' : 'PDF, DOCX, PPTX ou TXT, 10 Mo maximum.'"
            >
              <input
                type="file" :accept="ACCEPT_FICHIERS" :disabled="editionLoading" @change="choisirFichier"
                class="block w-full font-['Plus_Jakarta_Sans'] text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p v-if="form.fichier" class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                {{ form.fichier.name }} · {{ tailleLisible(form.fichier.size) }}
              </p>
            </FormField>

            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="editionLoading" @click="fermer">Annuler</AppButton>
              <AppButton type="submit" :loading="editionLoading">Enregistrer</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Suppression -->
    <Teleport to="body">
      <div v-if="aSupprimer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" @click.self="!suppressionLoading && (aSupprimer = null)">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Supprimer la ressource</h2>
          </div>
          <div class="flex flex-col gap-4 px-6 py-5">
            <InfoBanner v-if="suppressionError" variant="error" :message="suppressionError" />
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
              Supprimer « {{ aSupprimer.titre }} » ? Une ressource jointe à un brief ne peut pas être supprimée.
            </p>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="suppressionLoading" @click="aSupprimer = null">Annuler</AppButton>
              <AppButton variant="danger" :loading="suppressionLoading" @click="supprimer">Supprimer</AppButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <VisionneuseFichier
      :fichier="fichierRessource"
      :telecharger="() => telechargerRessource(tenantId, ressourceConsultee)"
      @fermer="ressourceConsultee = null"
    />
  </AppLayout>
</template>

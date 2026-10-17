<script setup>
/**
 * RessourcesPage — bibliothèque de ressources de l'organisme
 *
 * - Formateur, Admin Organisme : consultation et ajout (fichier ou lien).
 * - Modification / suppression : créateur de la ressource ou admin.
 * - Une ressource jointe à un brief ne peut pas être supprimée.
 */
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import RessourceModal from '../../components/ressources/RessourceModal.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import DataTable from '../../components/ui/DataTable.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import VisionneuseFichier from '../../components/fichiers/VisionneuseFichier.vue'
import { useAuthStore } from '../../stores/auth'
import {
  getRessources,
  supprimerRessource,
  telechargerRessource,
} from '../../services/activites'

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

// ─── Ajout / modification (RessourceModal) ───────────────────────────────────
const edition = ref(null) // null = fermé, {} = ajout, ressource = modification

const ouvrirAjout = () => { edition.value = {} }
const ouvrirModification = (r) => { edition.value = r }

const handleEnregistree = async () => {
  pageSuccess.value = edition.value.id ? 'Ressource modifiée.' : 'Ressource ajoutée.'
  edition.value = null
  await charger()
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
    <RessourceModal
      v-if="edition"
      :tenant-id="tenantId"
      :ressource="edition.id ? edition : null"
      @fermer="edition = null"
      @enregistree="handleEnregistree"
    />

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

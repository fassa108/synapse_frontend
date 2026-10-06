<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import DataTable from '../../components/ui/DataTable.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import SuspensionMembreModal from '../../components/membres/SuspensionMembreModal.vue'
import AjoutMembreModal from '../../components/membres/AjoutMembreModal.vue'
import MembreActions from '../../components/membres/MembreActions.vue'
import { useRenvoiInvitation } from '../../composables/useRenvoiInvitation'
import { getMembres } from '../../services/membres'

const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const formateurs = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const page = ref(1)
const PAGE_SIZE = 20

const showModal = ref(false)

const columns = [
  { key: 'nom',               label: 'Formateur' },
  { key: 'email',             label: 'Email' },
  { key: 'statut_organisme',  label: 'Accès',  width: '120px' },
  { key: 'statut_compte',     label: 'Compte',     width: '120px' },
  { key: 'actions', label: 'Actions', width: '110px' },
]

// ─── Suspension d'accès ───────────────────────────────────────────────────────
const membreCible = ref(null)

const handleMembreModifie = (membre) => {
  formateurs.value = formateurs.value.map((m) => (m.id === membre.id ? membre : m))
  membreCible.value = null
}

// ─── Invitation ───────────────────────────────────────────────────────────────
const { enCours: renvoiEnCours, retour: retourRenvoi, renvoyer } = useRenvoiInvitation(tenantId)

const charger = async () => {
  const membres = await getMembres(tenantId)
  formateurs.value = membres.filter((m) => m.role === 'FORMATEUR')
}

onMounted(async () => {
  try {
    await charger()
  } catch {
    error.value = 'Impossible de charger les formateurs.'
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  if (!search.value.trim()) return formateurs.value
  const q = search.value.toLowerCase()
  return formateurs.value.filter(
    (f) =>
      String(f.utilisateur_prenom ?? '').toLowerCase().includes(q) ||
      String(f.utilisateur_nom ?? '').toLowerCase().includes(q) ||
      String(f.utilisateur_email ?? '').toLowerCase().includes(q)
  )
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const nomFormateur = (m) =>
  m.utilisateur_prenom
    ? `${m.utilisateur_prenom} ${m.utilisateur_nom}`
    : `Formateur #${m.utilisateur}`
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Formateurs"
        description="Gérez les formateurs de votre organisme."
      >
        <template #actions>
          <AppButton variant="primary" icon="fa-solid fa-user-plus" @click="showModal = true">
            Ajouter un formateur
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-6 mb-4 flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
        <i class="fa-solid fa-chalkboard-user text-orange-400"></i>
        <span>
          <strong class="text-gray-900">{{ formateurs.length }}</strong>
          formateur{{ formateurs.length !== 1 ? 's' : '' }} dans cet organisme
        </span>
      </div>

      <div class="mb-4">
        <SearchInput v-model="search" placeholder="Rechercher un formateur…" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-4" />
      <InfoBanner v-if="retourRenvoi" :variant="retourRenvoi.variant" :message="retourRenvoi.message" class="mb-4" />

      <DataTable :columns="columns" :rows="paginated" :loading="loading">
        <template #cell-nom="{ row }">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-orange-700">
              {{ (row.utilisateur_prenom?.[0] ?? '?') + (row.utilisateur_nom?.[0] ?? '') }}
            </div>
            <p class="font-medium text-gray-900">{{ nomFormateur(row) }}</p>
          </div>
        </template>
        <template #cell-email="{ row }">
          <span class="text-zinc-600">{{ row.utilisateur_email ?? '—' }}</span>
        </template>
        <template #cell-statut_organisme="{ row }">
          <!-- MembreTenant.actif : appartenance active à l'organisme -->
          <StatusBadge :value="row.actif" type="membre" />
        </template>
        <template #cell-actions="{ row }">
          <MembreActions
            :membre="row"
            :renvoi="renvoiEnCours === row.id"
            @renvoyer="renvoyer(row)"
            @suspendre="membreCible = row"
          />
        </template>
        <template #cell-statut_compte="{ row }">
          <!-- Utilisateur.actif : compte utilisateur activé -->
          <StatusBadge :value="row.utilisateur_actif" type="compte" />
        </template>
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
            <i class="fa-solid fa-chalkboard-user text-3xl"></i>
            <span class="text-sm">{{ search ? 'Aucun résultat.' : 'Aucun formateur pour le moment.' }}</span>
          </div>
        </template>
      </DataTable>

      <div class="mt-4">
        <AppPagination v-model:page="page" :total="filtered.length" :page-size="PAGE_SIZE" />
      </div>

    </div>

    <AjoutMembreModal
      v-if="showModal"
      :tenant-id="tenantId"
      role="FORMATEUR"
      libelle="formateur"
      @fermer="showModal = false"
      @ajoute="charger"
    />

    <SuspensionMembreModal
      :membre="membreCible"
      :tenant-id="tenantId"
      libelle="formateur"
      @close="membreCible = null"
      @updated="handleMembreModifie"
    />

  </AppLayout>
</template>

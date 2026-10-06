<script setup>
/**
 * OrganismesPage — Admin SaaS
 *
 * - Indicateurs globaux de la plateforme
 * - Liste des organismes (clic → fiche)
 * - Création d'un organisme avec son premier administrateur
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import FilterSelect from '../../components/ui/FilterSelect.vue'
import DataTable from '../../components/ui/DataTable.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import OrganismeCreationModal from '../../components/organismes/OrganismeCreationModal.vue'
import { useTenants } from '../../composables/useTenants'
import { recupererIndicateursGlobaux } from '../../services/tenants'

const router = useRouter()
const { organismes, isLoading, errorMessage, chargerOrganismes } = useTenants()

const indicateurs  = ref(null)
const search       = ref('')
const filtreStatut = ref('')
const page         = ref(1)
const PAGE_SIZE    = 20

const statutOptions = [
  { value: 'true',  label: 'Actif' },
  { value: 'false', label: 'Suspendu' },
]

const columns = [
  { key: 'nom',            label: 'Organisme' },
  { key: 'code',           label: 'Code',          width: '130px' },
  { key: 'admin',          label: 'Administrateur' },
  { key: 'membres',        label: 'Membres',       width: '110px' },
  { key: 'statut',         label: 'Statut',        width: '110px' },
  { key: 'date_creation',  label: 'Créé le',       width: '120px' },
]

const chargerIndicateurs = async () => {
  try {
    indicateurs.value = await recupererIndicateursGlobaux()
  } catch {
    indicateurs.value = null
  }
}

onMounted(() => {
  chargerOrganismes()
  chargerIndicateurs()
})

const filtered = computed(() => {
  let list = organismes.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (o) =>
        o.nom.toLowerCase().includes(q) ||
        o.code?.toLowerCase().includes(q)
    )
  }
  if (filtreStatut.value !== '') {
    list = list.filter((o) => String(o.statut) === filtreStatut.value)
  }
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const kpi = (cle) => (indicateurs.value ? indicateurs.value[cle] : '—')

const nbMembres = (o) =>
  (o.indicateurs?.nb_administrateurs ?? 0) +
  (o.indicateurs?.nb_formateurs ?? 0) +
  (o.indicateurs?.nb_apprenants ?? 0)

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const goDetail = (row) => router.push(`/admin/organismes/${row.id}`)

// ─── Création ─────────────────────────────────────────────────────────────────
// Le formulaire est recréé à chaque ouverture : erreurs et champs visités repartent à zéro.
const showCreation = ref(false)
const ouvrirCreation = () => { showCreation.value = true }
const fermerCreation = () => { showCreation.value = false }

const apresCreation = (organisme) => {
  showCreation.value = false
  chargerIndicateurs()
  router.push(`/admin/organismes/${organisme.id}`)
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Organismes"
        description="Gérez les organismes enregistrés sur la plateforme."
      >
        <template #actions>
          <AppButton icon="fa-solid fa-plus" @click="ouvrirCreation">
            Nouvel organisme
          </AppButton>
        </template>
      </PageHeader>

      <!-- Indicateurs globaux -->
      <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Organismes"
          :value="kpi('nb_organismes')"
          icon="fa-solid fa-building"
          icon-background="bg-slate-100"
          icon-color="text-slate-600"
        />
        <StatCard
          label="Actifs"
          :value="kpi('nb_organismes_actifs')"
          icon="fa-solid fa-circle-check"
          icon-background="bg-emerald-50"
          icon-color="text-emerald-700"
        />
        <StatCard
          label="Suspendus"
          :value="kpi('nb_organismes_suspendus')"
          icon="fa-solid fa-pause"
          icon-background="bg-amber-50"
          icon-color="text-amber-600"
        />
        <StatCard
          label="Utilisateurs"
          :value="kpi('nb_utilisateurs')"
          icon="fa-solid fa-users"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-600"
        />
        <StatCard
          label="Formations"
          :value="kpi('nb_formations')"
          icon="fa-solid fa-book-open"
          icon-background="bg-sky-50"
          icon-color="text-sky-600"
        />
        <StatCard
          label="Promotions"
          :value="kpi('nb_promotions')"
          icon="fa-solid fa-user-graduate"
          icon-background="bg-violet-50"
          icon-color="text-violet-600"
        />
      </div>

      <!-- Filtres -->
      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-48">
          <SearchInput v-model="search" placeholder="Rechercher un organisme…" />
        </div>
        <FilterSelect
          v-model="filtreStatut"
          :options="statutOptions"
          placeholder="Tous les statuts"
        />
      </div>

      <InfoBanner v-if="errorMessage" variant="error" :message="errorMessage" class="mt-4" />

      <div class="mt-4">
        <DataTable
          :columns="columns"
          :rows="paginated"
          :loading="isLoading"
          @row-click="goDetail"
        >
          <template #cell-nom="{ row }">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-slate-600">
                {{ row.nom?.[0]?.toUpperCase() }}
              </div>
              <div>
                <span class="font-semibold text-gray-900">{{ row.nom }}</span>
                <p v-if="row.adresse" class="mt-0.5 line-clamp-1 text-xs text-zinc-400">{{ row.adresse }}</p>
              </div>
            </div>
          </template>

          <template #cell-code="{ row }">
            <span class="font-mono text-xs text-zinc-500">{{ row.code }}</span>
          </template>

          <template #cell-admin="{ row }">
            <span v-if="row.administrateurs?.length" class="text-zinc-600">
              {{ row.administrateurs[0].email }}
              <span v-if="row.administrateurs.length > 1" class="text-zinc-400">
                (+{{ row.administrateurs.length - 1 }})
              </span>
            </span>
            <span v-else class="text-zinc-400">—</span>
          </template>

          <template #cell-membres="{ row }">
            <span class="font-medium text-zinc-700">{{ nbMembres(row) }}</span>
          </template>

          <template #cell-statut="{ row }">
            <StatusBadge :value="row.statut" type="organisme" />
          </template>

          <template #cell-date_creation="{ row }">
            <span class="text-zinc-500">{{ formatDate(row.date_creation) }}</span>
          </template>

          <template #empty>
            <div class="flex flex-col items-center gap-2 py-8 text-zinc-400">
              <i class="fa-solid fa-building text-2xl"></i>
              <span class="font-['Plus_Jakarta_Sans'] text-sm">
                {{ search || filtreStatut ? 'Aucun résultat.' : 'Aucun organisme enregistré.' }}
              </span>
            </div>
          </template>
        </DataTable>
      </div>

      <div class="mt-4">
        <AppPagination
          v-model:page="page"
          :total="filtered.length"
          :page-size="PAGE_SIZE"
        />
      </div>

      <OrganismeCreationModal v-if="showCreation" @fermer="fermerCreation" @cree="apresCreation" />

    </div>
  </AppLayout>
</template>

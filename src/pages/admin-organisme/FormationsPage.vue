<script setup>
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
import { useAuthStore } from '../../stores/auth'
import { getFormations, getPromotions } from '../../services/pedagogie'

const router   = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
// Formateur : lecture seule (formations de ses promotions)
const isAdmin = computed(() => authStore.role === 'ADMINISTRATEUR')

const formations   = ref([])
const promotions   = ref([])
const loading      = ref(true)
const error        = ref('')
const search       = ref('')
const filtreStatut = ref('')
const page         = ref(1)
const PAGE_SIZE    = 15

const filtreOptions = [
  { value: 'true',  label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

// Nombre de promotions par formation
const promoCountByFormation = computed(() => {
  const map = {}
  promotions.value.forEach((p) => {
    map[p.formation] = (map[p.formation] ?? 0) + 1
  })
  return map
})

const columns = [
  { key: 'nom',           label: 'Formation' },
  { key: 'nb_promotions', label: 'Promotions', width: '120px' },
  { key: 'actif',         label: 'Statut',     width: '110px' },
  { key: 'date_creation', label: 'Créée le',   width: '120px' },
]

onMounted(async () => {
  try {
    const [forms, proms] = await Promise.all([
      getFormations(tenantId),
      getPromotions(tenantId),
    ])
    formations.value = forms
    promotions.value = proms
  } catch {
    error.value = 'Impossible de charger les formations.'
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  let list = formations.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((f) => f.nom.toLowerCase().includes(q))
  }
  if (filtreStatut.value !== '') {
    list = list.filter((f) => f.actif === (filtreStatut.value === 'true'))
  }
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const statsFormations = computed(() => ({
  total:    formations.value.length,
  actives:  formations.value.filter((f) => f.actif).length,
}))

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const goDetail = (row) => router.push(`/formations/${row.id}`)
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Formations"
        :description="isAdmin ? 'Gérez les formations de votre organisme.' : 'Formations de vos promotions.'"
      >
        <template #actions>
          <AppButton
            v-if="isAdmin"
            variant="primary"
            icon="fa-solid fa-plus"
            @click="router.push('/formations/creer')"
          >
            Nouvelle formation
          </AppButton>
        </template>
      </PageHeader>

      <!-- KPI compacts -->
      <div class="mt-5 grid grid-cols-2 gap-3">
        <StatCard
          label="Total"
          :value="loading ? '—' : statsFormations.total"
          icon="fa-solid fa-book-open"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-600"
        />
        <StatCard
          label="Actives"
          :value="loading ? '—' : statsFormations.actives"
          icon="fa-solid fa-circle-check"
          icon-background="bg-emerald-50"
          icon-color="text-emerald-700"
        />
      </div>

      <!-- Filtres -->
      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-48">
          <SearchInput v-model="search" placeholder="Rechercher…" />
        </div>
        <FilterSelect v-model="filtreStatut" :options="filtreOptions" placeholder="Tous les statuts" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />

      <!-- Table -->
      <div class="mt-4">
        <DataTable
          :columns="columns"
          :rows="paginated"
          :loading="loading"
          @row-click="goDetail"
        >
          <template #cell-nom="{ row }">
            <div>
              <span class="font-semibold text-gray-900">{{ row.nom }}</span>
              <p v-if="row.description" class="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                {{ row.description }}
              </p>
            </div>
          </template>

          <template #cell-nb_promotions="{ row }">
            <span class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-zinc-700">
              {{ promoCountByFormation[row.id] ?? 0 }}
            </span>
          </template>

          <template #cell-actif="{ row }">
            <StatusBadge :value="row.actif" type="boolean" />
          </template>

          <template #cell-date_creation="{ row }">
            <span class="text-zinc-500">{{ formatDate(row.date_creation) }}</span>
          </template>

          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-book-open text-2xl"></i>
              <span class="font-['Plus_Jakarta_Sans'] text-sm">
                {{ search || filtreStatut ? 'Aucun résultat.' : 'Aucune formation pour le moment.' }}
              </span>
              <AppButton
                v-if="isAdmin && !search && !filtreStatut"
                variant="secondary"
                icon="fa-solid fa-plus"
                @click="router.push('/formations/creer')"
              >
                Créer la première formation
              </AppButton>
            </div>
          </template>
        </DataTable>
      </div>

      <div class="mt-4">
        <AppPagination v-model:page="page" :total="filtered.length" :page-size="PAGE_SIZE" />
      </div>

    </div>
  </AppLayout>
</template>

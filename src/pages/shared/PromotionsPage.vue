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
import { getPromotions, getFormations, getInscriptions } from '../../services/pedagogie'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
const isAdmin   = computed(() => authStore.role === 'ADMINISTRATEUR')

const promotions      = ref([])
const formations      = ref([])
const inscriptionMap  = ref({}) // promotionId → count actif
const loading         = ref(true)
const error           = ref('')
const search          = ref('')
const filtreFormation = ref('')
const filtreStatut    = ref('')
const page            = ref(1)
const PAGE_SIZE       = 15

const columns = [
  { key: 'nom',        label: 'Promotion' },
  { key: 'formation',  label: 'Formation' },
  { key: 'actif',      label: 'Statut',    width: '110px' },
  { key: 'apprenants', label: 'Apprenants', width: '110px' },
]

onMounted(async () => {
  try {
    const [proms, forms] = await Promise.all([
      getPromotions(tenantId),
      getFormations(tenantId),
    ])
    promotions.value = proms
    formations.value = forms

    // Charger le nombre d'inscrits actifs pour chaque promotion
    const counts = await Promise.all(
      proms.map(async (p) => {
        try {
          const ins = await getInscriptions(tenantId, p.id, { actif: 'true' })
          return [p.id, ins.length]
        } catch {
          return [p.id, 0]
        }
      })
    )
    inscriptionMap.value = Object.fromEntries(counts)
  } catch {
    error.value = 'Impossible de charger les promotions.'
  } finally {
    loading.value = false
  }
})

const formationOptions = computed(() =>
  formations.value.map((f) => ({ value: String(f.id), label: f.nom }))
)

const statutOptions = [
  { value: 'true',  label: 'Ouverte' },
  { value: 'false', label: 'Clôturée' },
]

const filtered = computed(() => {
  let list = promotions.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((p) => p.nom.toLowerCase().includes(q))
  }
  if (filtreFormation.value) {
    list = list.filter((p) => String(p.formation) === filtreFormation.value)
  }
  if (filtreStatut.value !== '') {
    list = list.filter((p) => p.actif === (filtreStatut.value === 'true'))
  }
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const statsPromotions = computed(() => ({
  total:   promotions.value.length,
  actives: promotions.value.filter((p) => p.actif).length,
}))

const nomFormation = (id) =>
  formations.value.find((f) => f.id === id)?.nom ?? '—'

const goDetail = (row) => router.push(`/promotions/${row.id}`)
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Promotions"
        description="Promotions associées aux formations."
      >
        <template #actions>
          <AppButton
            v-if="isAdmin"
            variant="primary"
            icon="fa-solid fa-plus"
            @click="router.push('/promotions/creer')"
          >
            Nouvelle promotion
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <StatCard
          label="Total"
          :value="loading ? '—' : statsPromotions.total"
          icon="fa-solid fa-users"
          icon-background="bg-violet-50"
          icon-color="text-violet-600"
        />
        <StatCard
          label="Ouvertes"
          :value="loading ? '—' : statsPromotions.actives"
          icon="fa-solid fa-circle-check"
          icon-background="bg-emerald-50"
          icon-color="text-emerald-700"
        />
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-48">
          <SearchInput v-model="search" placeholder="Rechercher une promotion…" />
        </div>
        <FilterSelect v-model="filtreFormation" :options="formationOptions" placeholder="Toutes les formations" />
        <FilterSelect v-model="filtreStatut"    :options="statutOptions"    placeholder="Tous les statuts" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />

      <div class="mt-4">
        <DataTable :columns="columns" :rows="paginated" :loading="loading" @row-click="goDetail">

          <template #cell-nom="{ row }">
            <span class="font-semibold text-gray-900">{{ row.nom }}</span>
          </template>

          <template #cell-formation="{ row }">
            <span class="text-zinc-600">{{ nomFormation(row.formation) }}</span>
          </template>

          <template #cell-actif="{ row }">
            <StatusBadge :value="row.actif" type="promotion" />
          </template>

          <template #cell-apprenants="{ row }">
            <span class="font-medium text-zinc-700">
              {{ inscriptionMap[row.id] ?? '—' }}
            </span>
          </template>

          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-users text-2xl"></i>
              <span class="text-sm">
                {{ search || filtreFormation || filtreStatut ? 'Aucun résultat.' : 'Aucune promotion.' }}
              </span>
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

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
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getModules, getFormations, getCompetences } from '../../services/pedagogie'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const modules         = ref([])
const formations      = ref([])
const competenceMap   = ref({}) // moduleId → count
const loading         = ref(true)
const error           = ref('')
const search          = ref('')
const filtreFormation = ref('')
const page            = ref(1)
const PAGE_SIZE       = 20

// Sans colonne Statut, sans colonne Actions autonomes
const columns = [
  { key: 'ordre',       label: '#',           width: '56px' },
  { key: 'nom',         label: 'Module' },
  { key: 'formation',   label: 'Formation' },
  { key: 'competences', label: 'Compétences', width: '120px' },
]

onMounted(async () => {
  try {
    const [mods, forms, comps] = await Promise.all([
      getModules(tenantId),
      getFormations(tenantId),
      getCompetences(tenantId),
    ])
    modules.value    = mods
    formations.value = forms

    // Agréger le count de compétences par module
    const map = {}
    comps.forEach((c) => {
      map[c.module] = (map[c.module] ?? 0) + 1
    })
    competenceMap.value = map
  } catch {
    error.value = 'Impossible de charger les modules.'
  } finally {
    loading.value = false
  }
})

const formationOptions = computed(() =>
  formations.value.map((f) => ({ value: String(f.id), label: f.nom }))
)

const filtered = computed(() => {
  let list = modules.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((m) => m.nom.toLowerCase().includes(q))
  }
  if (filtreFormation.value) {
    list = list.filter((m) => String(m.formation) === filtreFormation.value)
  }
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const nomFormation = (id) =>
  formations.value.find((f) => f.id === id)?.nom ?? '—'

const goDetail = (row) => router.push(`/modules/${row.id}`)
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Modules"
        description="Modules de vos formations."
      >
        <template #actions>
          <AppButton variant="primary" icon="fa-solid fa-plus" @click="router.push('/modules/creer')">
            Nouveau module
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-48">
          <SearchInput v-model="search" placeholder="Rechercher un module…" />
        </div>
        <FilterSelect v-model="filtreFormation" :options="formationOptions" placeholder="Toutes les formations" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />

      <div class="mt-4">
        <DataTable :columns="columns" :rows="paginated" :loading="loading" @row-click="goDetail">

          <template #cell-ordre="{ row }">
            <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-bold text-zinc-500">
              {{ row.ordre }}
            </span>
          </template>

          <template #cell-nom="{ row }">
            <div>
              <span class="font-semibold text-gray-900">{{ row.nom }}</span>
              <p v-if="row.description" class="mt-0.5 line-clamp-1 text-xs text-zinc-400">{{ row.description }}</p>
            </div>
          </template>

          <template #cell-formation="{ row }">
            <span class="text-zinc-600">{{ nomFormation(row.formation) }}</span>
          </template>

          <template #cell-competences="{ row }">
            <span class="font-medium text-zinc-700">
              {{ competenceMap[row.id] ?? 0 }}
            </span>
          </template>

          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-layer-group text-2xl"></i>
              <span class="text-sm">
                {{ search || filtreFormation ? 'Aucun résultat.' : 'Aucun module pour le moment.' }}
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

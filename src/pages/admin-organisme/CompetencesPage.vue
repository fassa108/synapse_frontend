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
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getCompetences, getModules, getFormations } from '../../services/pedagogie'

const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const competences = ref([])
const modules = ref([])
const formations = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const filtreModule = ref('')
const page = ref(1)
const PAGE_SIZE = 20

const columns = [
  { key: 'ordre',    label: '#',         width: '60px' },
  { key: 'nom',      label: 'Compétence' },
  { key: 'module',   label: 'Module' },
  { key: 'actif',    label: 'Statut',    width: '110px' },
  { key: '_actions', label: '',          width: '60px' },
]

onMounted(async () => {
  try {
    const [comps, mods, forms] = await Promise.all([
      getCompetences(tenantId),
      getModules(tenantId),
      getFormations(tenantId),
    ])
    competences.value = comps
    modules.value = mods
    formations.value = forms
  } catch {
    error.value = 'Impossible de charger les compétences.'
  } finally {
    loading.value = false
  }
})

const moduleOptions = computed(() =>
  modules.value.map((m) => ({ value: String(m.id), label: m.nom }))
)

const filtered = computed(() => {
  let list = competences.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((c) => c.nom.toLowerCase().includes(q))
  }
  if (filtreModule.value) {
    list = list.filter((c) => String(c.module) === filtreModule.value)
  }
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const nomModule = (moduleId) =>
  modules.value.find((m) => m.id === moduleId)?.nom ?? '—'
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Compétences"
        description="Compétences définies par module."
      >
        <template #actions>
          <AppButton
            variant="primary"
            icon="fa-solid fa-plus"
            @click="router.push('/competences/creer')"
          >
            Nouvelle compétence
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-48">
          <SearchInput v-model="search" placeholder="Rechercher une compétence…" />
        </div>
        <FilterSelect v-model="filtreModule" :options="moduleOptions" placeholder="Tous les modules" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />

      <div class="mt-4">
        <DataTable :columns="columns" :rows="paginated" :loading="loading">
          <template #cell-ordre="{ row }">
            <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 font-mono text-xs font-bold text-indigo-600">
              {{ row.ordre }}
            </span>
          </template>

          <template #cell-nom="{ row }">
            <span class="font-semibold text-gray-900">{{ row.nom }}</span>
            <p v-if="row.description" class="mt-0.5 line-clamp-1 text-xs text-zinc-400">
              {{ row.description }}
            </p>
          </template>

          <template #cell-module="{ row }">
            <span class="text-zinc-600">{{ nomModule(row.module) }}</span>
          </template>

          <template #cell-actif="{ row }">
            <StatusBadge :value="row.actif" type="boolean" />
          </template>

          <template #cell-_actions="{ row }">
            <span class="text-xs text-zinc-400">#{{ row.id }}</span>
          </template>

          <template #empty>
            <div class="flex flex-col items-center gap-2 py-4 text-zinc-400">
              <i class="fa-solid fa-bullseye text-3xl"></i>
              <span class="font-['Plus_Jakarta_Sans'] text-sm">
                {{ search || filtreModule ? 'Aucun résultat.' : 'Aucune compétence pour le moment.' }}
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

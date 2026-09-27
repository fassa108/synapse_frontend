<script setup>
/**
 * GroupesPage
 *
 * - Formateur : groupes de ses promotions ; création dans une promotion ouverte.
 * - Admin Organisme : consultation de tous les groupes (les groupes sont
 *   gérés par les formateurs).
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
import InfoBanner from '../../components/ui/InfoBanner.vue'
import CreerGroupeModal from '../../components/groupes/CreerGroupeModal.vue'
import { useAuthStore } from '../../stores/auth'
import { getGroupes, getPromotions } from '../../services/pedagogie'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
const estFormateur = computed(() => authStore.role === 'FORMATEUR')

const groupes         = ref([])
const promotions      = ref([])
const loading         = ref(true)
const error           = ref('')
const search          = ref('')
const filtrePromotion = ref('')
const page            = ref(1)
const PAGE_SIZE       = 20

const columns = [
  { key: 'nom',        label: 'Groupe' },
  { key: 'promotion',  label: 'Promotion' },
  { key: 'nb_membres', label: 'Membres', width: '120px' },
]

const charger = async () => {
  const [grps, proms] = await Promise.all([
    getGroupes(tenantId),
    getPromotions(tenantId),
  ])
  groupes.value    = grps
  promotions.value = proms
}

onMounted(async () => {
  try {
    await charger()
  } catch {
    error.value = 'Impossible de charger les groupes.'
  } finally {
    loading.value = false
  }
})

const promotionOptions = computed(() =>
  promotions.value.map((p) => ({ value: String(p.id), label: p.nom }))
)

// Création : uniquement dans une promotion ouverte
const promotionsOuvertes = computed(() => promotions.value.filter((p) => p.actif))

const filtered = computed(() => {
  let list = groupes.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((g) => g.nom.toLowerCase().includes(q))
  }
  if (filtrePromotion.value) {
    list = list.filter((g) => String(g.promotion) === filtrePromotion.value)
  }
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const nomPromotion = (id) =>
  promotions.value.find((p) => p.id === id)?.nom ?? '—'

const goDetail = (row) => router.push(`/groupes/${row.id}`)

// ─── Création (Formateur) ─────────────────────────────────────────────────────
const showCreation = ref(false)

const handleCree = (groupe) => {
  showCreation.value = false
  router.push(`/groupes/${groupe.id}`)
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Groupes"
        :description="estFormateur
          ? 'Groupes de vos promotions.'
          : 'Groupes constitués par les formateurs dans vos promotions.'"
      >
        <template v-if="estFormateur" #actions>
          <AppButton
            icon="fa-solid fa-plus"
            :disabled="promotionsOuvertes.length === 0"
            @click="showCreation = true"
          >
            Nouveau groupe
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-48">
          <SearchInput v-model="search" placeholder="Rechercher un groupe…" />
        </div>
        <FilterSelect v-model="filtrePromotion" :options="promotionOptions" placeholder="Toutes les promotions" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />

      <div class="mt-4">
        <DataTable :columns="columns" :rows="paginated" :loading="loading" @row-click="goDetail">

          <template #cell-nom="{ row }">
            <div>
              <span class="font-semibold text-gray-900">{{ row.nom }}</span>
              <p v-if="row.description" class="mt-0.5 line-clamp-1 text-xs text-zinc-400">{{ row.description }}</p>
            </div>
          </template>

          <template #cell-promotion="{ row }">
            <span class="text-zinc-600">{{ nomPromotion(row.promotion) }}</span>
          </template>

          <template #cell-nb_membres="{ row }">
            <span class="font-medium text-zinc-700">
              {{ row.nb_membres }}
              <span class="font-normal text-zinc-400">membre{{ row.nb_membres !== 1 ? 's' : '' }}</span>
            </span>
          </template>

          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-user-group text-2xl"></i>
              <span class="text-sm">
                {{ search || filtrePromotion ? 'Aucun résultat.' : 'Aucun groupe pour le moment.' }}
              </span>
              <p v-if="!estFormateur" class="text-xs">Les groupes sont créés par les formateurs.</p>
            </div>
          </template>
        </DataTable>
      </div>

      <div class="mt-4">
        <AppPagination v-model:page="page" :total="filtered.length" :page-size="PAGE_SIZE" />
      </div>

    </div>

    <CreerGroupeModal
      :ouvert="showCreation"
      :tenant-id="tenantId"
      :promotions="promotionsOuvertes"
      @close="showCreation = false"
      @created="handleCree"
    />
  </AppLayout>
</template>

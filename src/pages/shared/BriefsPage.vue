<script setup>
/**
 * BriefsPage
 *
 * - Formateur : briefs de ses promotions ; création.
 * - Admin Organisme : consultation de tous les briefs de l'organisme.
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
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getBriefs, getCategories } from '../../services/activites'
import { getPromotions, getModules } from '../../services/pedagogie'

const router       = useRouter()
const authStore    = useAuthStore()
const tenantId     = authStore.tenantCourant?.id
const estFormateur = computed(() => authStore.role === 'FORMATEUR')

const briefs     = ref([])
const promotions = ref([])
const modules    = ref([])
const categories = ref([])
const filtreCategorie = ref('')
const loading    = ref(true)
const error      = ref('')
const search          = ref('')
const filtrePromotion = ref('')
const filtreStatut    = ref('')
const page      = ref(1)
const PAGE_SIZE = 20

const columns = [
  { key: 'titre',       label: 'Brief' },
  { key: 'promotion',   label: 'Promotion' },
  { key: 'module',      label: 'Module' },
  { key: 'categorie',   label: 'Catégorie', width: '130px' },
  { key: 'date_limite', label: 'Date limite', width: '130px' },
  { key: 'statut',      label: 'Statut', width: '110px' },
]

const statutOptions = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'PUBLIE',    label: 'Publié' },
  { value: 'ARCHIVE',   label: 'Archivé' },
]

onMounted(async () => {
  try {
    const [b, p, m, c] = await Promise.all([
      getBriefs(tenantId),
      getPromotions(tenantId),
      getModules(tenantId),
      getCategories(tenantId),
    ])
    categories.value = c
    briefs.value = b
    promotions.value = p
    modules.value = m
  } catch {
    error.value = 'Impossible de charger les briefs.'
  } finally {
    loading.value = false
  }
})

const promotionOptions = computed(() =>
  promotions.value.map((p) => ({ value: String(p.id), label: p.nom }))
)

const categorieOptions = computed(() =>
  categories.value.map((c) => ({ value: String(c.id), label: c.nom }))
)
const nomCategorie = (id) => categories.value.find((c) => c.id === id)?.nom

const filtres = computed(() => {
  let list = briefs.value
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((b) => b.titre.toLowerCase().includes(q))
  if (filtrePromotion.value) list = list.filter((b) => String(b.promotion) === filtrePromotion.value)
  if (filtreStatut.value) list = list.filter((b) => b.statut === filtreStatut.value)
  if (filtreCategorie.value) list = list.filter((b) => String(b.categorie) === filtreCategorie.value)
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtres.value.slice(start, start + PAGE_SIZE)
})

const nomPromotion = (id) => promotions.value.find((p) => p.id === id)?.nom ?? '—'
const nomModule    = (id) => modules.value.find((m) => m.id === id)?.nom ?? '—'

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const depasse = (iso) => iso && new Date(iso) < new Date()
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Briefs"
        :description="estFormateur ? 'Activités proposées à vos promotions.' : 'Activités proposées dans l’organisme (consultation).'"
      >
        <template v-if="estFormateur" #actions>
          <AppButton icon="fa-solid fa-plus" @click="router.push('/briefs/creer')">Nouveau brief</AppButton>
        </template>
      </PageHeader>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="min-w-48 flex-1">
          <SearchInput v-model="search" placeholder="Rechercher un brief…" />
        </div>
        <FilterSelect v-model="filtrePromotion" :options="promotionOptions" placeholder="Toutes les promotions" />
        <FilterSelect v-if="categorieOptions.length" v-model="filtreCategorie" :options="categorieOptions" placeholder="Toutes les catégories" />
        <FilterSelect v-model="filtreStatut" :options="statutOptions" placeholder="Tous les statuts" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />

      <div class="mt-4">
        <DataTable :columns="columns" :rows="paginated" :loading="loading" @row-click="(row) => router.push(`/briefs/${row.id}`)">
          <template #cell-titre="{ row }">
            <span class="font-semibold text-gray-900">{{ row.titre }}</span>
            <p v-if="row.cree_par_nom" class="mt-0.5 text-xs text-zinc-400">par {{ row.cree_par_nom }}</p>
          </template>
          <template #cell-promotion="{ row }">
            <span class="text-zinc-600">{{ nomPromotion(row.promotion) }}</span>
          </template>
          <template #cell-module="{ row }">
            <span class="text-zinc-600">{{ nomModule(row.module) }}</span>
          </template>
          <template #cell-categorie="{ row }">
            <span v-if="row.categorie" class="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
              {{ nomCategorie(row.categorie) }}
            </span>
            <span v-else class="text-zinc-400">—</span>
          </template>
          <template #cell-date_limite="{ row }">
            <span :class="row.statut === 'PUBLIE' && depasse(row.date_limite) ? 'font-medium text-red-500' : 'text-zinc-500'">
              {{ formatDate(row.date_limite) }}
            </span>
          </template>
          <template #cell-statut="{ row }">
            <StatusBadge :value="row.statut" type="brief" />
          </template>
          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-clipboard text-2xl"></i>
              <span class="text-sm">{{ search || filtrePromotion || filtreStatut || filtreCategorie ? 'Aucun résultat.' : 'Aucun brief pour le moment.' }}</span>
            </div>
          </template>
        </DataTable>
      </div>

      <div class="mt-4">
        <AppPagination v-model:page="page" :total="filtres.length" :page-size="PAGE_SIZE" />
      </div>
    </div>
  </AppLayout>
</template>

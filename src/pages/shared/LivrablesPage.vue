<script setup>
/**
 * LivrablesPage — Formateur / Admin organisme : tous les dépôts visibles
 * (formateur : ses promotions ; admin : tout l'organisme, en lecture).
 *
 * Une ligne par dépôt (par défaut, le dernier de chaque apprenant / groupe) ;
 * « Consulter » ouvre un panneau avec le contenu du dépôt et l'historique.
 *
 * Filtres : brief (aussi via ?brief=<id>), promotion, recherche sur
 * l'apprenant ou le groupe, dernier dépôt seulement.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import FilterSelect from '../../components/ui/FilterSelect.vue'
import DataTable from '../../components/ui/DataTable.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import AppButton from '../../components/ui/AppButton.vue'
import DepotCarte from '../../components/livrables/DepotCarte.vue'
import { useAuthStore } from '../../stores/auth'
import { getLivrables, getBriefs } from '../../services/activites'
import { getPromotions } from '../../services/pedagogie'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const livrables  = ref([])
const briefs     = ref([])
const promotions = ref([])
const loading    = ref(true)
const error      = ref('')

const search          = ref('')
const filtreBrief     = ref(route.query.brief ? String(route.query.brief) : '')
const filtrePromotion = ref('')
const derniersSeuls   = ref(true)
const page      = ref(1)
const PAGE_SIZE = 20

const columns = [
  { key: 'cible',   label: 'Apprenant / groupe' },
  { key: 'brief',   label: 'Brief' },
  { key: 'date',    label: 'Déposé le', width: '190px' },
  { key: 'contenu', label: 'Contenu', width: '200px' },
  { key: 'actions', label: '', width: '130px' },
]

onMounted(async () => {
  try {
    const [l, b, p] = await Promise.all([getLivrables(tenantId), getBriefs(tenantId), getPromotions(tenantId)])
    livrables.value = l
    briefs.value = b
    promotions.value = p
  } catch {
    error.value = 'Impossible de charger les livrables.'
  } finally {
    loading.value = false
  }
})

// Le filtre brief est reflété dans l'URL (lien depuis la fiche d'un brief)
watch(filtreBrief, (v) => {
  router.replace({ query: { ...route.query, brief: v || undefined } })
})
watch([search, filtreBrief, filtrePromotion, derniersSeuls], () => { page.value = 1 })

const briefParId = computed(() => new Map(briefs.value.map((b) => [b.id, b])))
const nomPromotion = (id) => promotions.value.find((p) => p.id === id)?.nom ?? ''

const promotionOptions = computed(() =>
  promotions.value.map((p) => ({ value: String(p.id), label: p.nom }))
)

// Briefs proposés : ceux de la promotion choisie, hors brouillons (sans dépôt possible)
const briefOptions = computed(() =>
  briefs.value
    .filter((b) => b.statut !== 'BROUILLON')
    .filter((b) => !filtrePromotion.value || String(b.promotion) === filtrePromotion.value)
    .map((b) => ({
      value: String(b.id),
      label: filtrePromotion.value ? b.titre : `${b.titre} · ${nomPromotion(b.promotion)}`,
    }))
)

// Changer de promotion efface un brief qui n'en fait pas partie
watch(filtrePromotion, () => {
  if (filtreBrief.value && !briefOptions.value.some((o) => o.value === filtreBrief.value)) filtreBrief.value = ''
})

const filtres = computed(() => {
  let list = livrables.value // du plus récent au plus ancien
  if (filtreBrief.value) list = list.filter((l) => String(l.brief) === filtreBrief.value)
  if (filtrePromotion.value) {
    list = list.filter((l) => String(briefParId.value.get(l.brief)?.promotion) === filtrePromotion.value)
  }
  if (derniersSeuls.value) {
    const vues = new Set()
    list = list.filter((l) => !vues.has(l.assignation) && vues.add(l.assignation))
  }
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter((l) =>
      `${l.cible?.nom ?? ''} ${l.deposant_nom ?? ''}`.toLowerCase().includes(q)
    )
  }
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtres.value.slice(start, start + PAGE_SIZE)
})

const formatDate = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

// Dépôts de chaque assignation, du plus récent au plus ancien
const parAssignation = computed(() => {
  const m = new Map()
  for (const l of livrables.value) {
    if (!m.has(l.assignation)) m.set(l.assignation, [])
    m.get(l.assignation).push(l)
  }
  return m
})
const nbDepots = (l) => parAssignation.value.get(l.assignation)?.length ?? 1

const nomCible = (l) => (l.cible?.type === 'groupe' ? `Groupe ${l.cible.nom}` : l.cible?.nom ?? l.deposant_nom)
const initiales = (nom) =>
  (nom ?? '').replace(/^Groupe /, '').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('')

const resumeContenu = (l) => {
  const fichiers = l.fichiers.filter((f) => f.type === 'fichier').length
  const liens = l.fichiers.length - fichiers
  return [
    fichiers && `${fichiers} fichier${fichiers > 1 ? 's' : ''}`,
    liens && `${liens} lien${liens > 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ')
}

// ─── Panneau de consultation ──────────────────────────────────────────────────
const selection = ref(null) // dépôt sur lequel on a cliqué
const historique = computed(() => (selection.value ? parAssignation.value.get(selection.value.assignation) ?? [] : []))
const briefSelection = computed(() => selection.value && briefParId.value.get(selection.value.brief))
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        titre="Livrables"
        :description="authStore.role === 'FORMATEUR' ? 'Les dépôts de vos promotions.' : 'Les dépôts de l’organisme (consultation).'"
      />

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="min-w-48 flex-1">
          <SearchInput v-model="search" placeholder="Rechercher un apprenant ou un groupe…" />
        </div>
        <FilterSelect v-model="filtrePromotion" :options="promotionOptions" placeholder="Toutes les promotions" />
        <FilterSelect v-model="filtreBrief" :options="briefOptions" placeholder="Tous les briefs" />
        <label class="flex cursor-pointer items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">
          <input v-model="derniersSeuls" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
          Dernier dépôt seulement
        </label>
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />

      <p v-if="!loading && filtres.length" class="mt-4 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
        {{ filtres.length }} {{ derniersSeuls ? 'rendu' : 'dépôt' }}{{ filtres.length > 1 ? 's' : '' }}
      </p>

      <div class="mt-2">
        <DataTable :columns="columns" :rows="paginated" :loading="loading" @row-click="(row) => (selection = row)">
          <template #cell-cible="{ row }">
            <div class="flex items-center gap-3">
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                :class="row.cible?.type === 'groupe' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'"
              >
                <i v-if="row.cible?.type === 'groupe'" class="fa-solid fa-user-group text-[11px]"></i>
                <template v-else>{{ initiales(nomCible(row)) }}</template>
              </span>
              <div class="min-w-0">
                <p class="truncate font-semibold text-gray-900">{{ nomCible(row) }}</p>
                <p v-if="row.cible?.type === 'groupe'" class="truncate text-xs text-zinc-400">déposé par {{ row.deposant_nom }}</p>
              </div>
            </div>
          </template>
          <template #cell-brief="{ row }">
            <p class="font-medium text-gray-900">{{ briefParId.get(row.brief)?.titre ?? '—' }}</p>
            <p class="mt-0.5 text-xs text-zinc-400">{{ nomPromotion(briefParId.get(row.brief)?.promotion) }}</p>
          </template>
          <template #cell-date="{ row }">
            <p class="text-zinc-700">{{ formatDate(row.date_depot) }}</p>
            <span
              class="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1"
              :class="row.en_retard ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'"
            >
              {{ row.en_retard ? 'En retard' : 'À temps' }}
            </span>
          </template>
          <template #cell-contenu="{ row }">
            <p class="text-zinc-700">
              <i class="fa-solid fa-paperclip mr-1 text-xs text-zinc-400"></i>{{ resumeContenu(row) }}
            </p>
            <p class="mt-0.5 text-xs text-zinc-400">
              Dépôt n°{{ row.numero }}<template v-if="derniersSeuls && nbDepots(row) > 1"> · {{ nbDepots(row) }} au total</template>
            </p>
          </template>
          <template #cell-actions="{ row }">
            <AppButton variant="secondary" icon="fa-solid fa-eye" @click.stop="selection = row">Consulter</AppButton>
          </template>
          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-inbox text-2xl"></i>
              <span class="text-sm">{{ search || filtreBrief || filtrePromotion ? 'Aucun résultat.' : 'Aucun dépôt pour le moment.' }}</span>
            </div>
          </template>
        </DataTable>
      </div>

      <div class="mt-4">
        <AppPagination v-model:page="page" :total="filtres.length" :page-size="PAGE_SIZE" />
      </div>
    </div>

    <!-- Panneau : contenu du dépôt et historique de l'apprenant / du groupe -->
    <Teleport to="body">
      <div v-if="selection" class="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-[1px]" @click.self="selection = null">
        <aside class="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" role="dialog" aria-label="Détail du livrable">
          <div class="flex items-start gap-3 border-b border-slate-100 px-6 py-4">
            <div class="min-w-0 flex-1">
              <h2 class="truncate font-['Sora'] text-base font-semibold text-gray-900">{{ nomCible(selection) }}</h2>
              <p class="mt-0.5 truncate font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
                {{ briefSelection?.titre }} · {{ nomPromotion(briefSelection?.promotion) }}
              </p>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
              aria-label="Fermer"
              @click="selection = null"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-5">
            <p class="mb-3 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {{ historique.length }} dépôt{{ historique.length > 1 ? 's' : '' }}, du plus récent au plus ancien
            </p>
            <div class="flex flex-col gap-3">
              <div v-for="d in historique" :key="d.id" :class="{ 'rounded-xl ring-2 ring-indigo-200': d.id === selection.id && historique.length > 1 }">
                <DepotCarte :depot="d" :afficher-cible="d.cible?.type === 'groupe'" />
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 px-6 py-3">
            <RouterLink :to="`/briefs/${selection.brief}`" class="font-['Plus_Jakarta_Sans'] text-sm text-indigo-600 hover:underline">
              Voir la fiche du brief
            </RouterLink>
          </div>
        </aside>
      </div>
    </Teleport>
  </AppLayout>
</template>

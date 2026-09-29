<script setup>
/**
 * ProgressionPage — Formateur / Admin organisme : progression globale de
 * chaque apprenant d'une promotion (compétences-niveaux et briefs validés).
 * Formateur : ses promotions ; admin : toutes (consultation).
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import FilterSelect from '../../components/ui/FilterSelect.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import DataTable from '../../components/ui/DataTable.vue'
import AppButton from '../../components/ui/AppButton.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import Graphique from '../../components/progression/Graphique.vue'
import { useAuthStore } from '../../stores/auth'
import { getProgressionPromotion } from '../../services/activites'
import { getPromotions } from '../../services/pedagogie'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const promotions   = ref([])
const promotionId  = ref(route.query.promotion ? String(route.query.promotion) : '')
const lignes       = ref([])
const search       = ref('')
const loading      = ref(true)
const chargement   = ref(false)
const error        = ref('')

const columns = [
  { key: 'nom',         label: 'Apprenant' },
  { key: 'competences', label: 'Compétences validées', width: '280px' },
  { key: 'briefs',      label: 'Briefs validés', width: '160px' },
  { key: 'actions',     label: '', width: '120px' },
]

const pourcent = (v, t) => (t ? Math.round((v / t) * 100) : 0)

const charger = async () => {
  if (!promotionId.value) {
    lignes.value = []
    return
  }
  chargement.value = true
  error.value = ''
  try {
    lignes.value = await getProgressionPromotion(tenantId, promotionId.value)
  } catch {
    error.value = 'Impossible de charger la progression de cette promotion.'
    lignes.value = []
  } finally {
    chargement.value = false
  }
}

onMounted(async () => {
  try {
    promotions.value = await getPromotions(tenantId)
    // Par défaut : la première promotion ouverte (le changement déclenche le chargement)
    const p = promotions.value.find((x) => x.actif) ?? promotions.value[0]
    if (!promotionId.value && p) promotionId.value = String(p.id)
    else await charger()
  } catch {
    error.value = 'Impossible de charger les promotions.'
  } finally {
    loading.value = false
  }
})

watch(promotionId, (v) => {
  router.replace({ query: { ...route.query, promotion: v || undefined } })
  charger()
})

const promotionOptions = computed(() =>
  promotions.value.map((p) => ({ value: String(p.id), label: p.actif ? p.nom : `${p.nom} (clôturée)` }))
)

const filtrees = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? lignes.value.filter((l) => l.nom.toLowerCase().includes(q)) : lignes.value
})

// Moyennes de la promotion
const moyenne = computed(() => {
  const n = lignes.value.length
  if (!n) return null
  const moy = (f) => Math.round(lignes.value.reduce((s, l) => s + f(l), 0) / n)
  return {
    competences: moy((l) => pourcent(l.competences_validees, l.competences_total)),
    briefs: moy((l) => pourcent(l.briefs_valides, l.briefs_total)),
  }
})

// Graphique : % de compétences validées par apprenant, du plus avancé au moins avancé
const donneesGraphique = computed(() => {
  const tries = [...lignes.value].sort(
    (a, b) => pourcent(b.competences_validees, b.competences_total) - pourcent(a.competences_validees, a.competences_total)
  )
  return {
    labels: tries.map((l) => l.nom),
    datasets: [
      {
        label: 'Compétences validées (%)',
        data: tries.map((l) => pourcent(l.competences_validees, l.competences_total)),
        backgroundColor: '#10b981',
        borderRadius: 6,
        barThickness: 14,
      },
      {
        label: 'Briefs validés (%)',
        data: tries.map((l) => pourcent(l.briefs_valides, l.briefs_total)),
        backgroundColor: '#6366f1',
        borderRadius: 6,
        barThickness: 14,
      },
    ],
  }
})
const optionsGraphique = {
  indexAxis: 'y',
  scales: {
    x: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` }, grid: { color: '#f1f5f9' } },
    y: { grid: { display: false } },
  },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label.replace(' (%)', '')} : ${c.parsed.x}%` } },
  },
}
const hauteurGraphique = computed(() => `${Math.max(180, lignes.value.length * 44 + 70)}px`)
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        titre="Progression"
        :description="authStore.role === 'FORMATEUR' ? 'La progression des apprenants de vos promotions.' : 'La progression des apprenants de l’organisme (consultation).'"
      />

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <FilterSelect v-model="promotionId" :options="promotionOptions" placeholder="Choisir une promotion" />
        <div class="min-w-48 flex-1">
          <SearchInput v-model="search" placeholder="Rechercher un apprenant…" />
        </div>
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />

      <div v-if="loading || chargement" class="flex h-48 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <div v-else-if="!promotionId" class="mt-10 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
        Aucune promotion.
      </div>

      <div v-else-if="!lignes.length" class="mt-10 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
        Aucun apprenant inscrit dans cette promotion.
      </div>

      <template v-else>
        <div class="mt-5 grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">Apprenants</p>
            <p class="mt-1 font-['Sora'] text-2xl font-semibold text-gray-900">{{ lignes.length }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">Compétences validées (moyenne)</p>
            <p class="mt-1 font-['Sora'] text-2xl font-semibold text-emerald-600">{{ moyenne.competences }}%</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">Briefs validés (moyenne)</p>
            <p class="mt-1 font-['Sora'] text-2xl font-semibold text-indigo-600">{{ moyenne.briefs }}%</p>
          </div>
        </div>

        <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="mb-4 font-['Sora'] text-base font-semibold text-gray-900">Progression globale</h2>
          <div :style="{ height: hauteurGraphique }">
            <Graphique type="bar" :data="donneesGraphique" :options="optionsGraphique" />
          </div>
        </section>

        <div class="mt-5">
          <DataTable :columns="columns" :rows="filtrees" row-key="apprenant" @row-click="(l) => router.push(`/progression/${l.apprenant}`)">
            <template #cell-nom="{ row }">
              <span class="font-semibold text-gray-900">{{ row.nom }}</span>
            </template>
            <template #cell-competences="{ row }">
              <div class="flex items-center gap-3">
                <div class="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div class="h-full rounded-full bg-emerald-500" :style="{ width: `${pourcent(row.competences_validees, row.competences_total)}%` }"></div>
                </div>
                <span class="w-16 shrink-0 text-right text-xs text-zinc-600">{{ row.competences_validees }} / {{ row.competences_total }}</span>
              </div>
            </template>
            <template #cell-briefs="{ row }">
              <span class="text-zinc-700">{{ row.briefs_valides }} / {{ row.briefs_total }}</span>
            </template>
            <template #cell-actions="{ row }">
              <AppButton variant="secondary" icon="fa-solid fa-chart-line" @click.stop="router.push(`/progression/${row.apprenant}`)">Détail</AppButton>
            </template>
          </DataTable>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getPromotions, getInscriptions, getFormations } from '../../services/pedagogie'
import { getBriefs } from '../../services/activites'
import { getLivrables } from '../../services/activites'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

// ─── État ─────────────────────────────────────────────────────────────────────
const promotions      = ref([])
const formationNoms   = ref({})  // formationId → nom
const inscriptionMap  = ref({})  // promotionId → count apprenants actifs
const briefs          = ref([])
const promotionNoms   = ref({})  // promotionId → nom
const livrables       = ref([])
const loading         = ref(true)
const error           = ref('')

// ─── Chargement ───────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    // Promotions affectées au formateur (filtrées par le backend)
    // Briefs des promotions affectées (filtrés par le backend)
    // Livrables des promotions affectées (filtrés par le backend)
    const [proms, forms, brifsData, livrablesData] = await Promise.all([
      getPromotions(tenantId),
      getFormations(tenantId).catch(() => []),
      getBriefs(tenantId).catch(() => []),
      getLivrables(tenantId).catch(() => []),
    ])

    promotions.value = proms
    briefs.value     = brifsData
    livrables.value  = livrablesData

    // Map formation id → nom
    forms.forEach((f) => { formationNoms.value[f.id] = f.nom })

    // Map promotion id → nom (utile pour afficher la promotion dans les briefs)
    proms.forEach((p) => { promotionNoms.value[p.id] = p.nom })

    // Compter les apprenants inscrits pour chaque promotion (en parallèle)
    const counts = await Promise.all(
      proms.map((p) =>
        getInscriptions(tenantId, p.id, { actif: 'true' })
          .then((ins) => [p.id, ins.length])
          .catch(() => [p.id, 0])
      )
    )
    inscriptionMap.value = Object.fromEntries(counts)
  } catch {
    error.value = 'Impossible de charger le tableau de bord.'
  } finally {
    loading.value = false
  }
})

// ─── Calculés ─────────────────────────────────────────────────────────────────

const totalApprenants = computed(() =>
  Object.values(inscriptionMap.value).reduce((sum, n) => sum + n, 0)
)

// Dépôts des 7 derniers jours (l'évaluation viendra avec l'étape « Évaluation »)
const depotsRecents = computed(() => {
  const limite = Date.now() - 7 * 24 * 3600 * 1000
  return livrables.value.filter((l) => new Date(l.date_depot).getTime() >= limite)
})

const titreBrief = (briefId) => briefs.value.find((b) => b.id === briefId)?.titre ?? '—'

// Trier les promotions actives en premier
const promotionsTri = computed(() =>
  [...promotions.value].sort((a, b) => (b.actif ? 1 : 0) - (a.actif ? 1 : 0))
)

// Trier les briefs : publiés en premier, puis par date limite
const briefsTri = computed(() =>
  [...briefs.value].sort((a, b) => {
    const ordre = { PUBLIE: 0, BROUILLON: 1, ARCHIVE: 2 }
    const diff = (ordre[a.statut] ?? 9) - (ordre[b.statut] ?? 9)
    if (diff !== 0) return diff
    return new Date(a.date_limite) - new Date(b.date_limite)
  })
)

// Derniers dépôts, du plus récent au plus ancien
const derniersDepots = computed(() =>
  [...livrables.value]
    .sort((a, b) => new Date(b.date_depot) - new Date(a.date_depot))
    .slice(0, 8)
)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const formatDateCourte = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const nomFormation = (formationId) => formationNoms.value[formationId] ?? '—'
const nomPromotion = (promotionId) => promotionNoms.value[promotionId] ?? '—'

const isDateDepassee = (iso) => iso && new Date(iso) < new Date()
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <!-- En-tête -->
      <div class="mb-6">
        <h1 class="font-['Sora'] text-xl font-semibold text-gray-900">
          Bonjour, {{ authStore.utilisateur?.prenom }}
        </h1>
        <p class="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
          <span class="font-semibold text-zinc-700">{{ authStore.tenantCourant?.nom }}</span>
          — Espace Formateur
        </p>
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-6" />

      <!-- KPI -->
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Mes promotions"
          :value="loading ? '—' : promotions.length"
          icon="fa-solid fa-users"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-600"
        />
        <StatCard
          label="Mes apprenants"
          :value="loading ? '—' : totalApprenants"
          icon="fa-solid fa-user-graduate"
          icon-background="bg-violet-50"
          icon-color="text-violet-600"
        />
        <StatCard
          label="Mes briefs"
          :value="loading ? '—' : briefs.length"
          icon="fa-solid fa-clipboard-list"
          icon-background="bg-amber-50"
          icon-color="text-amber-600"
        />
        <StatCard
          label="Dépôts (7 jours)"
          :value="loading ? '—' : depotsRecents.length"
          icon="fa-solid fa-inbox"
          icon-background="bg-rose-50"
          icon-color="text-rose-500"
        />
      </div>

      <!-- Chargement global -->
      <div v-if="loading" class="mt-10 flex justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <template v-else>

        <!-- ── Mes promotions ────────────────────────────────────────────────── -->
        <section class="mt-8">
          <h2 class="mb-3 font-['Sora'] text-base font-semibold text-gray-900">
            Mes promotions
          </h2>

          <div v-if="promotions.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-zinc-400">
            <i class="fa-solid fa-users mb-2 text-2xl"></i>
            <p class="font-['Plus_Jakarta_Sans'] text-sm">Aucune promotion affectée.</p>
          </div>

          <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button
              v-for="promo in promotionsTri"
              :key="promo.id"
              type="button"
              class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md focus:outline-none"
              @click="router.push(`/promotions/${promo.id}`)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">
                    {{ promo.nom }}
                  </p>
                  <p class="mt-0.5 truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                    {{ nomFormation(promo.formation) }}
                  </p>
                </div>
                <StatusBadge :value="promo.actif" type="boolean" />
              </div>
              <div class="flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                <i class="fa-solid fa-user-graduate text-[11px]"></i>
                <span>
                  {{ inscriptionMap[promo.id] ?? '—' }}
                  apprenant{{ (inscriptionMap[promo.id] ?? 0) !== 1 ? 's' : '' }}
                </span>
              </div>
            </button>
          </div>
        </section>

        <!-- ── Mes briefs ────────────────────────────────────────────────────── -->
        <section class="mt-8">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
              Mes briefs
            </h2>
          </div>

          <div v-if="briefs.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-zinc-400">
            <i class="fa-solid fa-clipboard-list mb-2 text-2xl"></i>
            <p class="font-['Plus_Jakarta_Sans'] text-sm">Aucun brief pour le moment.</p>
          </div>

          <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/60">
                  <th class="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">Titre</th>
                  <th class="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">Promotion</th>
                  <th class="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden sm:table-cell">Date limite</th>
                  <th class="px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="brief in briefsTri"
                  :key="brief.id"
                  class="group border-b border-slate-100 last:border-0 cursor-pointer transition hover:bg-slate-50/60"
                  @click="router.push(`/briefs/${brief.id}`)"
                >
                  <td class="px-4 py-3">
                    <span class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">
                      {{ brief.titre }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
                    {{ nomPromotion(brief.promotion) }}
                  </td>
                  <td class="px-4 py-3 hidden sm:table-cell">
                    <span
                      class="font-['Plus_Jakarta_Sans'] text-sm"
                      :class="isDateDepassee(brief.date_limite) ? 'text-red-500 font-medium' : 'text-zinc-500'"
                    >
                      {{ formatDate(brief.date_limite) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <StatusBadge :value="brief.statut" type="brief" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── Derniers dépôts ───────────────────────────────────────────────── -->
        <section class="mt-8">
          <div class="mb-3 flex items-baseline justify-between gap-3">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Derniers dépôts</h2>
            <RouterLink to="/suivi-livrables" class="font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline">
              Tout voir
            </RouterLink>
          </div>

          <div v-if="derniersDepots.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-zinc-400">
            <i class="fa-solid fa-inbox mb-2 text-2xl"></i>
            <p class="font-['Plus_Jakarta_Sans'] text-sm">Aucun dépôt pour le moment.</p>
          </div>

          <div v-else class="flex flex-col gap-2">
            <button
              v-for="livrable in derniersDepots"
              :key="livrable.id"
              type="button"
              class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-indigo-200"
              @click="router.push(`/briefs/${livrable.brief}`)"
            >
              <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">
                  {{ livrable.cible?.type === 'groupe' ? `Groupe ${livrable.cible.nom}` : livrable.deposant_nom }}
                  <span class="font-normal text-zinc-400">· Dépôt n°{{ livrable.numero }}</span>
                </p>
                <p class="truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                  {{ titreBrief(livrable.brief) }} · {{ formatDateCourte(livrable.date_depot) }}
                </p>
              </div>
              <span
                v-if="livrable.en_retard"
                class="rounded-full bg-amber-50 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200"
              >
                En retard
              </span>
            </button>
          </div>
        </section>

      </template>
    </div>
  </AppLayout>
</template>

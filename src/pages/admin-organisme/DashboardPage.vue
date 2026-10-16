<script setup>
/**
 * Tableau de bord admin organisme : l'organisme en chiffres, l'activité
 * des 14 derniers jours, la progression par promotion, les points
 * d'attention, et la vue d'ensemble pédagogique (évolution, compétences
 * les moins acquises, bilan par formation). Toutes les données viennent d'un seul appel
 * (tableau-de-bord/admin).
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import Panneau from '../../components/dashboard/Panneau.vue'
import Graphique from '../../components/progression/Graphique.vue'
import CourbeEvolution from '../../components/progression/CourbeEvolution.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getTableauDeBord } from '../../services/activites'
import { dateCourte, depuis } from '../../utils/dates'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const donnees = ref(null)
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    donnees.value = await getTableauDeBord(tenantId, 'admin')
  } catch {
    error.value = 'Impossible de charger les statistiques.'
  } finally {
    loading.value = false
  }
})

const ind = computed(() => donnees.value?.indicateurs ?? {})
const kpi = (cle, suffixe = '') => (loading.value || !donnees.value ? '—' : `${ind.value[cle]}${suffixe}`)

// Courbes : compétences acquises par promotion (celles qui ont commencé)
const seriesEvolution = computed(() =>
  (donnees.value?.promotions ?? [])
    .filter((p) => p.evolution.length)
    .map((p) => ({ label: p.nom, points: p.evolution })),
)

const attention = computed(() => donnees.value?.attention)
const nbPointsAttention = computed(() => {
  const a = attention.value
  if (!a) return 0
  return (
    a.invitations_en_attente +
    a.promotions_sans_formateur.length +
    (a.rendus_en_attente_longue ? 1 : 0) +
    (a.apprenants_a_risque ? 1 : 0)
  )
})

// ─── Graphique : activité des 14 derniers jours ──────────────────────────────
const activite = computed(() => donnees.value?.activite ?? [])
const activiteVide = computed(() => activite.value.every((j) => !j.depots && !j.evaluations))
const donneesActivite = computed(() => ({
  labels: activite.value.map((j) => dateCourte(j.date)),
  datasets: [
    { label: 'Dépôts', data: activite.value.map((j) => j.depots), backgroundColor: '#6366f1', borderRadius: 4 },
    { label: 'Évaluations', data: activite.value.map((j) => j.evaluations), backgroundColor: '#10b981', borderRadius: 4 },
  ],
}))
const optionsActivite = {
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
  },
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } },
}

// ─── Graphique : progression par promotion ───────────────────────────────────
const promotions = computed(() => donnees.value?.promotions ?? [])
const donneesPromotions = computed(() => ({
  labels: promotions.value.map((p) => p.nom),
  datasets: [
    { label: 'Compétences validées (%)', data: promotions.value.map((p) => p.competences_pct), backgroundColor: '#10b981', borderRadius: 6, barThickness: 14 },
    { label: 'Taux de rendu (%)', data: promotions.value.map((p) => p.taux_rendu), backgroundColor: '#6366f1', borderRadius: 6, barThickness: 14 },
  ],
}))
const optionsPromotions = {
  indexAxis: 'y',
  scales: {
    x: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` }, grid: { color: '#f1f5f9' } },
    y: { grid: { display: false } },
  },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label.replace(' (%)', '')} : ${c.parsed.x}%` } },
  },
  onClick: (_evt, elements) => {
    if (elements.length) router.push(`/promotions/${promotions.value[elements[0].index].id}`)
  },
}
const hauteurPromotions = computed(() => `${Math.max(160, promotions.value.length * 48 + 70)}px`)

const pageMembres = (role) => (role === 'FORMATEUR' ? '/formateurs' : '/apprenants')
const libelleRole = { ADMINISTRATEUR: 'Administrateur', FORMATEUR: 'Formateur', APPRENANT: 'Apprenant' }
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
          Vue d'ensemble de
          <span class="font-semibold text-zinc-700">{{ authStore.tenantCourant?.nom }}</span>
          <template v-if="donnees">
            — {{ nbPointsAttention ? `${nbPointsAttention} point${nbPointsAttention > 1 ? 's' : ''} d'attention` : 'aucun point d\'attention' }}.
          </template>
        </p>
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-6" />

      <!-- L'organisme -->
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Apprenants" :value="kpi('apprenants')" icon="fa-solid fa-user-graduate"
          icon-background="bg-indigo-50" icon-color="text-indigo-700" to="/apprenants" />
        <StatCard label="Formateurs" :value="kpi('formateurs')" icon="fa-solid fa-chalkboard-user"
          icon-background="bg-violet-50" icon-color="text-violet-700" to="/formateurs" />
        <StatCard label="Promotions" :value="kpi('promotions_actives')" aide="En cours" icon="fa-solid fa-users"
          icon-background="bg-violet-50" icon-color="text-violet-600" to="/promotions" />
        <StatCard label="Formations" :value="kpi('formations')" icon="fa-solid fa-book-open"
          icon-background="bg-indigo-50" icon-color="text-indigo-600" to="/formations" />
      </div>

      <!-- L'activité pédagogique -->
      <div class="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Dépôts" :value="kpi('depots_7_jours')" aide="Ces 7 derniers jours" icon="fa-solid fa-inbox"
          icon-background="bg-sky-50" icon-color="text-sky-600" />
        <StatCard label="Évaluations" :value="kpi('evaluations_7_jours')" aide="Ces 7 derniers jours" icon="fa-solid fa-pen-to-square"
          icon-background="bg-emerald-50" icon-color="text-emerald-600" />
        <StatCard label="Taux de rendu" :value="kpi('taux_rendu', ' %')" aide="Briefs arrivés à échéance" icon="fa-solid fa-clipboard-check"
          icon-background="bg-amber-50" icon-color="text-amber-600" />
        <StatCard label="Compétences" :value="kpi('competences_pct', ' %')" aide="Validées, en moyenne" icon="fa-solid fa-bullseye"
          icon-background="bg-emerald-50" icon-color="text-emerald-600" to="/progression" />
      </div>

      <div v-if="loading" class="mt-10 flex justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <template v-else-if="donnees">
        <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <!-- Activité -->
          <Panneau
            class="xl:col-span-2"
            titre="Activité des 14 derniers jours"
            :vide="activiteVide"
            message-vide="Aucun dépôt ni évaluation ces 14 derniers jours."
            icone-vide="fa-solid fa-chart-column"
          >
            <div class="h-64">
              <Graphique type="bar" :data="donneesActivite" :options="optionsActivite" />
            </div>
          </Panneau>

          <!-- Points d'attention -->
          <Panneau titre="Points d'attention" :vide="nbPointsAttention === 0" message-vide="Rien à signaler.">
            <div class="flex flex-col gap-4 font-['Plus_Jakarta_Sans']">
              <div v-if="attention.invitations_en_attente">
                <p class="text-sm font-semibold text-gray-900">
                  <i class="fa-regular fa-envelope mr-1.5 text-amber-500"></i>
                  {{ attention.invitations_en_attente }} invitation{{ attention.invitations_en_attente > 1 ? 's' : '' }} non acceptée{{ attention.invitations_en_attente > 1 ? 's' : '' }}
                </p>
                <ul class="mt-1.5 flex flex-col gap-1">
                  <li v-for="m in attention.invitations" :key="m.id">
                    <RouterLink :to="pageMembres(m.role)" class="flex justify-between gap-2 text-xs text-zinc-500 hover:text-indigo-600">
                      <span class="truncate">{{ m.nom }} · {{ libelleRole[m.role] }}</span>
                      <span class="shrink-0">invité {{ depuis(m.date_ajout) }}</span>
                    </RouterLink>
                  </li>
                </ul>
              </div>

              <div v-if="attention.promotions_sans_formateur.length">
                <p class="text-sm font-semibold text-gray-900">
                  <i class="fa-solid fa-user-slash mr-1.5 text-rose-500"></i>
                  Promotion{{ attention.promotions_sans_formateur.length > 1 ? 's' : '' }} sans formateur
                </p>
                <ul class="mt-1.5 flex flex-col gap-1">
                  <li v-for="p in attention.promotions_sans_formateur" :key="p.id">
                    <RouterLink :to="`/promotions/${p.id}`" class="text-xs text-zinc-500 hover:text-indigo-600">{{ p.nom }}</RouterLink>
                  </li>
                </ul>
              </div>

              <div v-if="attention.rendus_en_attente_longue">
                <p class="text-sm font-semibold text-gray-900">
                  <i class="fa-regular fa-clock mr-1.5 text-amber-500"></i>
                  {{ attention.rendus_en_attente_longue }} rendu{{ attention.rendus_en_attente_longue > 1 ? 's' : '' }} en attente d'évaluation depuis plus de 7 jours
                </p>
                <RouterLink to="/suivi-livrables" class="text-xs text-indigo-600 hover:underline">Voir les livrables</RouterLink>
              </div>

              <div v-if="attention.apprenants_a_risque">
                <p class="text-sm font-semibold text-gray-900">
                  <i class="fa-solid fa-user-clock mr-1.5 text-rose-500"></i>
                  {{ attention.apprenants_a_risque }} apprenant{{ attention.apprenants_a_risque > 1 ? 's' : '' }} à risque de décrochage
                </p>
                <RouterLink to="/progression" class="text-xs text-indigo-600 hover:underline">Voir la progression</RouterLink>
              </div>
            </div>
          </Panneau>
        </div>

        <!-- Promotions en cours -->
        <Panneau
          class="mt-4"
          titre="Promotions en cours"
          lien="/promotions"
          :vide="promotions.length === 0"
          message-vide="Aucune promotion en cours."
          icone-vide="fa-solid fa-users"
        >
          <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div class="xl:col-span-2" :style="{ height: hauteurPromotions }">
              <Graphique type="bar" :data="donneesPromotions" :options="optionsPromotions" />
            </div>
            <ul class="flex flex-col divide-y divide-slate-100 font-['Plus_Jakarta_Sans']">
              <li v-for="p in promotions" :key="p.id">
                <RouterLink :to="`/promotions/${p.id}`" class="block py-2.5 hover:text-indigo-600">
                  <p class="truncate text-sm font-semibold text-gray-900">{{ p.nom }}</p>
                  <p class="text-xs text-zinc-500">
                    {{ p.nb_apprenants }} apprenant{{ p.nb_apprenants !== 1 ? 's' : '' }}
                    · {{ p.nb_formateurs }} formateur{{ p.nb_formateurs !== 1 ? 's' : '' }}
                    <span v-if="p.a_evaluer" class="text-amber-700">· {{ p.a_evaluer }} à évaluer</span>
                    <span v-if="p.a_risque" class="text-rose-600">· {{ p.a_risque }} à risque</span>
                  </p>
                </RouterLink>
              </li>
            </ul>
          </div>
        </Panneau>

        <!-- Vue d'ensemble pédagogique -->
        <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panneau
            titre="Évolution des compétences acquises"
            :vide="seriesEvolution.length === 0"
            message-vide="Aucune promotion commencée."
            icone-vide="fa-solid fa-chart-line"
          >
            <p class="-mt-2 mb-3 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Moyenne par promotion, semaine après semaine.</p>
            <CourbeEvolution :series="seriesEvolution" />
          </Panneau>

          <Panneau
            titre="Compétences les moins acquises"
            :vide="donnees.competences_moins_acquises.length === 0"
            message-vide="Aucune compétence évaluée sur un brief échu pour le moment."
            icone-vide="fa-solid fa-bullseye"
          >
            <p class="-mt-2 mb-3 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
              Compétences visées par des briefs échus : part des apprenants concernés qui les ont validées.
            </p>
            <ul class="flex flex-col gap-3 font-['Plus_Jakarta_Sans']">
              <li v-for="c in donnees.competences_moins_acquises" :key="c.id">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="truncate text-sm font-medium text-gray-900">
                    {{ c.competence }} <span class="font-normal text-zinc-400">· {{ c.niveau }}</span>
                  </p>
                  <span class="shrink-0 text-xs font-semibold" :class="c.pct < 50 ? 'text-rose-600' : 'text-zinc-600'">{{ c.pct }} %</span>
                </div>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full" :class="c.pct < 50 ? 'bg-rose-400' : 'bg-amber-400'" :style="{ width: `${c.pct}%` }"></div>
                </div>
                <p class="mt-1 truncate text-[11px] text-zinc-400">
                  {{ c.module }} · {{ c.formation }} · {{ c.apprenants }} apprenant{{ c.apprenants > 1 ? 's' : '' }} concerné{{ c.apprenants > 1 ? 's' : '' }}
                </p>
              </li>
            </ul>
          </Panneau>
        </div>

        <Panneau
          class="mt-4"
          titre="Bilan par formation"
          lien="/formations"
          :vide="donnees.formations.length === 0"
          message-vide="Aucune promotion en cours."
          icone-vide="fa-solid fa-book-open"
        >
          <div class="overflow-x-auto">
            <table class="w-full min-w-[560px] font-['Plus_Jakarta_Sans'] text-sm">
              <thead>
                <tr class="border-b border-slate-100 text-left text-xs text-zinc-400">
                  <th class="pb-2 font-medium">Formation</th>
                  <th class="pb-2 text-right font-medium">Promotions</th>
                  <th class="pb-2 text-right font-medium">Apprenants</th>
                  <th class="w-1/4 pb-2 pl-6 font-medium">Compétences acquises</th>
                  <th class="pb-2 text-right font-medium">Taux de rendu</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="f in donnees.formations" :key="f.id">
                  <td class="py-2.5">
                    <RouterLink :to="`/formations/${f.id}`" class="font-semibold text-gray-900 hover:text-indigo-600">{{ f.nom }}</RouterLink>
                  </td>
                  <td class="py-2.5 text-right text-zinc-600">{{ f.promotions }}</td>
                  <td class="py-2.5 text-right text-zinc-600">{{ f.apprenants }}</td>
                  <td class="py-2.5 pl-6">
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div class="h-full rounded-full bg-emerald-500" :style="{ width: `${f.competences_pct}%` }"></div>
                      </div>
                      <span class="w-10 text-right text-xs text-zinc-600">{{ f.competences_pct }} %</span>
                    </div>
                  </td>
                  <td class="py-2.5 text-right text-zinc-600">{{ f.taux_rendu }} %</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panneau>
      </template>

    </div>
  </AppLayout>
</template>

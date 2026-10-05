<script setup>
/**
 * Tableau de bord formateur : ce qui attend une action (rendus à évaluer,
 * échéances, apprenants en retard) et où en sont ses promotions.
 * Toutes les données viennent d'un seul appel (tableau-de-bord/formateur).
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import Panneau from '../../components/dashboard/Panneau.vue'
import Graphique from '../../components/progression/Graphique.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import { useAuthStore } from '../../stores/auth'
import { getTableauDeBord } from '../../services/activites'
import { depuis, echeanceRelative, joursJusqua } from '../../utils/dates'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const donnees = ref(null)
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    donnees.value = await getTableauDeBord(tenantId, 'formateur')
  } catch {
    error.value = 'Impossible de charger le tableau de bord.'
  } finally {
    loading.value = false
  }
})

const ind = computed(() => donnees.value?.indicateurs ?? {})
const kpi = (cle, suffixe = '') => (loading.value || !donnees.value ? '—' : `${ind.value[cle]}${suffixe}`)

// Phrase d'accroche : la priorité du moment
const accroche = computed(() => {
  if (!donnees.value) return ''
  const n = ind.value.a_evaluer
  if (n > 0) return `${n} rendu${n > 1 ? 's attendent' : ' attend'} votre évaluation.`
  const retards = donnees.value.apprenants_a_suivre.length
  if (retards > 0) return `Tout est évalué. ${retards} apprenant${retards > 1 ? 's ont' : ' a'} des briefs en retard.`
  return 'Tout est à jour : aucun rendu en attente.'
})

// ─── Graphique : suivi des briefs (barres empilées) ──────────────────────────
const ETATS = [
  { cle: 'VALIDE',     label: 'Validé',     couleur: '#10b981' },
  { cle: 'NON_VALIDE', label: 'Non validé', couleur: '#f43f5e' },
  { cle: 'A_EVALUER',  label: 'À évaluer',  couleur: '#f59e0b' },
  { cle: 'NON_RENDU',  label: 'Non rendu',  couleur: '#e4e4e7' },
]

const suivi = computed(() => donnees.value?.suivi_briefs ?? [])
const donneesSuivi = computed(() => ({
  labels: suivi.value.map((s) => s.titre),
  datasets: ETATS.map((e) => ({
    label: e.label,
    data: suivi.value.map((s) => s[e.cle]),
    backgroundColor: e.couleur,
    borderRadius: 4,
    barThickness: 16,
  })),
}))
const optionsSuivi = {
  indexAxis: 'y',
  scales: {
    x: { stacked: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    y: { stacked: true, grid: { display: false } },
  },
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } },
  onClick: (_evt, elements) => {
    if (elements.length) router.push(`/briefs/${suivi.value[elements[0].index].brief}`)
  },
}
const hauteurSuivi = computed(() => `${Math.max(160, suivi.value.length * 40 + 70)}px`)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const nomCible = (c) => (c.type === 'groupe' ? `Groupe ${c.nom}` : c.nom)
const couleurEcheance = (iso) => {
  const jours = joursJusqua(iso)
  if (new Date(iso) < new Date()) return 'text-rose-600'
  return jours <= 2 ? 'text-amber-600' : 'text-zinc-500'
}
const pourcent = (a, b) => (b ? Math.round((100 * a) / b) : 0)
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
          — {{ accroche || 'Espace Formateur' }}
        </p>
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-6" />

      <!-- Indicateurs -->
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="À évaluer"
          :value="kpi('a_evaluer')"
          aide="Rendus en attente"
          icon="fa-solid fa-pen-to-square"
          icon-background="bg-amber-50"
          icon-color="text-amber-600"
          :alerte="ind.a_evaluer > 0"
          to="/suivi-livrables"
        />
        <StatCard
          label="Dépôts"
          :value="kpi('depots_7_jours')"
          aide="Ces 7 derniers jours"
          icon="fa-solid fa-inbox"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-600"
        />
        <StatCard
          label="Taux de rendu"
          :value="kpi('taux_rendu', ' %')"
          aide="Briefs arrivés à échéance"
          icon="fa-solid fa-clipboard-check"
          icon-background="bg-violet-50"
          icon-color="text-violet-600"
        />
        <StatCard
          label="Compétences"
          :value="kpi('competences_pct', ' %')"
          aide="Validées, en moyenne"
          icon="fa-solid fa-bullseye"
          icon-background="bg-emerald-50"
          icon-color="text-emerald-600"
          to="/progression"
        />
      </div>

      <div v-if="loading" class="mt-10 flex justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <template v-else-if="donnees">

        <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <!-- À évaluer -->
          <Panneau
            class="xl:col-span-2"
            titre="À évaluer"
            lien="/suivi-livrables"
            :vide="donnees.a_evaluer.length === 0"
            message-vide="Aucun rendu en attente d'évaluation."
          >
            <template #badge>
              <span v-if="ind.a_evaluer" class="ml-2 rounded-full bg-amber-50 px-2 py-0.5 align-middle font-['Plus_Jakarta_Sans'] text-xs font-semibold text-amber-700">
                {{ ind.a_evaluer }}
              </span>
            </template>
            <ul class="flex flex-col divide-y divide-slate-100">
              <li v-for="r in donnees.a_evaluer" :key="r.assignation" class="flex items-center justify-between gap-3 py-2.5">
                <div class="min-w-0">
                  <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">
                    {{ nomCible(r.cible) }}
                    <span class="font-normal text-zinc-400">· Dépôt n°{{ r.numero }}</span>
                  </p>
                  <p class="truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                    {{ r.brief_titre }} · déposé {{ depuis(r.date_depot) }}
                    <span v-if="r.en_retard" class="ml-1 font-semibold text-amber-700">· en retard</span>
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-white transition hover:bg-indigo-700"
                  @click="router.push(`/briefs/${r.brief}`)"
                >
                  Évaluer
                </button>
              </li>
            </ul>
          </Panneau>

          <!-- Échéances -->
          <Panneau
            titre="Échéances"
            lien="/briefs"
            :vide="donnees.echeances.length === 0"
            message-vide="Aucune échéance dans les 14 prochains jours."
            icone-vide="fa-regular fa-calendar"
          >
            <ul class="flex flex-col gap-3">
              <li v-for="e in donnees.echeances" :key="e.brief">
                <button type="button" class="w-full text-left" @click="router.push(`/briefs/${e.brief}`)">
                  <div class="flex items-baseline justify-between gap-2">
                    <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">{{ e.titre }}</p>
                    <span class="shrink-0 font-['Plus_Jakarta_Sans'] text-xs font-semibold" :class="couleurEcheance(e.date_limite)">
                      {{ echeanceRelative(e.date_limite) }}
                    </span>
                  </div>
                  <div class="mt-1.5 flex items-center gap-2">
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div class="h-full rounded-full bg-indigo-500" :style="{ width: `${pourcent(e.rendus, e.attendus)}%` }"></div>
                    </div>
                    <span class="shrink-0 font-['Plus_Jakarta_Sans'] text-[11px] text-zinc-500">{{ e.rendus }}/{{ e.attendus }} rendus</span>
                  </div>
                </button>
              </li>
            </ul>
          </Panneau>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <!-- Suivi des briefs -->
          <Panneau
            class="xl:col-span-2"
            titre="Suivi des briefs"
            :vide="suivi.length === 0"
            message-vide="Aucun brief publié et assigné pour le moment."
            icone-vide="fa-solid fa-chart-column"
          >
            <div :style="{ height: hauteurSuivi }">
              <Graphique type="bar" :data="donneesSuivi" :options="optionsSuivi" />
            </div>
          </Panneau>

          <!-- Apprenants à suivre -->
          <Panneau
            titre="Apprenants à suivre"
            :vide="donnees.apprenants_a_suivre.length === 0"
            message-vide="Aucun apprenant en retard."
          >
            <ul class="flex flex-col gap-3">
              <li v-for="a in donnees.apprenants_a_suivre" :key="`${a.id}-${a.promotion}`">
                <button type="button" class="w-full text-left" @click="router.push(`/progression/${a.id}`)">
                  <div class="flex items-baseline justify-between gap-2">
                    <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">{{ a.nom }}</p>
                    <span class="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold text-rose-600">
                      {{ a.briefs_non_rendus }} non rendu{{ a.briefs_non_rendus > 1 ? 's' : '' }}
                    </span>
                  </div>
                  <div class="mt-1.5 flex items-center gap-2">
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div class="h-full rounded-full bg-emerald-500" :style="{ width: `${a.competences_pct}%` }"></div>
                    </div>
                    <span class="shrink-0 font-['Plus_Jakarta_Sans'] text-[11px] text-zinc-500">{{ a.competences_pct }} % compétences</span>
                  </div>
                </button>
              </li>
            </ul>
          </Panneau>
        </div>

        <!-- Mes promotions -->
        <section class="mt-6">
          <h2 class="mb-3 font-['Sora'] text-base font-semibold text-gray-900">Mes promotions</h2>

          <div v-if="donnees.promotions.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-zinc-400">
            <i class="fa-solid fa-users mb-2 text-2xl"></i>
            <p class="font-['Plus_Jakarta_Sans'] text-sm">Aucune promotion affectée.</p>
          </div>

          <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button
              v-for="promo in donnees.promotions"
              :key="promo.id"
              type="button"
              class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md focus:outline-none"
              @click="router.push(`/promotions/${promo.id}`)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ promo.nom }}</p>
                  <p class="mt-0.5 truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ promo.formation }}</p>
                </div>
                <StatusBadge :value="promo.actif" type="boolean" />
              </div>
              <div>
                <div class="mb-1 flex justify-between font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                  <span>
                    <i class="fa-solid fa-user-graduate mr-1 text-[11px]"></i>
                    {{ promo.nb_apprenants }} apprenant{{ promo.nb_apprenants !== 1 ? 's' : '' }}
                  </span>
                  <span>{{ promo.competences_pct }} % compétences</span>
                </div>
                <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full bg-emerald-500" :style="{ width: `${promo.competences_pct}%` }"></div>
                </div>
              </div>
            </button>
          </div>
        </section>

      </template>
    </div>
  </AppLayout>
</template>

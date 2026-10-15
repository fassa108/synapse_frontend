<script setup>
/**
 * Mon activité — Formateur : sa propre implication sur la plateforme
 * (grille d'activité sur un an, indicateurs comparés aux 30 jours
 * précédents, dernières actions). Visible par lui seul.
 */
import { computed, onMounted, ref } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import Panneau from '../../components/dashboard/Panneau.vue'
import Graphique from '../../components/progression/Graphique.vue'
import GrilleActivite from '../../components/activite/GrilleActivite.vue'
import { useAuthStore } from '../../stores/auth'
import { getActiviteFormateur } from '../../services/activites'
import { ilYa } from '../../utils/dates'

const authStore = useAuthStore()
const donnees = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    donnees.value = await getActiviteFormateur(authStore.tenantCourant?.id)
  } catch {
    error.value = 'Impossible de charger votre activité.'
  } finally {
    loading.value = false
  }
})

const TYPES = [
  { cle: 'BRIEF', label: 'Briefs publiés', icone: 'fa-clipboard-list', classes: 'bg-indigo-50 text-indigo-600' },
  { cle: 'EVALUATION', label: 'Rendus évalués', icone: 'fa-clipboard-check', classes: 'bg-emerald-50 text-emerald-600' },
  { cle: 'RESSOURCE', label: 'Ressources ajoutées', icone: 'fa-folder-plus', classes: 'bg-sky-50 text-sky-600' },
  { cle: 'REVISION', label: 'Quiz et fiches publiés', icone: 'fa-brain', classes: 'bg-violet-50 text-violet-600' },
]
const typeDe = (cle) => TYPES.find((t) => t.cle === cle) ?? TYPES[0]

const periode = computed(() => donnees.value?.periode)
const precedente = computed(() => donnees.value?.periode_precedente)

// « ↑ 3 vs 30 j précédents »
const tendance = (actuel, avant, formater = (x) => x) => {
  if (actuel === null || avant === null || actuel === undefined || avant === undefined) return ''
  const ecart = Math.round((actuel - avant) * 10) / 10
  if (ecart === 0) return `Stable par rapport aux ${donnees.value.periode_jours} jours précédents`
  const fleche = ecart > 0 ? '↑' : '↓'
  return `${fleche} ${formater(Math.abs(ecart))} vs ${donnees.value.periode_jours} j précédents`
}

const duree = (heures) => {
  if (heures === null || heures === undefined) return '—'
  if (heures < 1) return `${Math.max(1, Math.round(heures * 60))} min`
  if (heures < 48) return `${Math.round(heures)} h`
  return `${Math.round((heures / 24) * 10) / 10} j`.replace('.', ',')
}

const cartes = computed(() => {
  if (!donnees.value) return []
  const p = periode.value
  const a = precedente.value
  return [
    {
      label: 'Délai moyen de correction',
      value: duree(p.delai_moyen_correction_h),
      aide: tendance(p.delai_moyen_correction_h, a.delai_moyen_correction_h, duree),
      icon: 'fa-solid fa-stopwatch',
      iconBackground: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Évaluations commentées',
      value: p.feedback_pct === null ? '—' : `${p.feedback_pct} %`,
      aide: tendance(p.feedback_pct, a.feedback_pct, (x) => `${x} pts`),
      icon: 'fa-solid fa-comment-dots',
      iconBackground: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: `En attente depuis plus de ${donnees.value.attente_jours} j`,
      value: donnees.value.rendus_en_attente,
      aide: donnees.value.rendus_en_attente ? 'Rendus à évaluer en priorité' : 'Aucun retard de correction',
      icon: 'fa-solid fa-hourglass-half',
      iconBackground: 'bg-rose-50',
      iconColor: 'text-rose-500',
      alerte: donnees.value.rendus_en_attente > 0,
      to: '/suivi-livrables',
    },
  ]
})

const donneesGraphique = computed(() => ({
  labels: TYPES.map((t) => t.label),
  datasets: [
    {
      label: `${donnees.value.periode_jours} derniers jours`,
      data: TYPES.map((t) => periode.value.actions[t.cle]),
      backgroundColor: '#6366f1',
      borderRadius: 4,
    },
    {
      label: `${donnees.value.periode_jours} jours précédents`,
      data: TYPES.map((t) => precedente.value.actions[t.cle]),
      backgroundColor: '#cbd5e1',
      borderRadius: 4,
    },
  ],
}))
const optionsGraphique = {
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } },
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        titre="Mon activité"
        description="Votre implication sur la plateforme, visible par vous seul."
      />

      <div v-if="loading" class="flex h-48 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="error" variant="error" :message="error" class="mt-4" />

      <template v-else>
        <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Mes 12 derniers mois</h2>
              <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Briefs publiés, rendus évalués, ressources, quiz et fiches
              </span>
            </div>
            <GrilleActivite :jours="donnees.grille" />
          </section>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 xl:content-start">
            <StatCard v-for="c in cartes" :key="c.label" v-bind="c" />
          </div>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Panneau class="xl:col-span-3" titre="Actions par type">
            <div class="h-64">
              <Graphique type="bar" :data="donneesGraphique" :options="optionsGraphique" />
            </div>
          </Panneau>

          <Panneau
            class="xl:col-span-2"
            titre="Dernières actions"
            :vide="donnees.fil.length === 0"
            message-vide="Aucune action pour le moment."
            icone-vide="fa-solid fa-bolt"
          >
            <ul class="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
              <li v-for="(a, i) in donnees.fil" :key="i">
                <RouterLink :to="a.lien" class="flex items-start gap-3 rounded-lg hover:bg-slate-50">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    :class="typeDe(a.type).classes"
                  >
                    <i class="fa-solid text-[11px]" :class="typeDe(a.type).icone"></i>
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate font-['Plus_Jakarta_Sans'] text-sm text-gray-900">{{ a.libelle }}</span>
                    <span class="block font-['Plus_Jakarta_Sans'] text-[11px] text-zinc-400">{{ ilYa(a.date) }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </Panneau>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

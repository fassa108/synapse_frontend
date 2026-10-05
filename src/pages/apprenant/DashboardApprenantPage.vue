<script setup>
/**
 * Tableau de bord apprenant : ce qu'il reste à faire (briefs à rendre,
 * quiz), sa progression et les derniers retours (évaluations,
 * commentaires des pairs). Toutes les données viennent d'un seul appel
 * (tableau-de-bord/apprenant).
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import Panneau from '../../components/dashboard/Panneau.vue'
import JaugeProgression from '../../components/progression/JaugeProgression.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getTableauDeBord } from '../../services/activites'
import { dateCourte, depuis, echeanceRelative, joursJusqua } from '../../utils/dates'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const donnees = ref(null)
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    donnees.value = await getTableauDeBord(tenantId, 'apprenant')
  } catch {
    error.value = 'Impossible de charger votre tableau de bord.'
  } finally {
    loading.value = false
  }
})

const inscrit = computed(() => Boolean(donnees.value?.promotion))
const ind = computed(() => donnees.value?.indicateurs ?? {})
const kpi = (cle) => (loading.value || !inscrit.value ? '—' : ind.value[cle])

const dernierQuiz = computed(() => {
  const q = ind.value.dernier_quiz
  return q ? `${q.score}/${q.total}` : '—'
})

// Phrase d'accroche : la priorité du moment
const accroche = computed(() => {
  if (!inscrit.value) return ''
  const { en_retard: retard, a_rendre: aRendre } = ind.value
  if (retard) return `${retard} brief${retard > 1 ? 's' : ''} en retard : à rendre au plus vite.`
  const prochain = donnees.value.a_rendre[0]
  if (prochain) return `Prochain rendu : « ${prochain.titre} », ${echeanceRelative(prochain.date_limite)}.`
  if (aRendre === 0 && donnees.value.quiz_a_faire.length) return 'Tout est rendu : un quiz vous attend pour réviser.'
  return 'Tout est rendu, bravo !'
})

const aFaireVide = computed(() => !donnees.value?.a_rendre.length && !donnees.value?.quiz_a_faire.length)
const pasEncoreOuvert = (b) => new Date(b.date_debut) > new Date()
const couleurEcheance = (b) => {
  if (b.en_retard) return 'text-rose-600'
  return joursJusqua(b.date_limite) <= 2 ? 'text-amber-600' : 'text-zinc-500'
}
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
          <template v-if="inscrit">
            <span class="font-semibold text-zinc-700">{{ donnees.promotion.nom }}</span>
            — {{ accroche }}
          </template>
          <template v-else>{{ authStore.tenantCourant?.nom }}</template>
        </p>
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-6" />

      <div v-if="loading" class="mt-10 flex justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner
        v-else-if="donnees && !inscrit"
        variant="info"
        message="Vous n'êtes inscrit à aucune promotion en cours. Votre tableau de bord s'affichera dès votre inscription."
      />

      <template v-else-if="inscrit">
        <!-- Indicateurs -->
        <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="À rendre" :value="kpi('a_rendre')" aide="Briefs en cours" icon="fa-solid fa-clipboard-list"
            icon-background="bg-indigo-50" icon-color="text-indigo-600" to="/activites" />
          <StatCard label="En retard" :value="kpi('en_retard')" aide="Échéance dépassée" icon="fa-solid fa-triangle-exclamation"
            icon-background="bg-rose-50" icon-color="text-rose-500" :alerte="ind.en_retard > 0" to="/activites" />
          <StatCard label="En attente" :value="kpi('en_attente_evaluation')" aide="Rendus pas encore évalués" icon="fa-solid fa-hourglass-half"
            icon-background="bg-amber-50" icon-color="text-amber-600" to="/livrables" />
          <StatCard label="Dernier quiz" :value="dernierQuiz" :aide="ind.dernier_quiz?.titre || 'Aucun quiz passé'" icon="fa-solid fa-brain"
            icon-background="bg-violet-50" icon-color="text-violet-600" to="/mes-revisions" />
        </div>

        <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <!-- Progression -->
          <div class="flex flex-col gap-4">
            <JaugeProgression
              titre="Compétences validées"
              :valeur="donnees.progression.competences_validees"
              :total="donnees.progression.competences_total"
              couleur="#10b981"
            />
            <JaugeProgression
              titre="Briefs validés"
              :valeur="donnees.progression.briefs_valides"
              :total="donnees.progression.briefs_total"
            />
            <RouterLink to="/ma-progression" class="text-center font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline">
              Voir ma progression détaillée
            </RouterLink>
          </div>

          <!-- À faire -->
          <Panneau
            class="xl:col-span-2"
            titre="À faire"
            lien="/activites"
            libelle-lien="Mes activités"
            :vide="aFaireVide"
            message-vide="Rien à rendre pour le moment."
          >
            <ul class="flex flex-col divide-y divide-slate-100 font-['Plus_Jakarta_Sans']">
              <li v-for="b in donnees.a_rendre" :key="`brief-${b.brief}`">
                <button type="button" class="flex w-full items-center justify-between gap-3 py-2.5 text-left" @click="router.push(`/activites/${b.brief}`)">
                  <div class="flex min-w-0 items-center gap-3">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="b.en_retard ? 'bg-rose-50' : 'bg-indigo-50'">
                      <i class="fa-solid fa-clipboard-list text-xs" :class="b.en_retard ? 'text-rose-500' : 'text-indigo-600'"></i>
                    </span>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-gray-900">{{ b.titre }}</p>
                      <p class="text-xs text-zinc-500">
                        {{ pasEncoreOuvert(b) ? `Ouvre le ${dateCourte(b.date_debut)}` : `À rendre pour le ${dateCourte(b.date_limite)}` }}
                      </p>
                    </div>
                  </div>
                  <span class="shrink-0 text-xs font-semibold" :class="couleurEcheance(b)">
                    {{ echeanceRelative(b.date_limite) }}
                  </span>
                </button>
              </li>
              <li v-for="q in donnees.quiz_a_faire" :key="`quiz-${q.id}`">
                <button type="button" class="flex w-full items-center justify-between gap-3 py-2.5 text-left" @click="router.push(`/mes-revisions/${q.id}`)">
                  <div class="flex min-w-0 items-center gap-3">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                      <i class="fa-solid fa-brain text-xs text-violet-600"></i>
                    </span>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-gray-900">{{ q.titre || 'Quiz' }}</p>
                      <p class="text-xs text-zinc-500">Quiz de révision · {{ q.module }}</p>
                    </div>
                  </div>
                  <span class="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">Nouveau</span>
                </button>
              </li>
            </ul>
          </Panneau>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <!-- Évaluations récentes -->
          <Panneau
            titre="Dernières évaluations"
            lien="/livrables"
            :vide="donnees.evaluations_recentes.length === 0"
            message-vide="Pas encore d'évaluation."
            icone-vide="fa-regular fa-star"
          >
            <ul class="flex flex-col divide-y divide-slate-100 font-['Plus_Jakarta_Sans']">
              <li v-for="e in donnees.evaluations_recentes" :key="e.id">
                <button type="button" class="flex w-full items-center justify-between gap-3 py-2.5 text-left" @click="router.push(`/activites/${e.brief}`)">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-gray-900">{{ e.brief_titre }}</p>
                    <p class="text-xs text-zinc-500">
                      {{ e.evaluateur ? `Par ${e.evaluateur}, ` : '' }}{{ depuis(e.date) }}
                      <template v-if="e.nb_visees"> · {{ e.nb_acquises }}/{{ e.nb_visees }} compétences acquises</template>
                    </p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    :class="e.valide ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
                  >
                    {{ e.valide ? 'Validé' : 'À retravailler' }}
                  </span>
                </button>
              </li>
            </ul>
          </Panneau>

          <!-- Commentaires des pairs -->
          <Panneau
            titre="Retours de vos pairs"
            :vide="donnees.commentaires_recents.length === 0"
            message-vide="Pas encore de commentaire sur vos travaux."
            icone-vide="fa-regular fa-comments"
          >
            <ul class="flex flex-col gap-3 font-['Plus_Jakarta_Sans']">
              <li v-for="c in donnees.commentaires_recents" :key="c.id">
                <button type="button" class="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-left transition hover:bg-slate-100" @click="router.push(`/activites/${c.brief}`)">
                  <p class="text-xs text-zinc-500">
                    <span class="font-semibold text-zinc-700">{{ c.auteur }}</span>
                    sur {{ c.brief_titre }} · {{ depuis(c.date) }}
                  </p>
                  <p class="mt-1 line-clamp-2 text-sm text-gray-800">{{ c.extrait }}</p>
                </button>
              </li>
            </ul>
          </Panneau>
        </div>
      </template>

    </div>
  </AppLayout>
</template>

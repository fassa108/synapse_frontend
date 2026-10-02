<script setup>
/**
 * MesRevisionsPage — quiz et fiches de révision publiés (apprenant).
 *
 * Disponibles pour les modules où l'apprenant a déposé un livrable.
 * Outil d'entraînement : les scores ne comptent pas dans l'évaluation.
 */
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getSupports } from '../../services/revision'
import { DIFFICULTES } from '../../utils/revision'

const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const supports = ref([])
const chargement = ref(true)
const erreur = ref('')

onMounted(async () => {
  try {
    supports.value = await getSupports(tenantId)
  } catch {
    erreur.value = 'Impossible de charger les révisions.'
  } finally {
    chargement.value = false
  }
})

// Par module : quiz dans l'ordre des difficultés, puis fiches
const parModule = computed(() => {
  const groupes = new Map()
  for (const s of supports.value) {
    if (!groupes.has(s.module)) groupes.set(s.module, { id: s.module, nom: s.module_nom, quiz: [], fiches: [] })
    groupes.get(s.module)[s.type === 'QUIZ' ? 'quiz' : 'fiches'].push(s)
  }
  const ordre = DIFFICULTES.map((d) => d.value)
  return [...groupes.values()].map((g) => ({
    ...g,
    quiz: g.quiz.sort((a, b) => ordre.indexOf(a.difficulte) - ordre.indexOf(b.difficulte)),
  }))
})

const difficulte = (v) => DIFFICULTES.find((d) => d.value === v)
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        titre="Révisions"
        description="Quiz et fiches pour réviser les modules sur lesquels vous avez rendu un travail. Les scores ne comptent pas dans votre évaluation."
      />

      <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-4" />

      <p v-if="chargement" class="mt-6 font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>Chargement…
      </p>

      <div v-else-if="!parModule.length" class="mt-10 flex flex-col items-center gap-2 text-center text-zinc-400">
        <i class="fa-solid fa-graduation-cap text-3xl"></i>
        <p class="font-['Plus_Jakarta_Sans'] text-sm">
          Aucune révision pour le moment. Elles apparaissent quand votre formateur en publie pour un module où vous avez déposé un livrable.
        </p>
      </div>

      <section v-for="m in parModule" :key="m.id" class="mt-8">
        <h2 class="font-['Sora'] text-base font-semibold text-gray-900">{{ m.nom }}</h2>
        <div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            v-for="q in m.quiz" :key="q.id" :to="`/mes-revisions/${q.id}`"
            class="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
          >
            <span class="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <i :class="difficulte(q.difficulte)?.icone" class="text-indigo-500"></i>Quiz {{ difficulte(q.difficulte)?.label.toLowerCase() }}
            </span>
            <span class="mt-2 font-['Sora'] text-sm font-semibold text-gray-900 group-hover:text-indigo-600">{{ q.titre }}</span>
            <span class="mt-auto pt-3 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              {{ q.questions.length }} questions ·
              <template v-if="q.nb_tentatives">meilleur score {{ q.meilleur_score }}/{{ q.questions.length }}</template>
              <template v-else>pas encore tenté</template>
            </span>
          </RouterLink>

          <RouterLink
            v-for="f in m.fiches" :key="f.id" :to="`/mes-revisions/${f.id}`"
            class="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
          >
            <span class="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <i class="fa-solid fa-file-lines text-indigo-500"></i>Fiche de révision
            </span>
            <span class="mt-2 font-['Sora'] text-sm font-semibold text-gray-900 group-hover:text-indigo-600">{{ f.titre }}</span>
          </RouterLink>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

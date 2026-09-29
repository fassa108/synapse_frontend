<script setup>
/**
 * EvaluationCarte — une évaluation : auteur, date, chaque compétence visée
 * (acquise ou non) et le commentaire général.
 *
 * Props :
 *   - evaluation : évaluation renvoyée par l'API
 *   - ancienne   : affichage atténué (historique)
 */
defineProps({
  evaluation: { type: Object, required: true },
  ancienne:   { type: Boolean, default: false },
})

const formatDate = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4" :class="{ 'opacity-70': ancienne }">
    <div class="flex flex-wrap items-center gap-2 font-['Plus_Jakarta_Sans']">
      <i class="fa-solid fa-clipboard-check text-xs text-indigo-500"></i>
      <span class="text-sm font-semibold text-gray-900">{{ ancienne ? 'Évaluation précédente' : 'Évaluation' }}</span>
      <span class="text-xs text-zinc-400">· {{ formatDate(evaluation.date_creation) }}</span>
      <span v-if="evaluation.evaluateur_nom" class="ml-auto text-xs text-zinc-500">par {{ evaluation.evaluateur_nom }}</span>
    </div>

    <ul v-if="evaluation.competences.length" class="mt-3 flex flex-col gap-2">
      <li v-for="c in evaluation.competences" :key="c.competence_niveau" class="flex items-start gap-2.5">
        <span
          class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
          :class="c.acquis ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'"
          :title="c.acquis ? 'Acquis' : 'Non acquis'"
        >
          <i :class="c.acquis ? 'fa-solid fa-check' : 'fa-solid fa-xmark'"></i>
        </span>
        <div class="min-w-0 font-['Plus_Jakarta_Sans']">
          <p class="text-sm text-gray-900">
            {{ c.competence_nom }} <span class="text-zinc-400">· {{ c.niveau_nom }}</span>
            <span class="ml-1 text-xs font-semibold" :class="c.acquis ? 'text-emerald-700' : 'text-rose-600'">
              {{ c.acquis ? 'Acquis' : 'Non acquis' }}
            </span>
          </p>
        </div>
      </li>
    </ul>

    <p v-if="evaluation.commentaire" class="mt-3 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
      {{ evaluation.commentaire }}
    </p>
  </div>
</template>

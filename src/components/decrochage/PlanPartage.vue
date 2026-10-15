<script setup>
/**
 * Apprenant : dernier plan d'accompagnement partagé par un formateur.
 * N'affiche rien s'il n'y en a pas.
 */
import { onMounted, ref } from 'vue'
import PlanAccompagnement from './PlanAccompagnement.vue'
import { getAnalysesAccompagnement } from '../../services/activites'
import { dateCourte } from '../../utils/dates'

const props = defineProps({
  tenantId: { type: Number, required: true },
})

const plan = ref(null)

onMounted(async () => {
  try {
    const plans = await getAnalysesAccompagnement(props.tenantId)
    plan.value = plans.find((p) => p.plan) ?? null
  } catch {
    // bloc facultatif : rien à afficher en cas d'erreur
  }
})
</script>

<template>
  <section v-if="plan" class="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-5 shadow-sm">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
        <i class="fa-solid fa-route mr-1.5 text-indigo-500"></i>Plan proposé par votre formateur
      </h2>
      <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
        {{ plan.formateur_nom }}, le {{ dateCourte(plan.date_partage) }}
      </span>
    </div>
    <PlanAccompagnement :plan="plan.plan" />
  </section>
</template>

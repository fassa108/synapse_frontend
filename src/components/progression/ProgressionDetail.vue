<script setup>
/**
 * ProgressionDetail — progression d'un apprenant dans sa promotion.
 *
 * - Jauges : compétences-niveaux validées / total, briefs validés / total
 * - Référentiel module par module : niveaux validés (définitifs) ou non
 * - Briefs assignés et leur état (validé, non validé, à évaluer…)
 *
 * Props :
 *   - progression : réponse de l'API (resume, modules, briefs)
 *   - lienBrief   : (id) => route vers le brief (selon le rôle)
 */
import { computed } from 'vue'
import JaugeProgression from './JaugeProgression.vue'
import { styleEtat } from '../../utils/evaluation'

const props = defineProps({
  progression: { type: Object, required: true },
  lienBrief:   { type: Function, required: true },
})

const r = computed(() => props.progression.resume)

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '')

const valideesDuModule = (m) => {
  const niveaux = m.competences.flatMap((c) => c.niveaux)
  return { validees: niveaux.filter((n) => n.valide).length, total: niveaux.length }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="grid gap-4 md:grid-cols-2">
      <JaugeProgression titre="Compétences validées" :valeur="r.competences_validees" :total="r.competences_total" couleur="#10b981" />
      <JaugeProgression titre="Briefs validés" :valeur="r.briefs_valides" :total="r.briefs_total" couleur="#6366f1" />
    </div>

    <div class="grid gap-6 lg:grid-cols-5">
      <!-- Référentiel -->
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
        <h2 class="mb-1 font-['Sora'] text-base font-semibold text-gray-900">Compétences</h2>
        <p class="mb-4 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Une compétence validée l'est définitivement.</p>
        <p v-if="!progression.modules.length" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
          Aucune compétence dans le référentiel de la formation.
        </p>
        <div class="flex flex-col gap-5">
          <div v-for="m in progression.modules" :key="m.id">
            <div class="mb-2 flex items-baseline justify-between gap-3">
              <h3 class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ m.nom }}</h3>
              <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                {{ valideesDuModule(m).validees }} / {{ valideesDuModule(m).total }}
              </span>
            </div>
            <ul class="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-100">
              <li v-for="c in m.competences" :key="c.id" class="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span class="min-w-40 flex-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ c.nom }}</span>
                <span
                  v-for="n in c.niveaux"
                  :key="n.competence_niveau"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold ring-1"
                  :class="n.valide ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-zinc-50 text-zinc-400 ring-zinc-200'"
                  :title="n.valide ? `Validé le ${formatDate(n.date_validation)}` : (n.description || 'Pas encore validé')"
                >
                  <i :class="n.valide ? 'fa-solid fa-check' : 'fa-regular fa-circle'" class="text-[9px]"></i>
                  {{ n.niveau }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Briefs -->
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 class="mb-4 font-['Sora'] text-base font-semibold text-gray-900">Briefs ({{ progression.briefs.length }})</h2>
        <p v-if="!progression.briefs.length" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Aucun brief assigné.</p>
        <ul class="flex flex-col gap-2">
          <li v-for="b in progression.briefs" :key="b.id">
            <RouterLink
              :to="lienBrief(b.id)"
              class="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-indigo-200"
            >
              <div class="min-w-0 flex-1 font-['Plus_Jakarta_Sans']">
                <p class="truncate text-sm font-medium text-gray-900">{{ b.titre }}</p>
                <p class="text-xs text-zinc-400">
                  <template v-if="b.nb_visees">{{ b.nb_acquises }} / {{ b.nb_visees }} compétence{{ b.nb_visees > 1 ? 's' : '' }} acquise{{ b.nb_acquises > 1 ? 's' : '' }}</template>
                  <template v-else>Sans compétence visée</template>
                </p>
              </div>
              <span class="shrink-0 rounded-full px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold ring-1" :class="styleEtat(b.statut).classes">
                {{ styleEtat(b.statut).libelle }}
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

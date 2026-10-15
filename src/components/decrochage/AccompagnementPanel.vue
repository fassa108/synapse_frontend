<script setup>
/**
 * Accompagnement d'un apprenant (formateur / admin) : signalement en cours,
 * analyse IA (diagnostic, suggestions, plan) et partage du plan.
 * Une analyse en cours est relue toutes les 4 s jusqu'à son résultat.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppButton from '../ui/AppButton.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import SignalementDecrochage from './SignalementDecrochage.vue'
import PlanAccompagnement from './PlanAccompagnement.vue'
import {
  demanderAnalyseAccompagnement,
  getAnalysesAccompagnement,
  partagerAnalyseAccompagnement,
} from '../../services/activites'
import { dateCourte } from '../../utils/dates'

const props = defineProps({
  tenantId: { type: Number, required: true },
  apprenantId: { type: Number, required: true },
  promotion: { type: Object, required: true }, // { id, nom, actif }
  decrochage: { type: Object, default: null }, // { niveau, signaux } ou null
})

const analyses = ref([])
const selection = ref(null)
const chargement = ref(true)
const envoi = ref(false)
const partage = ref(false)
const erreur = ref('')
let minuterie = null

const enCours = computed(() => analyses.value.some((a) => a.statut === 'EN_COURS'))
const analyse = computed(
  () => analyses.value.find((a) => a.id === selection.value) ?? analyses.value[0] ?? null,
)

const charger = async () => {
  analyses.value = await getAnalysesAccompagnement(props.tenantId, {
    apprenant: props.apprenantId,
    promotion: props.promotion.id,
  })
  if (enCours.value) suivre()
  else arreter()
}

const suivre = () => {
  if (minuterie) return
  minuterie = setInterval(async () => {
    try {
      await charger()
    } catch {
      arreter()
    }
  }, 4000)
}

const arreter = () => {
  clearInterval(minuterie)
  minuterie = null
}

const analyser = async () => {
  envoi.value = true
  erreur.value = ''
  try {
    const nouvelle = await demanderAnalyseAccompagnement(props.tenantId, props.apprenantId, props.promotion.id)
    analyses.value = [nouvelle, ...analyses.value]
    selection.value = nouvelle.id
    suivre()
  } catch (e) {
    erreur.value = e.response?.data?.detail ?? "Impossible de lancer l'analyse."
  } finally {
    envoi.value = false
  }
}

const partager = async () => {
  partage.value = true
  erreur.value = ''
  try {
    const maj = await partagerAnalyseAccompagnement(props.tenantId, analyse.value.id)
    Object.assign(analyse.value, maj)
  } catch (e) {
    erreur.value = e.response?.data?.detail ?? 'Impossible de partager le plan.'
  } finally {
    partage.value = false
  }
}

onMounted(async () => {
  try {
    await charger()
  } catch {
    erreur.value = 'Impossible de charger les analyses.'
  } finally {
    chargement.value = false
  }
})

onUnmounted(arreter)
</script>

<template>
  <section id="accompagnement" class="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Accompagnement</h2>
        <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
          L'IA analyse la situation de l'apprenant au regard des briefs et propose un plan.
        </p>
      </div>
      <AppButton
        icon="fa-solid fa-wand-magic-sparkles"
        :loading="envoi"
        :disabled="enCours || !promotion.actif"
        @click="analyser"
      >
        {{ analyses.length ? 'Nouvelle analyse' : "Analyser avec l'IA" }}
      </AppButton>
    </div>

    <!-- Signalement en cours -->
    <div class="mt-4 rounded-xl bg-slate-50 p-3">
      <p class="mb-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Situation actuelle
      </p>
      <SignalementDecrochage v-if="decrochage" :niveau="decrochage.niveau" :signaux="decrochage.signaux" detaille />
      <p v-else class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
        <i class="fa-solid fa-circle-check mr-1 text-emerald-500"></i>Aucun signal de décrochage.
      </p>
    </div>

    <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-4" />
    <p v-if="!promotion.actif" class="mt-4 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
      Promotion clôturée : plus de nouvelle analyse.
    </p>

    <div v-if="chargement" class="flex h-24 items-center justify-center text-zinc-400">
      <i class="fa-solid fa-circle-notch animate-spin text-xl"></i>
    </div>

    <template v-else-if="analyse">
      <!-- Historique -->
      <div v-if="analyses.length > 1" class="mt-4 flex flex-wrap gap-1.5">
        <button
          v-for="a in analyses"
          :key="a.id"
          type="button"
          class="rounded-md px-2 py-1 font-['Plus_Jakarta_Sans'] text-xs transition"
          :class="a.id === analyse.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-zinc-600 hover:bg-slate-200'"
          @click="selection = a.id"
        >
          {{ dateCourte(a.date_creation) }}
        </button>
      </div>

      <div v-if="analyse.statut === 'EN_COURS'" class="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <i class="fa-solid fa-circle-notch animate-spin text-indigo-500"></i>
        <p class="font-['Plus_Jakarta_Sans'] text-sm text-indigo-700">
          Analyse en cours… vous serez notifié quand elle sera prête.
        </p>
      </div>

      <InfoBanner v-else-if="analyse.statut === 'ECHEC'" variant="error" :message="analyse.erreur" class="mt-4" />

      <div v-else class="mt-4 flex flex-col gap-5">
        <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
          Analyse du {{ new Date(analyse.date_creation).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) }}
          <template v-if="analyse.demandee_par_nom">, demandée par {{ analyse.demandee_par_nom }}</template>
        </p>

        <div>
          <h3 class="mb-1.5 font-['Sora'] text-sm font-semibold text-gray-900">
            <i class="fa-solid fa-stethoscope mr-1.5 text-indigo-500"></i>Diagnostic
          </h3>
          <p class="font-['Plus_Jakarta_Sans'] text-sm leading-6 text-zinc-700">{{ analyse.contenu.diagnostic }}</p>
        </div>

        <div>
          <h3 class="mb-2 font-['Sora'] text-sm font-semibold text-gray-900">
            <i class="fa-solid fa-lightbulb mr-1.5 text-amber-500"></i>Suggestions pour vous
          </h3>
          <ul class="flex flex-col gap-2">
            <li
              v-for="(s, i) in analyse.contenu.suggestions_formateur"
              :key="i"
              class="rounded-lg border border-slate-100 p-3"
            >
              <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ s.action }}</p>
              <p class="font-['Plus_Jakarta_Sans'] text-sm leading-5 text-zinc-600">{{ s.detail }}</p>
            </li>
          </ul>
        </div>

        <div class="rounded-xl border border-indigo-100 p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-['Sora'] text-sm font-semibold text-gray-900">
              <i class="fa-solid fa-route mr-1.5 text-indigo-500"></i>Plan proposé à l'apprenant
            </h3>
            <span
              v-if="analyse.partagee"
              class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium text-emerald-700"
            >
              <i class="fa-solid fa-check text-[10px]"></i>Partagé le {{ dateCourte(analyse.date_partage) }}
            </span>
            <AppButton
              v-else
              variant="secondary"
              icon="fa-solid fa-share"
              :loading="partage"
              @click="partager"
            >
              Partager avec l'apprenant
            </AppButton>
          </div>
          <PlanAccompagnement :plan="analyse.contenu.plan_apprenant" />
        </div>
      </div>
    </template>
  </section>
</template>

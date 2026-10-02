<script setup>
/**
 * RevisionApprenantPage — passer un quiz ou lire une fiche (apprenant).
 *
 * Quiz : l'apprenant coche ses réponses puis valide ; la correction (bonnes
 * réponses, explications) arrive avec le score. Il peut recommencer
 * autant qu'il veut ; ses scores précédents sont listés.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import FicheCartes from '../../components/revision/FicheCartes.vue'
import { useAuthStore } from '../../stores/auth'
import { getSupport, getTentatives, envoyerTentative } from '../../services/revision'
import { libelleDifficulte, messageErreur } from '../../utils/revision'

const authStore = useAuthStore()
const route = useRoute()
const tenantId = authStore.tenantCourant?.id

const support = ref(null)
const tentatives = ref([])
const chargement = ref(true)
const erreur = ref('')
const envoi = ref(false)

// { [id question]: [ids options] } ; correction : résultat de la dernière tentative
const reponses = ref({})
const resultat = ref(null)

const estQuiz = computed(() => support.value?.type === 'QUIZ')
const correction = computed(() =>
  Object.fromEntries((resultat.value?.correction ?? []).map((c) => [c.question, c]))
)

onMounted(async () => {
  try {
    support.value = await getSupport(tenantId, route.params.id)
    if (estQuiz.value) tentatives.value = await getTentatives(tenantId, support.value.id)
  } catch {
    erreur.value = 'Révision introuvable.'
  } finally {
    chargement.value = false
  }
})

const cocher = (question, optionId) => {
  if (resultat.value) return
  const actuelles = reponses.value[question.id] ?? []
  if (question.type === 'CHOIX_UNIQUE') {
    reponses.value[question.id] = [optionId]
  } else {
    reponses.value[question.id] = actuelles.includes(optionId)
      ? actuelles.filter((id) => id !== optionId)
      : [...actuelles, optionId]
  }
}

const estCochee = (question, optionId) => (reponses.value[question.id] ?? []).includes(optionId)
const toutRepondu = computed(() => support.value?.questions.every((q) => reponses.value[q.id]?.length))

const valider = async () => {
  envoi.value = true
  erreur.value = ''
  try {
    const payload = support.value.questions.map((q) => ({ question: q.id, options: reponses.value[q.id] ?? [] }))
    resultat.value = await envoyerTentative(tenantId, support.value.id, payload)
    tentatives.value = [resultat.value, ...tentatives.value]
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    erreur.value = messageErreur(e, 'Vos réponses n\'ont pas pu être envoyées.')
  } finally {
    envoi.value = false
  }
}

const recommencer = () => {
  reponses.value = {}
  resultat.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Couleur d'une option après correction
const etatOption = (question, optionId) => {
  const c = correction.value[question.id]
  if (!c) return estCochee(question, optionId) ? 'cochee' : ''
  const bonne = c.bonnes_options.includes(optionId)
  const cochee = c.options_cochees.includes(optionId)
  if (bonne) return 'bonne'
  if (cochee) return 'fausse'
  return ''
}

const questionJuste = (question) => {
  const c = correction.value[question.id]
  if (!c) return null
  const a = [...c.options_cochees].sort().join()
  const b = [...c.bonnes_options].sort().join()
  return a === b
}

const formatDate = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-3xl p-6 lg:p-8">
      <RouterLink to="/mes-revisions" class="mb-4 inline-flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500 hover:text-indigo-600">
        <i class="fa-solid fa-arrow-left"></i> Révisions
      </RouterLink>

      <p v-if="chargement" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>Chargement…
      </p>
      <InfoBanner v-else-if="!support" variant="error" :message="erreur" />

      <template v-else>
        <PageHeader
          :titre="support.titre"
          :description="`${support.module_nom} · ${estQuiz ? `Quiz ${libelleDifficulte(support.difficulte).toLowerCase()} · ${support.questions.length} questions` : 'Fiche de révision'}`"
        />

        <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-4" />

        <!-- ─── Fiche ─── -->
        <div v-if="!estQuiz" class="mt-6">
          <FicheCartes :contenu="support.contenu" />
        </div>

        <!-- ─── Quiz ─── -->
        <template v-else>
          <div
            v-if="resultat"
            class="mt-6 flex flex-col items-center gap-2 rounded-2xl border p-6 text-center"
            :class="resultat.score === resultat.total ? 'border-emerald-200 bg-emerald-50' : 'border-indigo-100 bg-indigo-50/60'"
          >
            <span class="font-['Sora'] text-3xl font-semibold text-gray-900">{{ resultat.score }} / {{ resultat.total }}</span>
            <span class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">
              {{ resultat.score === resultat.total ? 'Parfait, toutes les réponses sont justes !' : 'Relisez la correction ci-dessous, puis réessayez.' }}
            </span>
            <AppButton class="mt-2" variant="secondary" icon="fa-solid fa-rotate-right" @click="recommencer">Recommencer</AppButton>
          </div>

          <ol class="mt-6 flex flex-col gap-4">
            <li v-for="(q, i) in support.questions" :key="q.id" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-start gap-3">
                <span
                  class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-['Sora'] text-xs font-semibold"
                  :class="questionJuste(q) === null ? 'bg-indigo-50 text-indigo-600' : questionJuste(q) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                >{{ i + 1 }}</span>
                <div class="min-w-0 flex-1">
                  <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ q.intitule }}</p>
                  <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                    {{ q.type === 'CHOIX_UNIQUE' ? 'Une seule bonne réponse' : 'Plusieurs bonnes réponses possibles' }}
                  </p>

                  <div class="mt-3 flex flex-col gap-2">
                    <button
                      v-for="o in q.options" :key="o.id" type="button" :disabled="!!resultat"
                      class="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left font-['Plus_Jakarta_Sans'] text-sm transition"
                      :class="{
                        'border-indigo-500 bg-indigo-50 text-indigo-800': etatOption(q, o.id) === 'cochee',
                        'border-emerald-400 bg-emerald-50 text-emerald-800': etatOption(q, o.id) === 'bonne',
                        'border-red-300 bg-red-50 text-red-700': etatOption(q, o.id) === 'fausse',
                        'border-slate-200 text-zinc-700 hover:bg-slate-50': !etatOption(q, o.id) && !resultat,
                        'border-slate-200 text-zinc-500': !etatOption(q, o.id) && resultat,
                      }"
                      @click="cocher(q, o.id)"
                    >
                      <span
                        class="flex h-5 w-5 shrink-0 items-center justify-center border text-[10px]"
                        :class="[q.type === 'CHOIX_UNIQUE' ? 'rounded-full' : 'rounded-md', estCochee(q, o.id) || (resultat && correction[q.id]?.options_cochees.includes(o.id)) ? 'border-current bg-current' : 'border-slate-300']"
                      >
                        <i v-if="estCochee(q, o.id)" class="fa-solid fa-check text-white"></i>
                      </span>
                      <span class="flex-1">{{ o.texte }}</span>
                      <i v-if="etatOption(q, o.id) === 'bonne'" class="fa-solid fa-circle-check text-emerald-500"></i>
                      <i v-else-if="etatOption(q, o.id) === 'fausse'" class="fa-solid fa-circle-xmark text-red-500"></i>
                    </button>
                  </div>

                  <p v-if="correction[q.id]?.explication" class="mt-3 rounded-xl bg-slate-50 px-3 py-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-600">
                    <i class="fa-solid fa-circle-info mr-1 text-zinc-400"></i>{{ correction[q.id].explication }}
                  </p>
                </div>
              </div>
            </li>
          </ol>

          <div v-if="!resultat" class="mt-6 flex items-center justify-end gap-3">
            <span v-if="!toutRepondu" class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Une question sans réponse compte comme fausse.</span>
            <AppButton icon="fa-solid fa-paper-plane" :loading="envoi" @click="valider">Valider mes réponses</AppButton>
          </div>

          <!-- Historique -->
          <div v-if="tentatives.length" class="mt-8">
            <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Mes tentatives</h2>
            <ul class="mt-2 flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              <li v-for="t in tentatives" :key="t.id" class="flex items-center justify-between px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm">
                <span class="text-zinc-500">{{ formatDate(t.date) }}</span>
                <span class="font-semibold" :class="t.score === t.total ? 'text-emerald-600' : 'text-zinc-700'">{{ t.score }} / {{ t.total }}</span>
              </li>
            </ul>
          </div>
        </template>
      </template>
    </div>
  </AppLayout>
</template>

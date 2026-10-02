<script setup>
/**
 * RevisionPage — quiz et fiches de révision d'un module (formateur, admin).
 *
 * Par module : trois quiz (un par difficulté) et deux fiches au plus.
 * - Formateur : génère ; le créateur relit, publie, supprime.
 * - Admin organisme : consultation.
 * La page se rafraîchit tant qu'une génération est en cours.
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import GenerationModal from '../../components/revision/GenerationModal.vue'
import { useAuthStore } from '../../stores/auth'
import { getFormations, getModules } from '../../services/pedagogie'
import { getSupports, publierSupport, supprimerSupport } from '../../services/revision'
import { DIFFICULTES, NB_FICHES_MAX, STATUTS, messageErreur } from '../../utils/revision'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const tenantId = authStore.tenantCourant?.id
const estFormateur = computed(() => authStore.role === 'FORMATEUR')

const modules = ref([])
const formations = ref({})
const moduleId = ref(route.query.module ? String(route.query.module) : '')
const supports = ref([])
const chargement = ref(true)
const erreur = ref('')
const succes = ref('')

const moduleCourant = computed(() => modules.value.find((m) => String(m.id) === moduleId.value))
const optionsModules = computed(() =>
  modules.value.map((m) => ({
    value: String(m.id),
    label: formations.value[m.formation] ? `${formations.value[m.formation]} — ${m.nom}` : m.nom,
  }))
)

const quizPar = (difficulte) => supports.value.find((s) => s.type === 'QUIZ' && s.difficulte === difficulte)
const fiches = computed(() => supports.value.filter((s) => s.type === 'FICHE'))

// ─── Chargement et rafraîchissement ───────────────────────────────────────────
let minuterie = null

const charger = async () => {
  if (!moduleId.value) {
    supports.value = []
    return
  }
  supports.value = await getSupports(tenantId, { module: moduleId.value })
}

const suivreGenerations = () => {
  clearInterval(minuterie)
  minuterie = null
  if (supports.value.some((s) => s.statut === 'EN_COURS')) {
    minuterie = setInterval(async () => {
      try {
        await charger()
      } catch {
        /* nouvel essai au prochain tour */
      }
      if (!supports.value.some((s) => s.statut === 'EN_COURS')) {
        clearInterval(minuterie)
        minuterie = null
      }
    }, 4000)
  }
}

onMounted(async () => {
  try {
    const [listeModules, listeFormations] = await Promise.all([getModules(tenantId), getFormations(tenantId)])
    formations.value = Object.fromEntries(listeFormations.map((f) => [f.id, f.nom]))
    modules.value = listeModules.filter((m) => m.actif)
    if (!moduleId.value && modules.value.length) moduleId.value = String(modules.value[0].id)
    await charger()
    suivreGenerations()
  } catch {
    erreur.value = 'Impossible de charger les modules.'
  } finally {
    chargement.value = false
  }
})

onBeforeUnmount(() => clearInterval(minuterie))

watch(moduleId, async (id) => {
  router.replace({ query: id ? { module: id } : {} })
  succes.value = ''
  erreur.value = ''
  try {
    await charger()
    suivreGenerations()
  } catch {
    erreur.value = 'Impossible de charger les supports de ce module.'
  }
})

// ─── Génération ───────────────────────────────────────────────────────────────
const generation = ref(null) // { type, difficulte }

const ouvrirGeneration = (type, difficulte = '') => {
  succes.value = ''
  generation.value = { type, difficulte }
}

const generationLancee = (support) => {
  generation.value = null
  supports.value = [...supports.value, support]
  succes.value = 'Génération lancée : le contenu arrivera en brouillon dans quelques instants.'
  suivreGenerations()
}

// ─── Publication et suppression ───────────────────────────────────────────────
const enCours = ref(null)

const publier = async (support) => {
  enCours.value = support.id
  erreur.value = ''
  try {
    await publierSupport(tenantId, support.id)
    await charger()
    succes.value = 'Publié : les apprenants ayant déposé sur ce module y ont maintenant accès.'
  } catch (e) {
    erreur.value = messageErreur(e, 'La publication a échoué.')
  } finally {
    enCours.value = null
  }
}

const aSupprimer = ref(null)
const suppressionErreur = ref('')

const supprimer = async () => {
  enCours.value = aSupprimer.value.id
  suppressionErreur.value = ''
  try {
    await supprimerSupport(tenantId, aSupprimer.value.id)
    supports.value = supports.value.filter((s) => s.id !== aSupprimer.value.id)
    aSupprimer.value = null
    succes.value = 'Supprimé.'
  } catch (e) {
    suppressionErreur.value = messageErreur(e, 'La suppression a échoué.')
  } finally {
    enCours.value = null
  }
}

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—')
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        titre="Révision"
        description="Quiz et fiches de révision générés par IA à partir de vos supports, relus avant publication."
      />

      <div class="mt-5 max-w-md">
        <AppSelect v-model="moduleId" :options="optionsModules" placeholder="Choisir un module" :disabled="chargement" />
      </div>

      <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-4" />
      <InfoBanner v-if="succes" variant="success" :message="succes" class="mt-4" />

      <p v-if="chargement" class="mt-6 font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>Chargement…
      </p>
      <p v-else-if="!modules.length" class="mt-6 font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
        Aucun module dans les formations de vos promotions.
      </p>

      <template v-else-if="moduleCourant">
        <!-- Quiz : un par difficulté -->
        <h2 class="mt-8 font-['Sora'] text-base font-semibold text-gray-900">Quiz</h2>
        <div class="mt-3 grid gap-4 md:grid-cols-3">
          <div
            v-for="d in DIFFICULTES" :key="d.value"
            class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <i :class="d.icone" class="text-indigo-500"></i>{{ d.label }}
            </div>

            <template v-if="quizPar(d.value)">
              <div class="mt-3 flex flex-1 flex-col gap-2">
                <span :class="STATUTS[quizPar(d.value).statut].classes" class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium">
                  <i :class="STATUTS[quizPar(d.value).statut].icone"></i>{{ STATUTS[quizPar(d.value).statut].label }}
                </span>
                <RouterLink
                  v-if="['BROUILLON', 'PUBLIE'].includes(quizPar(d.value).statut)"
                  :to="`/revision/${quizPar(d.value).id}`"
                  class="font-['Sora'] text-sm font-semibold text-indigo-600 hover:underline"
                >
                  {{ quizPar(d.value).titre }}
                </RouterLink>
                <p v-if="quizPar(d.value).statut === 'ECHEC'" class="font-['Plus_Jakarta_Sans'] text-xs text-red-600">
                  {{ quizPar(d.value).erreur }}
                </p>
                <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                  {{ quizPar(d.value).questions.length || quizPar(d.value).nb_questions }} questions ·
                  {{ quizPar(d.value).cree_par_nom ?? '—' }} · {{ formatDate(quizPar(d.value).date_creation) }}
                </p>
              </div>
              <div v-if="quizPar(d.value).est_proprietaire" class="mt-4 flex gap-2">
                <AppButton
                  v-if="quizPar(d.value).statut === 'BROUILLON'" icon="fa-solid fa-check"
                  :loading="enCours === quizPar(d.value).id" @click="publier(quizPar(d.value))"
                >Publier</AppButton>
                <AppButton variant="ghost" icon="fa-solid fa-trash" :disabled="enCours === quizPar(d.value).id" @click="aSupprimer = quizPar(d.value)">
                  Supprimer
                </AppButton>
              </div>
            </template>

            <template v-else>
              <p class="mt-3 flex-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Pas encore de quiz {{ d.label.toLowerCase() }}.</p>
              <AppButton v-if="estFormateur" class="mt-4" variant="secondary" icon="fa-solid fa-wand-magic-sparkles" @click="ouvrirGeneration('QUIZ', d.value)">
                Générer
              </AppButton>
            </template>
          </div>
        </div>

        <!-- Fiches : deux au plus -->
        <div class="mt-8 flex items-center justify-between">
          <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
            Fiches de révision <span class="font-['Plus_Jakarta_Sans'] text-sm font-normal text-zinc-400">{{ fiches.length }} / {{ NB_FICHES_MAX }}</span>
          </h2>
          <AppButton
            v-if="estFormateur && fiches.length < NB_FICHES_MAX"
            variant="secondary" icon="fa-solid fa-wand-magic-sparkles" @click="ouvrirGeneration('FICHE')"
          >Générer une fiche</AppButton>
        </div>
        <div class="mt-3 grid gap-4 md:grid-cols-2">
          <div v-for="f in fiches" :key="f.id" class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span :class="STATUTS[f.statut].classes" class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium">
              <i :class="STATUTS[f.statut].icone"></i>{{ STATUTS[f.statut].label }}
            </span>
            <RouterLink
              v-if="['BROUILLON', 'PUBLIE'].includes(f.statut)" :to="`/revision/${f.id}`"
              class="mt-2 font-['Sora'] text-sm font-semibold text-indigo-600 hover:underline"
            >{{ f.titre }}</RouterLink>
            <p v-if="f.statut === 'ECHEC'" class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-red-600">{{ f.erreur }}</p>
            <p class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ f.cree_par_nom ?? '—' }} · {{ formatDate(f.date_creation) }}</p>
            <div v-if="f.est_proprietaire" class="mt-4 flex gap-2">
              <AppButton v-if="f.statut === 'BROUILLON'" icon="fa-solid fa-check" :loading="enCours === f.id" @click="publier(f)">Publier</AppButton>
              <AppButton variant="ghost" icon="fa-solid fa-trash" :disabled="enCours === f.id" @click="aSupprimer = f">Supprimer</AppButton>
            </div>
          </div>
          <p v-if="!fiches.length" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Pas encore de fiche pour ce module.</p>
        </div>
      </template>
    </div>

    <GenerationModal
      v-if="generation && moduleCourant"
      :tenant-id="tenantId" :module="moduleCourant" :type="generation.type" :difficulte="generation.difficulte"
      @fermer="generation = null" @genere="generationLancee"
    />

    <!-- Suppression -->
    <Teleport to="body">
      <div v-if="aSupprimer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" @click.self="enCours || (aSupprimer = null)">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Supprimer</h2>
          </div>
          <div class="flex flex-col gap-4 px-6 py-5">
            <InfoBanner v-if="suppressionErreur" variant="error" :message="suppressionErreur" />
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
              Supprimer « {{ aSupprimer.titre || (aSupprimer.type === 'QUIZ' ? 'ce quiz' : 'cette fiche') }} » ?
              <template v-if="aSupprimer.type === 'QUIZ' && aSupprimer.statut === 'PUBLIE'">Les résultats des apprenants seront aussi supprimés.</template>
              Vous pourrez ensuite en générer un autre.
            </p>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="!!enCours" @click="aSupprimer = null">Annuler</AppButton>
              <AppButton variant="danger" :loading="!!enCours" @click="supprimer">Supprimer</AppButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

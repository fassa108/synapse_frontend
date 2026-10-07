<script setup>
/**
 * ActiviteDetailPage — Apprenant : contenu d'un brief, compétences
 * visées (avec ce qui est attendu au niveau visé), ressources ; dépôt et
 * historique de ses dépôts ; travaux des pairs une fois qu'il a déposé.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import TexteRiche from '../../components/texte-riche/TexteRiche.vue'
import DepotCarte from '../../components/livrables/DepotCarte.vue'
import FormulaireDepot from '../../components/livrables/FormulaireDepot.vue'
import VisionneuseFichier from '../../components/fichiers/VisionneuseFichier.vue'
import EvaluationCarte from '../../components/evaluations/EvaluationCarte.vue'
import CommentairesRendu from '../../components/commentaires/CommentairesRendu.vue'
import { styleEtat, etatRendu, estTermine } from '../../utils/evaluation'
import { SECTIONS_BRIEF } from '../../utils/brief'
import { useAuthStore } from '../../stores/auth'
import {
  getBrief,
  getRessources,
  telechargerRessource,
  getAssignations,
  getCategories,
  getLivrables,
  getEvaluations,
  getCommentaires,
} from '../../services/activites'
import { getModule, getCompetences, getCompetenceNiveaux, getNiveaux } from '../../services/pedagogie'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
const briefId   = route.params.id

const brief        = ref(null)
const module_      = ref(null)
const competences  = ref([])
const cns          = ref([])
const niveaux      = ref([])
const ressources   = ref([])
const assignations = ref([])
const categorie    = ref(null)
const livrables    = ref([])
const evaluations  = ref([]) // de la plus récente à la plus ancienne
const voirAnciennes = ref(false)
const commentaires = ref([])
const loading      = ref(true)
const error        = ref('')
const depotSucces  = ref('')

const chargerCommentaires = async () => {
  commentaires.value = await getCommentaires(tenantId, { brief: briefId })
}
const commentairesDe = (assignationId) => commentaires.value.filter((c) => c.assignation === assignationId)

const chargerLivrables = async () => {
  livrables.value = await getLivrables(tenantId, { brief: briefId })
}

onMounted(async () => {
  try {
    brief.value = await getBrief(tenantId, briefId)
    const [mod, comps, cnList, nivs, ress, ass, cats] = await Promise.all([
      getModule(tenantId, brief.value.module),
      getCompetences(tenantId),
      getCompetenceNiveaux(tenantId),
      getNiveaux(tenantId),
      getRessources(tenantId),
      getAssignations(tenantId, { brief: briefId }),
      getCategories(tenantId),
      chargerLivrables(),
      getEvaluations(tenantId, { brief: briefId }).then((e) => { evaluations.value = e }),
      chargerCommentaires(),
    ])
    categorie.value = cats.find((c) => c.id === brief.value.categorie) ?? null
    module_.value = mod
    competences.value = comps
    cns.value = cnList
    niveaux.value = nivs
    ressources.value = ress.filter((r) => brief.value.ressources.includes(r.id))
    assignations.value = ass
  } catch {
    error.value = 'Activité introuvable.'
  } finally {
    loading.value = false
  }
})

const estAssigne = computed(() => assignations.value.length > 0)

// Évaluation de son rendu : la plus récente fait foi
// Commentaires : brief ouvert et après son propre dépôt
const peutEchanger = computed(() => brief.value?.statut === 'PUBLIE' && mesDepots.value.length > 0)

const derniereEvaluation = computed(() => evaluations.value[0] ?? null)
const etatEvaluation = computed(() => styleEtat(etatRendu(derniereEvaluation.value, mesDepots.value)))
// Un apprenant n'est assigné qu'une fois à un brief (directement ou via un groupe)
const monAssignation = computed(() => assignations.value[0] ?? null)

const mesDepots = computed(() =>
  livrables.value.filter((l) => l.assignation === monAssignation.value?.id)
)
// Renvoyés par l'API seulement après son propre dépôt : dernier dépôt de chacun
const depotsDesPairs = computed(() =>
  livrables.value.filter((l) => l.assignation !== monAssignation.value?.id)
)

// État des dépôts pour ce brief
const maintenant = new Date()
const etatDepot = computed(() => {
  if (!brief.value) return null
  if (brief.value.statut === 'ARCHIVE') return { ouvert: false, message: 'Ce brief est archivé : les dépôts sont fermés.' }
  if (estTermine(derniereEvaluation.value, mesDepots.value)) {
    return { ouvert: false, message: "Ce rendu est validé : il n'est plus possible de déposer." }
  }
  if (new Date(brief.value.date_debut) > maintenant) {
    return { ouvert: false, message: `Les dépôts ouvrent le ${formatDate(brief.value.date_debut)}.` }
  }
  return { ouvert: true, enRetard: new Date(brief.value.date_limite) < maintenant }
})

const apresDepot = async () => {
  await Promise.all([chargerLivrables(), chargerCommentaires()])
  depotSucces.value = 'Votre dépôt a bien été enregistré.'
}

const competencesVisees = computed(() =>
  (brief.value?.competence_niveaux ?? [])
    .map((id) => cns.value.find((cn) => cn.id === id))
    .filter(Boolean)
    .map((cn) => ({
      ...cn,
      competence: competences.value.find((c) => c.id === cn.competence),
      niveau: niveaux.value.find((n) => n.id === cn.niveau),
    }))
)

// Fichier : consultation dans la plateforme ; lien : nouvel onglet
const ressourceConsultee = ref(null)
const fichierRessource = computed(() =>
  ressourceConsultee.value && {
    chemin: `ressources/${ressourceConsultee.value.id}`,
    nom: `${ressourceConsultee.value.titre}.${ressourceConsultee.value.extension}`,
    extension: ressourceConsultee.value.extension,
  }
)
const ouvrirRessource = (r) => {
  if (r.url) {
    window.open(r.url, '_blank', 'noopener')
    return
  }
  ressourceConsultee.value = r
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="!brief" variant="error" :message="error" />

      <template v-else>
        <PageHeader
          :titre="brief.titre"
          :description="[categorie?.nom, module_ ? `Module : ${module_.nom}` : ''].filter(Boolean).join(' · ')"
        >
          <template #actions>
            <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="router.push('/activites')">Mes activités</AppButton>
          </template>
        </PageHeader>

        <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />
        <InfoBanner
          :variant="estAssigne ? 'success' : 'info'"
          class="mt-6"
          :message="estAssigne
            ? 'Ce brief vous est assigné.'
            : 'Ce brief ne vous est pas assigné : vous pouvez le consulter, mais pas y déposer de livrable.'"
        />

        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="flex flex-col gap-6 lg:col-span-2">
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="mb-2 font-['Sora'] text-base font-semibold text-gray-900">Description</h2>
              <p class="whitespace-pre-line font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ brief.description }}</p>
              <!-- Sections : le titre reste affiché même si le contenu est vide -->
              <section v-for="s in SECTIONS_BRIEF" :key="s.cle" class="mt-6 border-t border-slate-100 pt-5">
                <h2 class="mb-2 font-['Sora'] text-base font-semibold text-gray-900">{{ s.titre }}</h2>
                <TexteRiche :html="brief[s.cle]" />
              </section>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-base font-semibold text-gray-900">Ce qui est attendu</h2>
              <p v-if="competencesVisees.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Aucune compétence visée.
              </p>
              <ul class="flex flex-col gap-3">
                <li v-for="cv in competencesVisees" :key="cv.id" class="flex items-start gap-3">
                  <span class="mt-0.5 rounded-full bg-indigo-50 px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-indigo-700">
                    {{ cv.niveau?.nom }}
                  </span>
                  <div>
                    <p class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">{{ cv.competence?.nom }}</p>
                    <p v-if="cv.description" class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ cv.description }}</p>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Évaluation -->
            <div v-if="derniereEvaluation" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="mb-4 flex items-center justify-between gap-3">
                <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Évaluation</h2>
                <span class="rounded-full px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold ring-1" :class="etatEvaluation.classes">
                  {{ etatEvaluation.libelle }}
                </span>
              </div>
              <EvaluationCarte :evaluation="derniereEvaluation" />
              <template v-if="evaluations.length > 1">
                <button
                  type="button"
                  class="mt-3 font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline"
                  @click="voirAnciennes = !voirAnciennes"
                >
                  {{ voirAnciennes ? 'Masquer' : 'Voir' }} les évaluations précédentes ({{ evaluations.length - 1 }})
                </button>
                <div v-if="voirAnciennes" class="mt-3 flex flex-col gap-3">
                  <EvaluationCarte v-for="e in evaluations.slice(1)" :key="e.id" :evaluation="e" ancienne />
                </div>
              </template>
            </div>

            <!-- Mes dépôts -->
            <div v-if="estAssigne" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-base font-semibold text-gray-900">Mes dépôts ({{ mesDepots.length }})</h2>
              <InfoBanner v-if="depotSucces" variant="success" :message="depotSucces" class="mb-4" />

              <InfoBanner v-if="!etatDepot.ouvert" variant="info" :message="etatDepot.message" class="mb-4" />
              <div v-else class="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                <p class="mb-3 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">
                  {{ mesDepots.length ? 'Nouveau dépôt' : 'Déposer mon travail' }}
                </p>
                <FormulaireDepot :assignation="monAssignation.id" :en-retard="etatDepot.enRetard" @depose="apresDepot" />
              </div>

              <p v-if="mesDepots.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Aucun dépôt pour le moment.
              </p>
              <div class="flex flex-col gap-3">
                <DepotCarte v-for="d in mesDepots" :key="d.id" :depot="d" />
              </div>
              <CommentairesRendu
                v-if="mesDepots.length"
                class="mt-5 border-t border-slate-100 pt-4"
                titre="Commentaires reçus"
                :assignation="monAssignation.id"
                :commentaires="commentairesDe(monAssignation.id)"
                :peut-repondre="peutEchanger"
                @change="chargerCommentaires"
              />
            </div>

            <!-- Travaux des pairs : visibles après son propre dépôt -->
            <div v-if="estAssigne" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="mb-1 font-['Sora'] text-base font-semibold text-gray-900">Travaux de la promotion</h2>
              <p v-if="mesDepots.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Les travaux des autres apprenants seront visibles après votre premier dépôt.
              </p>
              <template v-else>
                <p class="mb-4 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Dernier dépôt de chacun.</p>
                <p v-if="depotsDesPairs.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                  Personne d'autre n'a encore déposé.
                </p>
                <div class="flex flex-col gap-3">
                  <div v-for="d in depotsDesPairs" :key="d.id" class="flex flex-col gap-3 rounded-2xl bg-slate-50/60 p-2">
                    <DepotCarte :depot="d" afficher-cible />
                    <CommentairesRendu
                      class="px-2 pb-2"
                      :assignation="d.assignation"
                      :commentaires="commentairesDe(d.assignation)"
                      :peut-commenter="peutEchanger"
                      :peut-repondre="peutEchanger"
                      @change="chargerCommentaires"
                    />
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div class="flex flex-col gap-6">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Dates</h2>
                <StatusBadge :value="brief.statut" type="brief" />
              </div>
              <dl class="flex flex-col gap-3 font-['Plus_Jakarta_Sans']">
                <div><dt class="text-xs text-zinc-400">Début</dt><dd class="text-sm text-zinc-700">{{ formatDate(brief.date_debut) }}</dd></div>
                <div><dt class="text-xs text-zinc-400">Date limite</dt><dd class="text-sm text-zinc-700">{{ formatDate(brief.date_limite) }}</dd></div>
              </dl>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-3 font-['Sora'] text-sm font-semibold text-gray-900">Ressources</h2>
              <p v-if="ressources.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Aucune ressource.</p>
              <ul class="flex flex-col gap-2">
                <li v-for="r in ressources" :key="r.id">
                  <button type="button" class="flex items-center gap-2 text-left font-['Plus_Jakarta_Sans'] text-sm text-indigo-600 hover:underline" @click="ouvrirRessource(r)">
                    <i :class="r.url ? 'fa-solid fa-link' : 'fa-solid fa-eye'" class="text-xs"></i>
                    {{ r.titre }}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </template>
    </div>

    <VisionneuseFichier
      :fichier="fichierRessource"
      :telecharger="() => telechargerRessource(tenantId, ressourceConsultee)"
      @fermer="ressourceConsultee = null"
    />
  </AppLayout>
</template>

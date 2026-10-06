<script setup>
/**
 * BriefDetailPage
 *
 * - Formateur (promotion ouverte) : publier / archiver, modifier et supprimer
 *   tant qu'il n'y a pas de livrable, assigner à un apprenant ou un groupe.
 * - Suivi des rendus : pour chaque assignation, Non rendu / Rendu / Rendu en
 *   retard, nombre de dépôts, dernier dépôt, et historique au clic.
 * - Admin Organisme, ou promotion clôturée : consultation seule.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import TexteRiche from '../../components/texte-riche/TexteRiche.vue'
import DepotCarte from '../../components/livrables/DepotCarte.vue'
import VisionneuseFichier from '../../components/fichiers/VisionneuseFichier.vue'
import EvaluationCarte from '../../components/evaluations/EvaluationCarte.vue'
import FormulaireEvaluation from '../../components/evaluations/FormulaireEvaluation.vue'
import CommentairesRendu from '../../components/commentaires/CommentairesRendu.vue'
import { styleEtat, etatRendu, dernieresParAssignation } from '../../utils/evaluation'
import { SECTIONS_BRIEF } from '../../utils/brief'
import { useAuthStore } from '../../stores/auth'
import {
  getBrief,
  modifierBrief,
  supprimerBrief,
  getRessources,
  getCategories,
  telechargerRessource,
  getAssignations,
  assignerPlusieurs,
  supprimerAssignation,
  getLivrables,
  getEvaluations,
  getCommentaires,
} from '../../services/activites'
import {
  getPromotion,
  getModule,
  getCompetences,
  getCompetenceNiveaux,
  getNiveaux,
  getInscriptions,
  getGroupes,
} from '../../services/pedagogie'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
const briefId   = route.params.id

const brief        = ref(null)
const promotion    = ref(null)
const module_      = ref(null)
const competences  = ref([])
const cns          = ref([])
const niveaux      = ref([])
const ressources   = ref([])
const categorie    = ref(null)
const assignations = ref([])
const inscriptions = ref([])
const groupes      = ref([])
const livrables    = ref([])
const evaluations  = ref([])
const commentaires = ref([])
const loading      = ref(true)
const error        = ref('')
const pageSuccess  = ref('')
const actionError  = ref('')

const estFormateur = computed(() => authStore.role === 'FORMATEUR')
const peutGerer    = computed(() => estFormateur.value && promotion.value?.actif)

onMounted(async () => {
  try {
    brief.value = await getBrief(tenantId, briefId)
    const [promo, mod, comps, cnList, nivs, ress, ass, ins, grps, cats] = await Promise.all([
      getPromotion(tenantId, brief.value.promotion),
      getModule(tenantId, brief.value.module),
      getCompetences(tenantId),
      getCompetenceNiveaux(tenantId),
      getNiveaux(tenantId),
      getRessources(tenantId),
      getAssignations(tenantId, { brief: briefId }),
      getInscriptions(tenantId, brief.value.promotion, { actif: 'true' }),
      getGroupes(tenantId, { promotion: brief.value.promotion }),
      getCategories(tenantId),
      getLivrables(tenantId, { brief: briefId }).then((l) => { livrables.value = l }),
      getEvaluations(tenantId, { brief: briefId }).then((e) => { evaluations.value = e }),
      chargerCommentaires(),
    ])
    categorie.value = cats.find((c) => c.id === brief.value.categorie) ?? null
    promotion.value = promo
    module_.value = mod
    competences.value = comps
    cns.value = cnList
    niveaux.value = nivs
    ressources.value = ress.filter((r) => brief.value.ressources.includes(r.id))
    assignations.value = ass
    inscriptions.value = ins
    groupes.value = grps
  } catch {
    error.value = 'Impossible de charger le brief.'
  } finally {
    loading.value = false
  }
})

const premier = (v) => (Array.isArray(v) ? v[0] : v)
const messageErreur = (e, defaut) => {
  const d = e.response?.data
  return d?.detail || premier(d?.non_field_errors) || premier(d?.apprenant) || premier(d?.groupe) || premier(d?.brief)
    || premier(d?.date_limite) || premier(d?.statut) || (Array.isArray(d) || typeof d === 'string' ? premier(d) : '') || defaut
}

// ─── Compétences visées ───────────────────────────────────────────────────────
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

// ─── Statut ───────────────────────────────────────────────────────────────────
const statutLoading = ref(false)

const changerStatut = async (statut, message) => {
  statutLoading.value = true
  actionError.value = ''
  pageSuccess.value = ''
  try {
    brief.value = await modifierBrief(tenantId, briefId, { statut })
    pageSuccess.value = message
  } catch (e) {
    actionError.value = messageErreur(e, 'Impossible de changer le statut.')
  } finally {
    statutLoading.value = false
  }
}

// ─── Assignations ─────────────────────────────────────────────────────────────
// Un apprenant n'est assigné qu'une fois à un brief : directement OU via un
// seul groupe. Les choix déjà couverts ne sont pas proposés, et les conflits
// à l'intérieur de la sélection sont signalés avant l'envoi.
const onglet          = ref('apprenant') // 'apprenant' | 'groupe'
const recherche       = ref('')
const selApprenants   = ref([])
const selGroupes      = ref([])
const ajoutLoading    = ref(false)
const erreursAjout    = ref([])

const nomApprenant = (id) => {
  const i = inscriptions.value.find((x) => x.apprenant === id)
  return i ? `${i.apprenant_prenom} ${i.apprenant_nom}` : `Apprenant #${id}`
}
const nomGroupe = (id) => groupes.value.find((g) => g.id === id)?.nom ?? `Groupe #${id}`

const membresActifs = (groupeId) =>
  groupes.value.find((g) => g.id === groupeId)?.membres.filter((m) => m.actif).map((m) => m.apprenant) ?? []

const assignesIndividuellement = computed(
  () => new Set(assignations.value.map((a) => a.apprenant).filter(Boolean))
)
const couvertsParUnGroupe = computed(
  () => new Set(assignations.value.filter((a) => a.groupe).flatMap((a) => membresActifs(a.groupe)))
)
const dejaCouverts = computed(
  () => new Set([...assignesIndividuellement.value, ...couvertsParUnGroupe.value])
)

const apprenantsDisponibles = computed(() =>
  inscriptions.value
    .filter((i) => !dejaCouverts.value.has(i.apprenant))
    .map((i) => ({ id: i.apprenant, nom: `${i.apprenant_prenom} ${i.apprenant_nom}`, detail: i.apprenant_email }))
)
const groupesDisponibles = computed(() => {
  const deja = new Set(assignations.value.map((a) => a.groupe).filter(Boolean))
  return groupes.value
    .filter((g) => g.actif && !deja.has(g.id))
    .filter((g) => !membresActifs(g.id).some((id) => dejaCouverts.value.has(id)))
    .map((g) => ({ id: g.id, nom: g.nom, detail: `${g.nb_membres} membre${g.nb_membres > 1 ? 's' : ''}` }))
})

const listeAffichee = computed(() => {
  const liste = onglet.value === 'apprenant' ? apprenantsDisponibles.value : groupesDisponibles.value
  const q = recherche.value.trim().toLowerCase()
  return q ? liste.filter((x) => x.nom.toLowerCase().includes(q)) : liste
})
const selection = computed(() => (onglet.value === 'apprenant' ? selApprenants : selGroupes))

const toutCocher = () => {
  selApprenants.value = apprenantsDisponibles.value.map((a) => a.id)
}

// Conflits dans la sélection : apprenant coché avec son groupe, ou deux
// groupes cochés qui ont un membre en commun
const conflits = computed(() => {
  const messages = []
  const vus = new Map() // apprenant → groupe coché
  for (const g of selGroupes.value) {
    for (const a of membresActifs(g)) {
      if (vus.has(a)) messages.push(`${nomApprenant(a)} est dans « ${nomGroupe(vus.get(a))} » et « ${nomGroupe(g)} ».`)
      else vus.set(a, g)
    }
  }
  for (const a of selApprenants.value) {
    if (vus.has(a)) messages.push(`${nomApprenant(a)} est déjà couvert par le groupe « ${nomGroupe(vus.get(a))} ».`)
  }
  return messages
})

const nbSelection = computed(() => selApprenants.value.length + selGroupes.value.length)

const assigner = async () => {
  if (!nbSelection.value || conflits.value.length) return
  ajoutLoading.value = true
  actionError.value = ''
  erreursAjout.value = []
  pageSuccess.value = ''
  try {
    const creees = await assignerPlusieurs(tenantId, {
      brief: parseInt(briefId),
      apprenants: selApprenants.value,
      groupes: selGroupes.value,
    })
    assignations.value = await getAssignations(tenantId, { brief: briefId })
    selApprenants.value = []
    selGroupes.value = []
    pageSuccess.value = `${creees.length} assignation${creees.length > 1 ? 's ajoutées' : ' ajoutée'}.`
  } catch (e) {
    const d = e.response?.data
    if (d?.erreurs) {
      erreursAjout.value = d.erreurs.map((x) =>
        `${x.type === 'groupe' ? 'Groupe ' + nomGroupe(x.id) : nomApprenant(x.id)} : ${x.message}`
      )
      actionError.value = `${d.detail} Corrigez la sélection :`
    } else {
      actionError.value = messageErreur(e, "Impossible d'ajouter les assignations.")
    }
  } finally {
    ajoutLoading.value = false
  }
}

// ─── Suivi des rendus ─────────────────────────────────────────────────────────
// Rendu : au moins un dépôt avant la date limite ; Rendu en retard : tous les
// dépôts après la date limite ; Non rendu : aucun dépôt.
const depotsDe = (assignationId) => livrables.value.filter((l) => l.assignation === assignationId)

const suivi = (assignationId) => {
  const depots = depotsDe(assignationId)
  if (!depots.length) return { libelle: 'Non rendu', classes: 'bg-zinc-100 text-zinc-500 ring-zinc-200', nb: 0 }
  const dernier = depots.reduce((a, b) => (new Date(a.date_depot) > new Date(b.date_depot) ? a : b))
  const aTemps = depots.some((d) => !d.en_retard)
  return {
    libelle: aTemps ? 'Rendu' : 'Rendu en retard',
    classes: aTemps ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200',
    nb: depots.length,
    dernier: dernier.date_depot,
  }
}

const resumeRendus = computed(() => {
  const rendus = assignations.value.filter((a) => depotsDe(a.id).length).length
  return `${rendus} / ${assignations.value.length} rendu${rendus > 1 ? 's' : ''}`
})

// ─── Commentaires des pairs ───────────────────────────────────────────────────
const chargerCommentaires = async () => {
  commentaires.value = await getCommentaires(tenantId, { brief: briefId })
}
const commentairesDe = (assignationId) => commentaires.value.filter((c) => c.assignation === assignationId)

// ─── Évaluation ───────────────────────────────────────────────────────────────
const dernieres = computed(() => dernieresParAssignation(evaluations.value))
const etat = (assignationId) =>
  styleEtat(etatRendu(dernieres.value.get(assignationId), depotsDe(assignationId).length > 0))
const peutEvaluer = computed(() => brief.value?.peut_evaluer && promotion.value?.actif && brief.value?.statut !== 'BROUILLON')

const aEvaluer = ref(null) // { assignation, nom }
const ouvrirEvaluation = (a) => {
  aEvaluer.value = {
    assignation: a.id,
    nom: a.groupe ? `Groupe ${nomGroupe(a.groupe)}` : nomApprenant(a.apprenant),
  }
}
const apresEvaluation = (evaluation) => {
  evaluations.value = [evaluation, ...evaluations.value]
  aEvaluer.value = null
  pageSuccess.value = 'Évaluation enregistrée : l’apprenant a été prévenu.'
  const s = new Set(ouvertes.value)
  s.add(evaluation.assignation)
  ouvertes.value = s
}

const ouvertes = ref(new Set())
const basculerHistorique = (id) => {
  const s = new Set(ouvertes.value)
  s.has(id) ? s.delete(id) : s.add(id)
  ouvertes.value = s
}

// ─── Confirmation (retrait d'assignation, suppression du brief) ─────────────
const confirmation        = ref(null) // { titre, message, libelle, executer }
const confirmationLoading = ref(false)
const confirmationError   = ref('')

const demander = (config) => {
  confirmationError.value = ''
  confirmation.value = config
}

const confirmer = async () => {
  confirmationLoading.value = true
  confirmationError.value = ''
  try {
    await confirmation.value.executer()
    confirmation.value = null
  } catch (e) {
    confirmationError.value = messageErreur(e, 'Une erreur est survenue.')
  } finally {
    confirmationLoading.value = false
  }
}

const demanderRetrait = (a) =>
  demander({
    titre: "Retirer l'assignation",
    message: `${a.apprenant ? nomApprenant(a.apprenant) : 'Le groupe ' + nomGroupe(a.groupe)} ne sera plus assigné à ce brief.`,
    libelle: 'Retirer',
    executer: async () => {
      await supprimerAssignation(tenantId, a.id)
      assignations.value = await getAssignations(tenantId, { brief: briefId })
      pageSuccess.value = 'Assignation retirée.'
    },
  })

const demanderSuppression = () =>
  demander({
    titre: 'Supprimer le brief',
    message: `Le brief « ${brief.value.titre} » et ses assignations seront définitivement supprimés.`,
    libelle: 'Supprimer',
    executer: async () => {
      await supprimerBrief(tenantId, briefId)
      router.push('/briefs')
    },
  })

// ─── Ressources ───────────────────────────────────────────────────────────────
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

      <InfoBanner v-else-if="error" variant="error" :message="error" />

      <template v-else-if="brief">
        <PageHeader :titre="brief.titre" :description="brief.cree_par_nom ? `Créé par ${brief.cree_par_nom}` : ''">
          <template #actions>
            <template v-if="peutGerer">
              <AppButton v-if="brief.statut === 'BROUILLON'" icon="fa-solid fa-paper-plane" :loading="statutLoading"
                         @click="changerStatut('PUBLIE', 'Brief publié : il est visible par les apprenants de la promotion.')">
                Publier
              </AppButton>
              <AppButton v-if="brief.statut === 'PUBLIE'" variant="secondary" icon="fa-solid fa-box-archive" :loading="statutLoading"
                         @click="changerStatut('ARCHIVE', 'Brief archivé : il reste consultable, mais plus aucun dépôt n’est possible.')">
                Archiver
              </AppButton>
              <AppButton v-if="brief.statut === 'ARCHIVE'" variant="secondary" icon="fa-solid fa-rotate-left" :loading="statutLoading"
                         @click="changerStatut('PUBLIE', 'Brief republié.')">
                Republier
              </AppButton>
              <AppButton v-if="brief.modifiable" variant="secondary" icon="fa-solid fa-pen" @click="router.push(`/briefs/${brief.id}/modifier`)">
                Modifier
              </AppButton>
            </template>
            <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="router.push('/briefs')">Retour</AppButton>
          </template>
        </PageHeader>

        <InfoBanner v-if="promotion && !promotion.actif" variant="info" class="mt-6"
                    message="La promotion est clôturée : ce brief est consultable en lecture seule." />
        <InfoBanner v-else-if="estFormateur && !brief.modifiable" variant="info" class="mt-6"
                    message="Ce brief a déjà des livrables : il est figé (seul son statut peut encore changer)." />
        <InfoBanner v-if="pageSuccess" variant="success" :message="pageSuccess" class="mt-4" />
        <InfoBanner v-if="actionError" variant="error" :message="actionError" class="mt-4" />

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
              <h2 class="mb-4 font-['Sora'] text-base font-semibold text-gray-900">
                Compétences visées ({{ competencesVisees.length }})
              </h2>
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

            <!-- Assignations -->
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="mb-4 flex items-baseline justify-between gap-3">
                <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
                  Assignations et rendus ({{ assignations.length }})
                </h2>
                <div v-if="assignations.length" class="flex items-baseline gap-3">
                  <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ resumeRendus }}</span>
                  <RouterLink :to="`/suivi-livrables?brief=${brief.id}`" class="font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline">
                    Voir les livrables
                  </RouterLink>
                </div>
              </div>

              <div v-if="peutGerer && brief.statut !== 'ARCHIVE'" class="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
                <div class="flex flex-wrap items-center gap-3">
                  <div class="flex rounded-xl border border-slate-200 p-0.5">
                    <button v-for="t in [{ v: 'apprenant', l: 'Apprenants', n: selApprenants.length }, { v: 'groupe', l: 'Groupes', n: selGroupes.length }]"
                            :key="t.v" type="button"
                            class="rounded-lg px-3 py-1.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold transition"
                            :class="onglet === t.v ? 'bg-indigo-500 text-white' : 'text-zinc-600 hover:bg-slate-50'"
                            @click="onglet = t.v; recherche = ''">
                      {{ t.l }}<template v-if="t.n"> ({{ t.n }})</template>
                    </button>
                  </div>
                  <div class="min-w-48 flex-1">
                    <SearchInput v-model="recherche" :placeholder="onglet === 'apprenant' ? 'Rechercher un apprenant…' : 'Rechercher un groupe…'" />
                  </div>
                  <button v-if="onglet === 'apprenant' && apprenantsDisponibles.length" type="button"
                          class="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-indigo-600 hover:underline"
                          @click="toutCocher">
                    Toute la promotion
                  </button>
                </div>

                <p v-if="listeAffichee.length === 0" class="py-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                  {{ recherche ? 'Aucun résultat.' : (onglet === 'apprenant' ? 'Tous les inscrits sont déjà assignés.' : 'Aucun groupe disponible.') }}
                </p>
                <div v-else class="flex max-h-60 flex-col divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                  <label v-for="x in listeAffichee" :key="x.id" class="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <input v-model="selection.value" type="checkbox" :value="x.id" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                    <i :class="onglet === 'groupe' ? 'fa-solid fa-user-group' : 'fa-solid fa-user'" class="w-4 text-center text-xs text-zinc-400"></i>
                    <span class="font-['Plus_Jakarta_Sans'] text-sm text-gray-900">{{ x.nom }}</span>
                    <span class="truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ x.detail }}</span>
                  </label>
                </div>

                <InfoBanner v-if="conflits.length" variant="warning" :message="conflits.join(' ')" />
                <ul v-if="erreursAjout.length" class="list-disc pl-5 font-['Plus_Jakarta_Sans'] text-xs text-red-700">
                  <li v-for="(m, i) in erreursAjout" :key="i">{{ m }}</li>
                </ul>

                <div class="flex items-center justify-between gap-3">
                  <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                    Un apprenant n'est assigné qu'une fois : les membres d'un groupe assigné ne sont pas proposés.
                  </p>
                  <AppButton icon="fa-solid fa-plus" :loading="ajoutLoading" :disabled="!nbSelection || conflits.length > 0" @click="assigner">
                    Assigner<template v-if="nbSelection"> ({{ nbSelection }})</template>
                  </AppButton>
                </div>
              </div>

              <p v-if="assignations.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Ce brief n'est encore assigné à personne : seuls les apprenants assignés pourront déposer.
              </p>
              <ul class="flex flex-col divide-y divide-slate-100">
                <li v-for="a in assignations" :key="a.id" class="py-2.5">
                  <div class="flex flex-wrap items-center gap-3">
                    <i :class="a.groupe ? 'fa-solid fa-user-group' : 'fa-solid fa-user'" class="w-4 text-center text-xs text-zinc-400"></i>
                    <span class="flex-1 font-['Plus_Jakarta_Sans'] text-sm text-gray-900">
                      <template v-if="a.apprenant">{{ nomApprenant(a.apprenant) }}</template>
                      <template v-if="a.apprenant && a.groupe"> · </template>
                      <template v-if="a.groupe">Groupe {{ nomGroupe(a.groupe) }}</template>
                    </span>
                    <span class="rounded-full px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold ring-1" :class="suivi(a.id).classes">
                      {{ suivi(a.id).libelle }}
                    </span>
                    <span
                      v-if="dernieres.get(a.id) || suivi(a.id).nb"
                      class="rounded-full px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold ring-1"
                      :class="etat(a.id).classes"
                    >
                      {{ etat(a.id).libelle }}
                    </span>
                    <button
                      v-if="suivi(a.id).nb || dernieres.get(a.id)"
                      type="button"
                      class="font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline"
                      :aria-expanded="ouvertes.has(a.id)"
                      @click="basculerHistorique(a.id)"
                    >
                      <template v-if="suivi(a.id).nb">{{ suivi(a.id).nb }} dépôt{{ suivi(a.id).nb > 1 ? 's' : '' }} · dernier le {{ formatDate(suivi(a.id).dernier) }}</template>
                      <template v-else>Voir l'évaluation</template>
                      <i class="fa-solid fa-chevron-down ml-1 text-[10px] transition" :class="{ 'rotate-180': ouvertes.has(a.id) }"></i>
                    </button>
                    <AppButton
                      v-if="peutEvaluer"
                      variant="secondary"
                      icon="fa-solid fa-clipboard-check"
                      @click="ouvrirEvaluation(a)"
                    >
                      {{ dernieres.get(a.id) ? 'Réévaluer' : 'Évaluer' }}
                    </AppButton>
                    <!-- Une assignation avec des dépôts ne se retire pas -->
                    <button v-if="peutGerer && !suivi(a.id).nb" type="button" class="font-['Plus_Jakarta_Sans'] text-xs text-red-600 hover:underline"
                            @click="demanderRetrait(a)">
                      Retirer
                    </button>
                  </div>
                  <div v-if="ouvertes.has(a.id)" class="mt-3 flex flex-col gap-2 pl-7">
                    <EvaluationCarte v-if="dernieres.get(a.id)" :evaluation="dernieres.get(a.id)" />
                    <DepotCarte v-for="d in depotsDe(a.id)" :key="d.id" :depot="d" :afficher-cible="!!a.groupe" />
                    <CommentairesRendu
                      v-if="depotsDe(a.id).length"
                      class="mt-1 rounded-xl border border-slate-100 p-3"
                      titre="Commentaires des pairs"
                      :assignation="a.id"
                      :commentaires="commentairesDe(a.id)"
                      :mode="estFormateur ? 'formateur' : 'lecture'"
                      @change="chargerCommentaires"
                    />
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Colonne latérale -->
          <div class="flex flex-col gap-6">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Détails</h2>
                <StatusBadge :value="brief.statut" type="brief" />
              </div>
              <dl class="flex flex-col gap-3 font-['Plus_Jakarta_Sans']">
                <div>
                  <dt class="text-xs text-zinc-400">Promotion</dt>
                  <dd class="text-sm"><RouterLink :to="`/promotions/${brief.promotion}`" class="text-indigo-600 hover:underline">{{ promotion?.nom }}</RouterLink></dd>
                </div>
                <div v-if="categorie">
                  <dt class="text-xs text-zinc-400">Catégorie</dt>
                  <dd class="text-sm text-zinc-700">{{ categorie.nom }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-zinc-400">Module principal</dt>
                  <dd class="text-sm text-zinc-700">{{ module_?.nom }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-zinc-400">Début</dt>
                  <dd class="text-sm text-zinc-700">{{ formatDate(brief.date_debut) }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-zinc-400">Date limite</dt>
                  <dd class="text-sm text-zinc-700">{{ formatDate(brief.date_limite) }}</dd>
                </div>
              </dl>
              <div v-if="peutGerer && brief.modifiable" class="mt-5 border-t border-slate-100 pt-4">
                <AppButton variant="ghost" icon="fa-solid fa-trash" @click="demanderSuppression">Supprimer le brief</AppButton>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-3 font-['Sora'] text-sm font-semibold text-gray-900">Ressources ({{ ressources.length }})</h2>
              <p v-if="ressources.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Aucune ressource jointe.</p>
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

    <!-- Confirmation -->
    <Teleport to="body">
      <div v-if="confirmation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
           @click.self="!confirmationLoading && (confirmation = null)">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">{{ confirmation.titre }}</h2>
          </div>
          <div class="flex flex-col gap-4 px-6 py-5">
            <InfoBanner v-if="confirmationError" variant="error" :message="confirmationError" />
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ confirmation.message }}</p>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="confirmationLoading" @click="confirmation = null">Annuler</AppButton>
              <AppButton variant="danger" :loading="confirmationLoading" @click="confirmer">{{ confirmation.libelle }}</AppButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <FormulaireEvaluation
      v-if="brief"
      :cible="aEvaluer"
      :brief="brief"
      :precedente="aEvaluer ? dernieres.get(aEvaluer.assignation) ?? null : null"
      :sans-depot="aEvaluer ? depotsDe(aEvaluer.assignation).length === 0 : false"
      @fermer="aEvaluer = null"
      @evalue="apresEvaluation"
    />

    <VisionneuseFichier
      :fichier="fichierRessource"
      :telecharger="() => telechargerRessource(tenantId, ressourceConsultee)"
      @fermer="ressourceConsultee = null"
    />
  </AppLayout>
</template>

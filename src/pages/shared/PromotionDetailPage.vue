<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import CreerGroupeModal from '../../components/groupes/CreerGroupeModal.vue'
import InscriptionApprenantsModal from '../../components/membres/InscriptionApprenantsModal.vue'
import { useAuthStore } from '../../stores/auth'
import {
  getPromotion,
  getInscriptions,
  getGroupes,
  getFormations,
  desinscrireApprenant,
  getFormateursPromotion,
  affecterFormateur,
  retirerFormateur,
  cloturerPromotion,
  rouvrirPromotion,
} from '../../services/pedagogie'
import { getMembres } from '../../services/membres'
import BoutonRapport from '../../components/rapports/BoutonRapport.vue'
import MenuExport from '../../components/rapports/MenuExport.vue'
import { exporterProgression, exporterSuivi } from '../../services/rapports'

const route   = useRoute()
const router  = useRouter()
const authStore = useAuthStore()
const tenantId    = authStore.tenantCourant?.id
const promotionId = route.params.id

const isAdmin = computed(() => authStore.role === 'ADMINISTRATEUR')

// Exports Excel de la promotion (formateurs de la promotion et admin)
const exports = [
  {
    label: 'Progression',
    description: 'Progression par apprenant et compétences acquises',
    icon: 'fa-solid fa-chart-simple',
    action: () => exporterProgression(tenantId, promotionId),
  },
  {
    label: 'Suivi des livrables',
    description: 'Rendus, retards et évaluations, brief par brief',
    icon: 'fa-solid fa-inbox',
    action: () => exporterSuivi(tenantId, promotionId),
  },
]

// Promotion clôturée : tout reste consultable, en lecture seule.
const estOuverte = computed(() => promotion.value?.actif !== false)
const peutGerer  = computed(() => isAdmin.value && estOuverte.value)

// Les groupes sont gérés par les formateurs de la promotion
const estFormateur        = computed(() => authStore.role === 'FORMATEUR')
const peutCreerGroupe     = computed(() => estFormateur.value && estOuverte.value)
const showCreationGroupe  = ref(false)

const handleGroupeCree = (groupe) => {
  showCreationGroupe.value = false
  router.push(`/groupes/${groupe.id}`)
}

// ─── État principal ───────────────────────────────────────────────────────────
const promotion    = ref(null)
const inscriptions = ref([])
const groupes      = ref([])
const nomFormation = ref('')
const loading      = ref(true)
const error        = ref('')

// ─── Formateurs affectés ──────────────────────────────────────────────────────
const formateursAffectes = ref([])

// ─── Modal affectation formateur (Admin Organisme uniquement) ─────────────────
const showAffectationModal  = ref(false)
const tousFormateurs         = ref([])
const formateurChoisi        = ref('')
const affectationLoading     = ref(false)
const affectationError       = ref('')
const affectationSuccess     = ref('')

// IDs déjà affectés pour filtrer les options
const affectesIds = computed(() =>
  new Set(formateursAffectes.value.map((f) => String(f.formateur)))
)

const formateurOptions = computed(() =>
  tousFormateurs.value
    .filter((m) => !affectesIds.value.has(String(m.utilisateur)))
    .map((m) => ({
      value: String(m.utilisateur),
      label: m.utilisateur_prenom
        ? `${m.utilisateur_prenom} ${m.utilisateur_nom} — ${m.utilisateur_email ?? ''}`
        : `Formateur #${m.utilisateur}`,
    }))
)

// ─── Inscription d'apprenants (Admin Organisme uniquement) ───────────────────
const showInscriptionModal = ref(false)

const rechargerInscriptions = async () => {
  inscriptions.value = await getInscriptions(tenantId, promotionId, { actif: 'true' })
}

// ─── Onglets ──────────────────────────────────────────────────────────────────
const onglet = ref('apprenants')
const onglets = computed(() => [
  { cle: 'apprenants', libelle: 'Apprenants', icone: 'fa-user-graduate', nb: inscriptions.value.length },
  { cle: 'formateurs', libelle: 'Formateurs', icone: 'fa-chalkboard-user', nb: formateursAffectes.value.length },
  { cle: 'groupes', libelle: 'Groupes', icone: 'fa-user-group', nb: groupes.value.length },
])

// ─── Chargement ───────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [promo, inscrits, grps, formateurs] = await Promise.all([
      getPromotion(tenantId, promotionId),
      getInscriptions(tenantId, promotionId, { actif: 'true' }),
      getGroupes(tenantId, { promotion: promotionId }),
      getFormateursPromotion(tenantId, promotionId),
    ])
    promotion.value          = promo
    inscriptions.value       = inscrits
    groupes.value            = grps
    formateursAffectes.value = formateurs

    const formations = await getFormations(tenantId)
    nomFormation.value =
      formations.find((f) => f.id === promo.formation)?.nom ?? '—'
  } catch {
    error.value = 'Impossible de charger la promotion.'
  } finally {
    loading.value = false
  }
})

// ─── Modal affectation formateur ──────────────────────────────────────────────
const ouvrirModalAffectation = async () => {
  affectationError.value   = ''
  affectationSuccess.value = ''
  formateurChoisi.value    = ''

  if (tousFormateurs.value.length === 0) {
    try {
      const membres = await getMembres(tenantId)
      tousFormateurs.value = membres.filter((m) => m.role === 'FORMATEUR' && m.actif)
    } catch {
      affectationError.value = 'Impossible de charger la liste des formateurs.'
    }
  }

  showAffectationModal.value = true
}

const fermerModalAffectation = () => {
  showAffectationModal.value = false
  affectationError.value     = ''
  affectationSuccess.value   = ''
  formateurChoisi.value      = ''
}

const handleAffecter = async () => {
  if (!formateurChoisi.value) {
    affectationError.value = 'Veuillez sélectionner un formateur.'
    return
  }

  affectationLoading.value = true
  affectationError.value   = ''
  affectationSuccess.value = ''

  try {
    await affecterFormateur(tenantId, parseInt(promotionId), parseInt(formateurChoisi.value))

    // Rafraîchir la liste des formateurs affectés
    formateursAffectes.value = await getFormateursPromotion(tenantId, promotionId)

    affectationSuccess.value = 'Formateur affecté avec succès.'
    formateurChoisi.value    = ''
  } catch (e) {
    const data = e.response?.data
    if (data?.formateur) {
      affectationError.value = Array.isArray(data.formateur)
        ? data.formateur[0]
        : data.formateur
    } else if (data?.detail) {
      affectationError.value = data.detail
    } else if (typeof data === 'string') {
      affectationError.value = data
    } else {
      affectationError.value = "Une erreur est survenue lors de l'affectation."
    }
  } finally {
    affectationLoading.value = false
  }
}

// ─── Messages de la page ──────────────────────────────────────────────────────
const pageSuccess = ref('')
const pageWarning = ref('')

const messageErreur = (e, defaut) => {
  const data = e.response?.data
  const premier = (v) => (Array.isArray(v) ? v[0] : v)
  return (
    data?.detail ||
    premier(data?.apprenant) ||
    premier(data?.formateur) ||
    defaut
  )
}

// ─── Clôture / réouverture (Admin Organisme) ──────────────────────────────────
const showClotureModal = ref(false)
const nomSaisi         = ref('')
const clotureLoading   = ref(false)
const clotureError     = ref('')

const nomConfirme = computed(
  () => nomSaisi.value.trim() === promotion.value?.nom
)

const ouvrirModalCloture = () => {
  nomSaisi.value     = ''
  clotureError.value = ''
  showClotureModal.value = true
}

const fermerModalCloture = () => {
  if (!clotureLoading.value) showClotureModal.value = false
}

const handleCloture = async () => {
  clotureLoading.value = true
  clotureError.value   = ''
  pageSuccess.value    = ''
  pageWarning.value    = ''

  try {
    let succes = ''
    if (estOuverte.value) {
      if (!nomConfirme.value) return
      const res = await cloturerPromotion(tenantId, promotionId)
      succes =
        `Promotion clôturée : ${res.inscriptions_fermees} inscription` +
        `${res.inscriptions_fermees > 1 ? 's fermées' : ' fermée'}.`
    } else {
      const res = await rouvrirPromotion(tenantId, promotionId)
      succes =
        `Promotion rouverte : ${res.inscriptions_reactivees} inscription` +
        `${res.inscriptions_reactivees > 1 ? 's réactivées' : ' réactivée'}.`
      if (res.non_reactives.length > 0) {
        pageWarning.value =
          'Inscrits entre-temps dans une autre promotion, non réactivés : ' +
          res.non_reactives.map((a) => a.nom).join(', ') +
          '. Désinscrivez-les de l’autre promotion pour les réinscrire ici.'
      }
    }

    // Message affiché une fois la page à jour
    promotion.value    = await getPromotion(tenantId, promotionId)
    inscriptions.value = await getInscriptions(tenantId, promotionId, { actif: 'true' })
    pageSuccess.value  = succes
    showClotureModal.value = false
  } catch (e) {
    clotureError.value = messageErreur(e, 'Une erreur est survenue.')
  } finally {
    clotureLoading.value = false
  }
}

// ─── Désinscription / retrait de formateur (confirmation) ────────────────────
// { titre, message, libelle, executer }
const confirmation        = ref(null)
const confirmationLoading = ref(false)
const confirmationError   = ref('')

const demanderConfirmation = (config) => {
  confirmationError.value = ''
  confirmation.value = config
}

const fermerConfirmation = () => {
  if (!confirmationLoading.value) confirmation.value = null
}

const confirmer = async () => {
  confirmationLoading.value = true
  confirmationError.value   = ''
  try {
    await confirmation.value.executer()
    confirmation.value = null
  } catch (e) {
    confirmationError.value = messageErreur(e, 'Une erreur est survenue.')
  } finally {
    confirmationLoading.value = false
  }
}

const demanderDesinscription = (ins) =>
  demanderConfirmation({
    titre: 'Désinscrire un apprenant',
    message:
      `${ins.apprenant_prenom} ${ins.apprenant_nom} sera désinscrit de la promotion ` +
      'et retiré de ses groupes. S’il a déjà déposé des livrables, ils sont conservés.',
    libelle: 'Désinscrire',
    executer: async () => {
      await desinscrireApprenant(tenantId, parseInt(promotionId), ins.apprenant)
      inscriptions.value = await getInscriptions(tenantId, promotionId, { actif: 'true' })
      groupes.value = await getGroupes(tenantId, { promotion: promotionId })
      pageSuccess.value = 'Apprenant désinscrit.'
    },
  })

const demanderRetraitFormateur = (aff) =>
  demanderConfirmation({
    titre: 'Retirer un formateur',
    message:
      `${aff.formateur_prenom} ${aff.formateur_nom} n’interviendra plus sur cette promotion. ` +
      'Ses briefs restent en place et restent gérés par les autres formateurs.',
    libelle: 'Retirer',
    executer: async () => {
      await retirerFormateur(tenantId, parseInt(promotionId), aff.formateur)
      formateursAffectes.value = await getFormateursPromotion(tenantId, promotionId)
      pageSuccess.value = 'Formateur retiré de la promotion.'
    },
  })

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner v-else-if="error" variant="error" :message="error" />

      <template v-else-if="promotion">

        <PageHeader :titre="promotion.nom">
          <template #actions>
            <BoutonRapport type="PROMOTION" :promotion-id="promotion.id" @erreur="(m) => (pageWarning = m)" />
            <MenuExport :elements="exports" />
            <AppButton
              v-if="isAdmin"
              :variant="estOuverte ? 'secondary' : 'primary'"
              :icon="estOuverte ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open'"
              @click="ouvrirModalCloture"
            >
              {{ estOuverte ? 'Clôturer' : 'Rouvrir' }}
            </AppButton>
            <AppButton
              variant="secondary"
              icon="fa-solid fa-arrow-left"
              @click="router.push('/promotions')"
            >
              Retour
            </AppButton>
          </template>
        </PageHeader>

        <InfoBanner
          v-if="!estOuverte"
          variant="info"
          message="Promotion clôturée : elle est consultable en lecture seule."
          class="mt-6"
        />
        <InfoBanner v-if="pageSuccess" variant="success" :message="pageSuccess" class="mt-4" />
        <InfoBanner v-if="pageWarning" variant="warning" :message="pageWarning" class="mt-4" />

        <!-- Informations : une seule bande -->
        <div class="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <dl class="flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Formation</dt>
              <dd class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">{{ nomFormation }}</dd>
            </div>
            <div>
              <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Période</dt>
              <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
                {{ formatDate(promotion.date_debut) }} → {{ promotion.date_fin ? formatDate(promotion.date_fin) : '…' }}
              </dd>
            </div>
            <div>
              <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Statut</dt>
              <dd><StatusBadge :value="promotion.actif" type="promotion" /></dd>
            </div>
          </dl>
          <p v-if="promotion.description" class="mt-3 border-t border-slate-100 pt-3 font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">
            {{ promotion.description }}
          </p>
        </div>

        <!-- Onglets -->
        <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <nav class="-mb-px flex gap-1" role="tablist">
            <button
              v-for="o in onglets"
              :key="o.cle"
              type="button"
              role="tab"
              :aria-selected="onglet === o.cle"
              class="flex items-center gap-2 border-b-2 px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold transition"
              :class="onglet === o.cle ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'"
              @click="onglet = o.cle"
            >
              <i class="fa-solid text-xs" :class="o.icone"></i>{{ o.libelle }}
              <span class="rounded-full px-1.5 text-[11px]" :class="onglet === o.cle ? 'bg-indigo-50' : 'bg-slate-100'">{{ o.nb }}</span>
            </button>
          </nav>
          <div class="pb-2">
            <AppButton v-if="onglet === 'apprenants' && peutGerer" icon="fa-solid fa-user-plus" @click="showInscriptionModal = true">
              Inscrire des apprenants
            </AppButton>
            <AppButton v-else-if="onglet === 'formateurs' && peutGerer" icon="fa-solid fa-plus" @click="ouvrirModalAffectation">
              Affecter un formateur
            </AppButton>
            <AppButton v-else-if="onglet === 'groupes' && peutCreerGroupe" icon="fa-solid fa-plus" @click="showCreationGroupe = true">
              Créer un groupe
            </AppButton>
          </div>
        </div>

        <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <!-- Apprenants inscrits -->
          <template v-if="onglet === 'apprenants'">
            <div v-if="inscriptions.length === 0" class="flex flex-col items-center gap-3 py-10 text-center">
              <i class="fa-solid fa-user-graduate text-2xl text-zinc-300"></i>
              <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">Aucun apprenant inscrit.</p>
              <AppButton v-if="peutGerer" variant="secondary" icon="fa-solid fa-user-plus" @click="showInscriptionModal = true">
                Inscrire des apprenants
              </AppButton>
            </div>
            <ul v-else class="flex flex-col divide-y divide-slate-100">
              <li v-for="ins in inscriptions" :key="ins.id" class="flex items-center justify-between gap-3 px-4 py-2.5">
                <RouterLink :to="`/apprenants/${ins.apprenant}`" class="flex min-w-0 items-center gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-indigo-700">
                    {{ ins.apprenant_prenom?.[0] }}{{ ins.apprenant_nom?.[0] }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900 hover:text-indigo-700">
                      {{ ins.apprenant_prenom }} {{ ins.apprenant_nom }}
                    </p>
                    <p class="truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ ins.apprenant_email }}</p>
                  </div>
                </RouterLink>
                <button v-if="peutGerer" type="button" class="shrink-0 font-['Plus_Jakarta_Sans'] text-xs text-red-600 hover:underline" @click="demanderDesinscription(ins)">
                  Désinscrire
                </button>
              </li>
            </ul>
          </template>

          <!-- Formateurs affectés -->
          <template v-else-if="onglet === 'formateurs'">
            <p v-if="formateursAffectes.length === 0" class="py-10 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
              Aucun formateur affecté.
            </p>
            <ul v-else class="flex flex-col divide-y divide-slate-100">
              <li v-for="aff in formateursAffectes" :key="aff.id" class="flex items-center gap-3 px-4 py-2.5">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-orange-700">
                  {{ (aff.formateur_prenom?.[0] ?? '?') + (aff.formateur_nom?.[0] ?? '') }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">
                    {{ aff.formateur_prenom ? `${aff.formateur_prenom} ${aff.formateur_nom}` : `Formateur #${aff.formateur}` }}
                  </p>
                  <p class="truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ aff.formateur_email ?? '' }}</p>
                </div>
                <button v-if="peutGerer" type="button" class="shrink-0 font-['Plus_Jakarta_Sans'] text-xs text-red-600 hover:underline" @click="demanderRetraitFormateur(aff)">
                  Retirer
                </button>
              </li>
            </ul>
          </template>

          <!-- Groupes -->
          <template v-else>
            <p v-if="groupes.length === 0" class="py-10 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">Aucun groupe.</p>
            <ul v-else class="flex flex-col divide-y divide-slate-100">
              <li v-for="groupe in groupes" :key="groupe.id">
                <RouterLink :to="`/groupes/${groupe.id}`" class="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <span class="flex items-center gap-3 font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">
                    <i class="fa-solid fa-user-group text-xs text-zinc-400"></i>{{ groupe.nom }}
                  </span>
                  <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                    {{ groupe.nb_membres }} membre{{ groupe.nb_membres !== 1 ? 's' : '' }}
                    <i class="fa-solid fa-chevron-right ml-2 text-[10px]"></i>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </template>
        </div>

      </template>
    </div>

    <InscriptionApprenantsModal
      v-if="showInscriptionModal"
      :tenant-id="tenantId"
      :promotion="promotion"
      :inscrits="inscriptions.map((i) => i.apprenant)"
      @fermer="showInscriptionModal = false"
      @inscrits="rechargerInscriptions"
    />

    <CreerGroupeModal
      :ouvert="showCreationGroupe"
      :tenant-id="tenantId"
      :promotions="promotion ? [promotion] : []"
      :promotion-id="promotion?.id"
      @close="showCreationGroupe = false"
      @created="handleGroupeCree"
    />

    <!-- ── Modal : clôture / réouverture ──────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showClotureModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="fermerModalCloture"
      >
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
              {{ estOuverte ? 'Clôturer la promotion' : 'Rouvrir la promotion' }}
            </h2>
            <button
              type="button"
              @click="fermerModalCloture"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
              aria-label="Fermer"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form class="flex flex-col gap-4 px-6 py-5" @submit.prevent="handleCloture">
            <InfoBanner v-if="clotureError" variant="error" :message="clotureError" />

            <template v-if="estOuverte">
              <InfoBanner
                variant="warning"
                :message="`${inscriptions.length} apprenant${inscriptions.length > 1 ? 's seront désinscrits' : ' sera désinscrit'} et la promotion passera en lecture seule (groupes, inscriptions, formateurs). Vous pourrez la rouvrir en cas d’erreur.`"
              />
              <FormField :label="`Pour confirmer, saisissez le nom de la promotion : ${promotion?.nom}`">
                <TextInput v-model="nomSaisi" :placeholder="promotion?.nom" :disabled="clotureLoading" />
              </FormField>
            </template>
            <p v-else class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
              Les inscriptions fermées par la clôture seront réactivées et la promotion
              redeviendra modifiable.
            </p>

            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="clotureLoading" @click="fermerModalCloture">
                Annuler
              </AppButton>
              <AppButton
                type="submit"
                :variant="estOuverte ? 'danger' : 'primary'"
                :loading="clotureLoading"
                :disabled="estOuverte && !nomConfirme"
              >
                {{ estOuverte ? 'Clôturer' : 'Rouvrir' }}
              </AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal : confirmation (désinscription, retrait formateur) ──────────── -->
    <Teleport to="body">
      <div
        v-if="confirmation"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="fermerConfirmation"
      >
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">{{ confirmation.titre }}</h2>
          </div>
          <div class="flex flex-col gap-4 px-6 py-5">
            <InfoBanner v-if="confirmationError" variant="error" :message="confirmationError" />
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ confirmation.message }}</p>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="confirmationLoading" @click="fermerConfirmation">
                Annuler
              </AppButton>
              <AppButton variant="danger" :loading="confirmationLoading" @click="confirmer">
                {{ confirmation.libelle }}
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal : affecter un formateur ──────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showAffectationModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="fermerModalAffectation"
      >
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">

          <!-- En-tête -->
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
                Affecter un formateur
              </h2>
              <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                {{ promotion?.nom }}
              </p>
            </div>
            <button
              type="button"
              @click="fermerModalAffectation"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
              aria-label="Fermer"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Corps -->
          <div class="px-6 py-5">

            <InfoBanner v-if="affectationSuccess" variant="success" :message="affectationSuccess" class="mb-4" />
            <InfoBanner v-if="affectationError"   variant="error"   :message="affectationError"   class="mb-4" />

            <div v-if="!affectationSuccess" class="flex flex-col gap-4">

              <div
                v-if="formateurOptions.length === 0 && tousFormateurs.length > 0"
                class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
                  Tous les formateurs actifs sont déjà affectés à cette promotion.
                </p>
              </div>

              <template v-else>
                <FormField
                  label="Formateur"
                  hint="Seuls les formateurs actifs non encore affectés sont affichés."
                >
                  <AppSelect
                    v-model="formateurChoisi"
                    :options="formateurOptions"
                    placeholder="Sélectionner un formateur…"
                    :disabled="affectationLoading"
                  />
                </FormField>
              </template>

              <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <AppButton
                  type="button"
                  variant="secondary"
                  @click="fermerModalAffectation"
                  :disabled="affectationLoading"
                >
                  Annuler
                </AppButton>
                <AppButton
                  v-if="formateurOptions.length > 0"
                  type="button"
                  variant="primary"
                  :loading="affectationLoading"
                  :disabled="!formateurChoisi"
                  @click="handleAffecter"
                >
                  Affecter
                </AppButton>
              </div>
            </div>

            <div v-else class="flex justify-end pt-2">
              <AppButton variant="primary" @click="fermerModalAffectation">
                Fermer
              </AppButton>
            </div>

          </div>
        </div>
      </div>
    </Teleport>


  </AppLayout>
</template>

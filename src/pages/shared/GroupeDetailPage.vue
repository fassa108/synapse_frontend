<script setup>
/**
 * GroupeDetailPage
 *
 * - Formateur (promotion ouverte) : modifier, désactiver, supprimer si vide,
 *   ajouter / retirer des apprenants inscrits dans la promotion.
 * - Admin Organisme, ou promotion clôturée : consultation seule.
 *
 * Les anciens membres (désinscrits après avoir déposé des livrables) sont
 * affichés à part, pour l'historique.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import {
  getGroupe,
  getPromotion,
  getInscriptions,
  modifierGroupe,
  supprimerGroupe,
  ajouterMembreGroupe,
  retirerMembreGroupe,
} from '../../services/pedagogie'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id
const groupeId = route.params.id

const groupe = ref(null)
const promotion = ref(null)
const inscriptions = ref([])
const loading = ref(true)
const error = ref('')
const pageSuccess = ref('')

const estFormateur = computed(() => authStore.role === 'FORMATEUR')
const peutGerer = computed(() => estFormateur.value && promotion.value?.actif)

const membresActifs = computed(() => groupe.value?.membres.filter((m) => m.actif) ?? [])
const anciensMembres = computed(() => groupe.value?.membres.filter((m) => !m.actif) ?? [])

const recharger = async () => {
  groupe.value = await getGroupe(tenantId, groupeId)
}

onMounted(async () => {
  try {
    const g = await getGroupe(tenantId, groupeId)
    groupe.value = g
    promotion.value = await getPromotion(tenantId, g.promotion)
    if (estFormateur.value) {
      inscriptions.value = await getInscriptions(tenantId, g.promotion, { actif: 'true' })
    }
  } catch {
    error.value = 'Impossible de charger le groupe.'
  } finally {
    loading.value = false
  }
})

const premierMessage = (e, defaut) => {
  const data = e.response?.data
  const premier = (v) => (Array.isArray(v) ? v[0] : v)
  return data?.detail || premier(data?.apprenant) || premier(data?.nom) || premier(data?.promotion) || defaut
}

// ─── Ajout d'un apprenant ─────────────────────────────────────────────────────
const apprenantChoisi = ref('')
const ajoutLoading = ref(false)
const ajoutError = ref('')

const apprenantOptions = computed(() => {
  const dejaMembres = new Set(membresActifs.value.map((m) => m.apprenant))
  return inscriptions.value
    .filter((i) => !dejaMembres.has(i.apprenant))
    .map((i) => ({
      value: String(i.apprenant),
      label: `${i.apprenant_prenom} ${i.apprenant_nom} — ${i.apprenant_email}`,
    }))
})

const handleAjouter = async () => {
  if (!apprenantChoisi.value) return
  ajoutLoading.value = true
  ajoutError.value = ''
  pageSuccess.value = ''
  try {
    await ajouterMembreGroupe(tenantId, groupeId, parseInt(apprenantChoisi.value))
    await recharger()
    apprenantChoisi.value = ''
    pageSuccess.value = 'Apprenant ajouté au groupe.'
  } catch (e) {
    ajoutError.value = premierMessage(e, "Impossible d'ajouter cet apprenant.")
  } finally {
    ajoutLoading.value = false
  }
}

// ─── Confirmation (retrait, suppression) ──────────────────────────────────────
// { titre, message, libelle, executer }
const confirmation = ref(null)
const confirmationLoading = ref(false)
const confirmationError = ref('')

const fermerConfirmation = () => {
  if (!confirmationLoading.value) confirmation.value = null
}

const confirmer = async () => {
  confirmationLoading.value = true
  confirmationError.value = ''
  try {
    await confirmation.value.executer()
    confirmation.value = null
  } catch (e) {
    confirmationError.value = premierMessage(e, 'Une erreur est survenue.')
  } finally {
    confirmationLoading.value = false
  }
}

const demanderRetrait = (membre) => {
  confirmationError.value = ''
  confirmation.value = {
    titre: 'Retirer du groupe',
    message:
      `${membre.apprenant_prenom} ${membre.apprenant_nom} sera retiré du groupe. ` +
      'S’il a déjà déposé des livrables, il restera visible dans les anciens membres.',
    libelle: 'Retirer',
    executer: async () => {
      await retirerMembreGroupe(tenantId, groupeId, membre.apprenant)
      await recharger()
      pageSuccess.value = 'Apprenant retiré du groupe.'
    },
  }
}

const demanderSuppression = () => {
  confirmationError.value = ''
  confirmation.value = {
    titre: 'Supprimer le groupe',
    message: `Le groupe « ${groupe.value.nom} » sera définitivement supprimé.`,
    libelle: 'Supprimer',
    executer: async () => {
      await supprimerGroupe(tenantId, groupeId)
      router.push('/groupes')
    },
  }
}

// ─── Modification ─────────────────────────────────────────────────────────────
const showEdition = ref(false)
const editionLoading = ref(false)
const editionError = ref('')
const edition = reactive({ nom: '', description: '' })

const ouvrirEdition = () => {
  Object.assign(edition, {
    nom: groupe.value.nom,
    description: groupe.value.description ?? '',
  })
  editionError.value = ''
  showEdition.value = true
}

const handleModifier = async () => {
  if (!edition.nom.trim()) {
    editionError.value = 'Le nom est obligatoire.'
    return
  }
  editionLoading.value = true
  editionError.value = ''
  try {
    await modifierGroupe(tenantId, groupeId, {
      nom: edition.nom.trim(),
      description: edition.description.trim(),
    })
    await recharger()
    showEdition.value = false
    pageSuccess.value = 'Groupe modifié.'
  } catch (e) {
    editionError.value = premierMessage(e, 'Impossible de modifier le groupe.')
  } finally {
    editionLoading.value = false
  }
}

// ─── Désactivation / réactivation ─────────────────────────────────────────────
const statutLoading = ref(false)

const basculerActif = async () => {
  statutLoading.value = true
  pageSuccess.value = ''
  error.value = ''
  try {
    const actif = !groupe.value.actif
    await modifierGroupe(tenantId, groupeId, { actif })
    await recharger()
    pageSuccess.value = actif ? 'Groupe réactivé.' : 'Groupe désactivé : il est conservé mais n’est plus utilisé.'
  } catch (e) {
    error.value = premierMessage(e, 'Impossible de modifier le statut du groupe.')
  } finally {
    statutLoading.value = false
  }
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const initiales = (m) => {
  const p = m.apprenant_prenom?.[0] ?? '?'
  const n = m.apprenant_nom?.[0] ?? ''
  return (p + n).toUpperCase()
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner v-else-if="error" variant="error" :message="error" />

      <template v-else-if="groupe">

        <PageHeader :titre="groupe.nom">
          <template #actions>
            <AppButton v-if="peutGerer" variant="secondary" icon="fa-solid fa-pen" @click="ouvrirEdition">
              Modifier
            </AppButton>
            <AppButton
              variant="secondary"
              icon="fa-solid fa-arrow-left"
              @click="router.push('/groupes')"
            >
              Retour
            </AppButton>
          </template>
        </PageHeader>

        <InfoBanner
          v-if="promotion && !promotion.actif"
          variant="info"
          message="La promotion est clôturée : ce groupe est consultable en lecture seule."
          class="mt-6"
        />
        <InfoBanner v-if="pageSuccess" variant="success" :message="pageSuccess" class="mt-4" />

        <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">

          <!-- Membres -->
          <div class="flex flex-col gap-6 lg:col-span-2">
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="mb-5 font-['Sora'] text-base font-semibold text-gray-900">
                Membres ({{ groupe.nb_membres }})
              </h2>

              <!-- Ajout (formateur, groupe actif) -->
              <p
                v-if="peutGerer && !groupe.actif"
                class="mb-5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400"
              >
                Groupe désactivé : réactivez-le pour y ajouter des apprenants.
              </p>
              <div v-else-if="peutGerer" class="mb-5 flex flex-col gap-2">
                <div class="flex flex-wrap items-end gap-3">
                  <div class="min-w-64 flex-1">
                    <AppSelect
                      v-model="apprenantChoisi"
                      :options="apprenantOptions"
                      :placeholder="apprenantOptions.length
                        ? 'Ajouter un apprenant de la promotion…'
                        : inscriptions.length
                          ? 'Tous les inscrits sont déjà membres'
                          : 'Aucun apprenant inscrit dans la promotion'"
                      :disabled="ajoutLoading || apprenantOptions.length === 0"
                    />
                  </div>
                  <AppButton
                    icon="fa-solid fa-user-plus"
                    :loading="ajoutLoading"
                    :disabled="!apprenantChoisi"
                    @click="handleAjouter"
                  >
                    Ajouter
                  </AppButton>
                </div>
                <InfoBanner v-if="ajoutError" variant="error" :message="ajoutError" />
              </div>

              <div v-if="membresActifs.length === 0" class="py-6 text-center text-sm text-zinc-400">
                <i class="fa-solid fa-users mb-2 text-2xl"></i>
                <p>Aucun membre dans ce groupe.</p>
              </div>

              <ul v-else class="flex flex-col divide-y divide-slate-100">
                <li
                  v-for="membre in membresActifs"
                  :key="membre.id"
                  class="flex items-center gap-4 py-3"
                >
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-['Plus_Jakarta_Sans'] text-sm font-bold text-indigo-700">
                    {{ initiales(membre) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">
                      {{ membre.apprenant_prenom }} {{ membre.apprenant_nom }}
                    </p>
                    <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                      {{ membre.apprenant_email }}
                    </p>
                  </div>
                  <RouterLink
                    :to="`/apprenants/${membre.apprenant}`"
                    class="shrink-0 font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline"
                  >
                    Voir le profil
                  </RouterLink>
                  <button
                    v-if="peutGerer"
                    type="button"
                    class="shrink-0 font-['Plus_Jakarta_Sans'] text-xs text-red-600 hover:underline"
                    @click="demanderRetrait(membre)"
                  >
                    Retirer
                  </button>
                </li>
              </ul>
            </div>

            <!-- Anciens membres -->
            <div
              v-if="anciensMembres.length > 0"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 class="mb-1 font-['Sora'] text-sm font-semibold text-gray-900">
                Anciens membres ({{ anciensMembres.length }})
              </h2>
              <p class="mb-4 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Désinscrits ou retirés après avoir déposé des livrables : conservés pour l'historique.
              </p>
              <ul class="flex flex-col divide-y divide-slate-100">
                <li v-for="membre in anciensMembres" :key="membre.id" class="flex items-center gap-4 py-2.5 opacity-70">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-zinc-500">
                    {{ initiales(membre) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
                      {{ membre.apprenant_prenom }} {{ membre.apprenant_nom }}
                    </p>
                    <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ membre.apprenant_email }}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Colonne info -->
          <div class="flex flex-col gap-6">

            <!-- Statut & détails -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">
                Détails
              </h2>
              <dl class="flex flex-col gap-3">
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Statut</dt>
                  <dd class="mt-0.5"><StatusBadge :value="groupe.actif" type="boolean" /></dd>
                </div>
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Créé le</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
                    {{ formatDate(groupe.date_creation) }}
                  </dd>
                </div>
                <div v-if="groupe.description">
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Description</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">{{ groupe.description }}</dd>
                </div>
              </dl>

              <div v-if="peutGerer" class="mt-5 flex flex-col items-start gap-2 border-t border-slate-100 pt-4">
                <AppButton
                  variant="secondary"
                  :icon="groupe.actif ? 'fa-solid fa-pause' : 'fa-solid fa-play'"
                  :loading="statutLoading"
                  @click="basculerActif"
                >
                  {{ groupe.actif ? 'Désactiver le groupe' : 'Réactiver le groupe' }}
                </AppButton>
                <AppButton
                  variant="ghost"
                  icon="fa-solid fa-trash"
                  :disabled="groupe.membres.length > 0"
                  @click="demanderSuppression"
                >
                  Supprimer le groupe
                </AppButton>
                <p v-if="groupe.membres.length > 0" class="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                  Un groupe avec des membres ne peut pas être supprimé : désactivez-le à la place.
                </p>
              </div>
            </div>

            <!-- Promotion -->
            <div
              v-if="promotion"
              class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 class="mb-3 font-['Sora'] text-sm font-semibold text-gray-900">
                Promotion
              </h2>
              <div class="flex items-center justify-between">
                <RouterLink
                  :to="`/promotions/${promotion.id}`"
                  class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-indigo-600 hover:underline"
                >
                  {{ promotion.nom }}
                </RouterLink>
                <StatusBadge :value="promotion.actif" type="promotion" />
              </div>
              <p class="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Du {{ formatDate(promotion.date_debut) }}
                {{ promotion.date_fin ? 'au ' + formatDate(promotion.date_fin) : '' }}
              </p>
            </div>

          </div>
        </div>

      </template>
    </div>

    <!-- Modal modification -->
    <Teleport to="body">
      <div
        v-if="showEdition"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="!editionLoading && (showEdition = false)"
      >
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Modifier le groupe</h2>
          </div>
          <form class="flex flex-col gap-4 px-6 py-5" @submit.prevent="handleModifier">
            <InfoBanner v-if="editionError" variant="error" :message="editionError" />
            <FormField label="Nom" required>
              <TextInput v-model="edition.nom" :disabled="editionLoading" />
            </FormField>
            <FormField label="Description">
              <TextInput v-model="edition.description" type="textarea" :rows="3" :disabled="editionLoading" />
            </FormField>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="editionLoading" @click="showEdition = false">Annuler</AppButton>
              <AppButton type="submit" :loading="editionLoading">Enregistrer</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal confirmation -->
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
              <AppButton variant="secondary" :disabled="confirmationLoading" @click="fermerConfirmation">Annuler</AppButton>
              <AppButton variant="danger" :loading="confirmationLoading" @click="confirmer">{{ confirmation.libelle }}</AppButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

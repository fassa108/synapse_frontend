<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import DataTable from '../../components/ui/DataTable.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import { useAuthStore } from '../../stores/auth'
import SuspensionMembreModal from '../../components/membres/SuspensionMembreModal.vue'
import { getMembres, inviterMembre } from '../../services/membres'
import { getPromotions, getInscriptions } from '../../services/pedagogie'
import { isValidEmail } from '../../utils/validation'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const apprenants     = ref([])
const promotions     = ref([])
const inscriptionMap = ref({}) // utilisateurId → { promotionNom, formationNom }
const loading        = ref(true)
const error          = ref('')
const search         = ref('')
const page           = ref(1)
const PAGE_SIZE      = 20

const showModal       = ref(false)
// Formulaire d'invitation : uniquement prénom, nom, email.
// La promotion n'est PAS proposée ici car le backend refuse d'inscrire
// un utilisateur dont le compte n'est pas encore activé.
// L'inscription en promotion se fait depuis le détail de la promotion,
// une fois le compte activé.
const inviteForm      = ref({ prenom: '', nom: '', email: '' })
const inviteErrors    = ref({})
const inviteGlobalErr = ref('')
const inviteLoading   = ref(false)
const inviteSuccess   = ref('')

const columns = [
  { key: 'nom',              label: 'Apprenant' },
  { key: 'email',            label: 'Email' },
  { key: 'promotion',        label: 'Promotion' },
  { key: 'formation',        label: 'Formation' },
  { key: 'statut_organisme', label: 'Accès',  width: '110px' },
  { key: 'statut_compte',    label: 'Compte',     width: '120px' },
  { key: 'actions', label: 'Actions', width: '90px' },
]

// ─── Suspension d'accès ───────────────────────────────────────────────────────
const membreCible = ref(null)

const handleMembreModifie = (membre) => {
  apprenants.value = apprenants.value.map((m) => (m.id === membre.id ? membre : m))
  membreCible.value = null
}

onMounted(async () => {
  try {
    const [membres, proms] = await Promise.all([
      getMembres(tenantId),
      getPromotions(tenantId),
    ])
    apprenants.value = membres.filter((m) => m.role === 'APPRENANT')
    promotions.value = proms

    // Construire la map inscription : utilisateurId → { promotionNom, formationNom }
    // On charge les inscriptions actives pour chaque promotion en parallèle.
    const inscritsParPromo = await Promise.all(
      proms.map((p) =>
        getInscriptions(tenantId, p.id, { actif: 'true' })
          .then((ins) => ({ promo: p, ins }))
          .catch(() => ({ promo: p, ins: [] }))
      )
    )

    // Charger les formations une seule fois pour les noms
    let formationNoms = {}
    try {
      const { getFormations } = await import('../../services/pedagogie')
      const forms = await getFormations(tenantId)
      forms.forEach((f) => { formationNoms[f.id] = f.nom })
    } catch { /* non bloquant */ }

    inscritsParPromo.forEach(({ promo, ins }) => {
      ins.forEach((i) => {
        inscriptionMap.value[i.apprenant] = {
          promotionNom: promo.nom,
          formationNom: formationNoms[promo.formation] ?? '—',
          promotionId:  promo.id,
          formationId:  promo.formation,
        }
      })
    })
  } catch {
    error.value = 'Impossible de charger les apprenants.'
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  if (!search.value.trim()) return apprenants.value
  const q = search.value.toLowerCase()
  return apprenants.value.filter(
    (a) =>
      (a.utilisateur_prenom ?? '').toLowerCase().includes(q) ||
      (a.utilisateur_nom    ?? '').toLowerCase().includes(q) ||
      (a.utilisateur_email  ?? '').toLowerCase().includes(q)
  )
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const statsApp = computed(() => ({
  total:  apprenants.value.length,
  // Apprenants avec compte activé (Utilisateur.actif = true)
  actifs: apprenants.value.filter((a) => a.utilisateur_actif === true).length,
}))

const nomApprenant = (m) =>
  m.utilisateur_prenom
    ? `${m.utilisateur_prenom} ${m.utilisateur_nom}`
    : `Apprenant #${m.utilisateur}`

// ─── Validation invitation ────────────────────────────────────────────────────
// Le backend AjouterMembreSerializer exige :
//   - email  : obligatoire
//   - nom    : obligatoire si l'email n'existe pas encore dans la plateforme
//   - prenom : obligatoire si l'email n'existe pas encore dans la plateforme
// On demande toujours les trois pour couvrir le cas d'un nouvel utilisateur.
// Si l'email existe déjà, le backend ignore nom/prenom et ajoute le membre.
const validateInvite = () => {
  inviteErrors.value = {}
  if (!inviteForm.value.email.trim()) {
    inviteErrors.value.email = "L'adresse e-mail est obligatoire."
  } else if (!isValidEmail(inviteForm.value.email)) {
    inviteErrors.value.email = "L'adresse e-mail n'est pas valide."
  }
  if (!inviteForm.value.prenom.trim()) {
    inviteErrors.value.prenom = 'Le prénom est obligatoire.'
  }
  if (!inviteForm.value.nom.trim()) {
    inviteErrors.value.nom = 'Le nom est obligatoire.'
  }
  return Object.keys(inviteErrors.value).length === 0
}

const handleInviter = async () => {
  if (!validateInvite()) return

  inviteLoading.value   = true
  inviteGlobalErr.value = ''
  inviteSuccess.value   = ''

  try {
    await inviterMembre(tenantId, {
      prenom: inviteForm.value.prenom.trim(),
      nom:    inviteForm.value.nom.trim(),
      email:  inviteForm.value.email.trim(),
      role:   'APPRENANT',
    })

    // Message honnête : on confirme uniquement la création du compte,
    // pas l'envoi d'un email (la tâche Celery d'envoi n'est pas encore
    // implémentée côté backend).
    inviteSuccess.value =
      'Compte créé avec succès. L\'apprenant pourra être inscrit dans une promotion après activation de son compte.'

    // Rafraîchir la liste
    const membres = await getMembres(tenantId)
    apprenants.value = membres.filter((m) => m.role === 'APPRENANT')

    // Réinitialiser le formulaire
    inviteForm.value = { prenom: '', nom: '', email: '' }
  } catch (e) {
    const data = e.response?.data
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        const msg = Array.isArray(data[key]) ? data[key][0] : data[key]
        if (key === 'non_field_errors' || key === 'detail') {
          inviteGlobalErr.value = msg
        } else {
          inviteErrors.value[key] = msg
        }
      })
    } else {
      inviteGlobalErr.value = "Une erreur est survenue lors de la création du compte."
    }
  } finally {
    inviteLoading.value = false
  }
}

const closeModal = () => {
  showModal.value       = false
  inviteForm.value      = { prenom: '', nom: '', email: '' }
  inviteErrors.value    = {}
  inviteGlobalErr.value = ''
  inviteSuccess.value   = ''
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader titre="Apprenants" description="Gérez les apprenants de votre organisme.">
        <template #actions>
          <AppButton variant="primary" icon="fa-solid fa-user-plus" @click="showModal = true">
            Ajouter un apprenant
          </AppButton>
        </template>
      </PageHeader>

      <!-- KPI -->
      <div class="mt-5 grid grid-cols-2 gap-3">
        <StatCard
          label="Total apprenants"
          :value="loading ? '—' : statsApp.total"
          icon="fa-solid fa-user-graduate"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-700"
        />
        <StatCard
          label="Comptes activés"
          :value="loading ? '—' : statsApp.actifs"
          icon="fa-solid fa-circle-check"
          icon-background="bg-emerald-50"
          icon-color="text-emerald-700"
        />
      </div>

      <div class="mt-5 mb-4">
        <SearchInput v-model="search" placeholder="Rechercher un apprenant…" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-4" />

      <DataTable
        :columns="columns"
        :rows="paginated"
        :loading="loading"
        @row-click="(row) => router.push(`/apprenants/${row.utilisateur}`)"
      >
        <template #cell-nom="{ row }">
          <div class="flex items-center gap-3">
            <div
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-indigo-700"
            >
              {{ (row.utilisateur_prenom?.[0] ?? '?') + (row.utilisateur_nom?.[0] ?? '') }}
            </div>
            <span class="font-medium text-gray-900">{{ nomApprenant(row) }}</span>
          </div>
        </template>

        <template #cell-email="{ row }">
          <span class="text-zinc-500">{{ row.utilisateur_email ?? '—' }}</span>
        </template>

        <template #cell-promotion="{ row }">
          <span class="text-zinc-600">{{ inscriptionMap[row.utilisateur]?.promotionNom ?? '—' }}</span>
        </template>

        <template #cell-formation="{ row }">
          <span class="text-zinc-500">{{ inscriptionMap[row.utilisateur]?.formationNom ?? '—' }}</span>
        </template>

        <template #cell-statut_organisme="{ row }">
          <!-- MembreTenant.actif : appartenance active à l'organisme -->
          <StatusBadge :value="row.actif" type="membre" />
        </template>
        <template #cell-actions="{ row }">
          <!-- Icône seule, libellé affiché au survol -->
          <button
            type="button"
            class="group/action relative flex h-8 w-8 items-center justify-center rounded-lg transition"
            :class="row.actif
              ? 'text-red-600 hover:bg-red-50'
              : 'text-indigo-600 hover:bg-indigo-50'"
            :aria-label="row.actif ? 'Suspendre' : 'Réactiver'"
            @click.stop="membreCible = row"
          >
            <i :class="row.actif ? 'fa-solid fa-pause' : 'fa-solid fa-play'" class="text-xs"></i>
            <span
              class="pointer-events-none absolute right-full top-1/2 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 font-['Plus_Jakarta_Sans'] text-xs font-medium text-white opacity-0 shadow transition group-hover/action:opacity-100"
            >
              {{ row.actif ? 'Suspendre' : 'Réactiver' }}
            </span>
          </button>
        </template>

        <template #cell-statut_compte="{ row }">
          <!-- Utilisateur.actif : compte utilisateur activé -->
          <StatusBadge :value="row.utilisateur_actif" type="compte" />
        </template>

        <template #empty>
          <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
            <i class="fa-solid fa-user-graduate text-2xl"></i>
            <span class="text-sm">
              {{ search ? 'Aucun résultat.' : 'Aucun apprenant pour le moment.' }}
            </span>
            <AppButton
              v-if="!search"
              variant="secondary"
              icon="fa-solid fa-user-plus"
              @click="showModal = true"
            >
              Ajouter le premier apprenant
            </AppButton>
          </div>
        </template>
      </DataTable>

      <div class="mt-4">
        <AppPagination v-model:page="page" :total="filtered.length" :page-size="PAGE_SIZE" />
      </div>

    </div>

    <!-- ─── Modal : créer un apprenant ──────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">

          <!-- En-tête -->
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
              Ajouter un apprenant
            </h2>
            <button
              type="button"
              @click="closeModal"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
              aria-label="Fermer"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Corps -->
          <div class="px-6 py-5">
            <InfoBanner
              v-if="inviteSuccess"
              variant="success"
              :message="inviteSuccess"
              class="mb-4"
            />
            <InfoBanner
              v-if="inviteGlobalErr"
              variant="error"
              :message="inviteGlobalErr"
              class="mb-4"
            />

            <form
              v-if="!inviteSuccess"
              @submit.prevent="handleInviter"
              class="flex flex-col gap-4"
              novalidate
            >
              <div class="grid grid-cols-2 gap-3">
                <FormField label="Prénom" :error="inviteErrors.prenom" required>
                  <TextInput
                    v-model="inviteForm.prenom"
                    placeholder="Marie"
                    :disabled="inviteLoading"
                  />
                </FormField>
                <FormField label="Nom" :error="inviteErrors.nom" required>
                  <TextInput
                    v-model="inviteForm.nom"
                    placeholder="Dupont"
                    :disabled="inviteLoading"
                  />
                </FormField>
              </div>

              <FormField
                label="Adresse e-mail"
                :error="inviteErrors.email"
                required
                hint="Si ce compte existe déjà, il sera simplement ajouté à l'organisme."
              >
                <TextInput
                  v-model="inviteForm.email"
                  type="email"
                  placeholder="marie.dupont@exemple.fr"
                  :disabled="inviteLoading"
                />
              </FormField>

              <!-- Note métier : pas de sélection de promotion ici.
                   L'inscription se fait depuis le détail d'une promotion,
                   une fois le compte activé par l'apprenant. -->
              <InfoBanner
                variant="info"
                message="L'inscription dans une promotion pourra être effectuée depuis la page de la promotion, après activation du compte."
              />

              <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <AppButton
                  type="button"
                  variant="secondary"
                  @click="closeModal"
                  :disabled="inviteLoading"
                >
                  Annuler
                </AppButton>
                <AppButton type="submit" variant="primary" :loading="inviteLoading">
                  Créer le compte
                </AppButton>
              </div>
            </form>

            <!-- État succès -->
            <div v-else class="flex justify-end pt-2">
              <AppButton variant="primary" @click="closeModal">Fermer</AppButton>
            </div>
          </div>

        </div>
      </div>
    </Teleport>


    <SuspensionMembreModal
      :membre="membreCible"
      :tenant-id="tenantId"
      libelle="apprenant"
      @close="membreCible = null"
      @updated="handleMembreModifie"
    />

  </AppLayout>
</template>

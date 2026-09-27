<script setup>
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import DataTable from '../../components/ui/DataTable.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import SuspensionMembreModal from '../../components/membres/SuspensionMembreModal.vue'
import { getMembres, inviterMembre } from '../../services/membres'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import { isValidEmail } from '../../utils/validation'

const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const formateurs = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const page = ref(1)
const PAGE_SIZE = 20

const showModal = ref(false)
const inviteForm = ref({ prenom: '', nom: '', email: '' })
const inviteErrors = ref({})
const inviteGlobalError = ref('')
const inviteLoading = ref(false)
const inviteSuccess = ref('')

const columns = [
  { key: 'nom',               label: 'Formateur' },
  { key: 'email',             label: 'Email' },
  { key: 'statut_organisme',  label: 'Accès',  width: '120px' },
  { key: 'statut_compte',     label: 'Compte',     width: '120px' },
  { key: 'actions', label: 'Actions', width: '90px' },
]

import { computed } from 'vue'

// ─── Suspension d'accès ───────────────────────────────────────────────────────
const membreCible = ref(null)

const handleMembreModifie = (membre) => {
  formateurs.value = formateurs.value.map((m) => (m.id === membre.id ? membre : m))
  membreCible.value = null
}

onMounted(async () => {
  try {
    const membres = await getMembres(tenantId)
    formateurs.value = membres.filter((m) => m.role === 'FORMATEUR')
  } catch {
    error.value = 'Impossible de charger les formateurs.'
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  if (!search.value.trim()) return formateurs.value
  const q = search.value.toLowerCase()
  return formateurs.value.filter(
    (f) =>
      String(f.utilisateur_prenom ?? '').toLowerCase().includes(q) ||
      String(f.utilisateur_nom ?? '').toLowerCase().includes(q) ||
      String(f.utilisateur_email ?? '').toLowerCase().includes(q)
  )
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const nomFormateur = (m) =>
  m.utilisateur_prenom
    ? `${m.utilisateur_prenom} ${m.utilisateur_nom}`
    : `Formateur #${m.utilisateur}`

const validateInvite = () => {
  inviteErrors.value = {}
  if (!inviteForm.value.prenom.trim()) inviteErrors.value.prenom = 'Le prénom est obligatoire.'
  if (!inviteForm.value.nom.trim()) inviteErrors.value.nom = 'Le nom est obligatoire.'
  if (!inviteForm.value.email.trim()) {
    inviteErrors.value.email = "L'email est obligatoire."
  } else if (!isValidEmail(inviteForm.value.email)) {
    inviteErrors.value.email = "L'adresse e-mail n'est pas valide."
  }
  return Object.keys(inviteErrors.value).length === 0
}

const handleInviter = async () => {
  if (!validateInvite()) return
  inviteLoading.value = true
  inviteGlobalError.value = ''
  inviteSuccess.value = ''
  try {
    await inviterMembre(tenantId, {
      prenom: inviteForm.value.prenom.trim(),
      nom: inviteForm.value.nom.trim(),
      email: inviteForm.value.email.trim(),
      role: 'FORMATEUR',
    })
    inviteSuccess.value = 'Compte créé avec succès. Le formateur pourra se connecter après activation de son compte.'
    const membres = await getMembres(tenantId)
    formateurs.value = membres.filter((m) => m.role === 'FORMATEUR')
    inviteForm.value = { prenom: '', nom: '', email: '' }
  } catch (e) {
    const data = e.response?.data
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        const msg = Array.isArray(data[key]) ? data[key][0] : data[key]
        if (key === 'non_field_errors' || key === 'detail') inviteGlobalError.value = msg
        else inviteErrors.value[key] = msg
      })
    } else {
      inviteGlobalError.value = "Erreur lors de l'invitation."
    }
  } finally {
    inviteLoading.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  inviteForm.value = { prenom: '', nom: '', email: '' }
  inviteErrors.value = {}
  inviteGlobalError.value = ''
  inviteSuccess.value = ''
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Formateurs"
        description="Gérez les formateurs de votre organisme."
      >
        <template #actions>
          <AppButton variant="primary" icon="fa-solid fa-user-plus" @click="showModal = true">
            Ajouter un formateur
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-6 mb-4 flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
        <i class="fa-solid fa-chalkboard-user text-orange-400"></i>
        <span>
          <strong class="text-gray-900">{{ formateurs.length }}</strong>
          formateur{{ formateurs.length !== 1 ? 's' : '' }} dans cet organisme
        </span>
      </div>

      <div class="mb-4">
        <SearchInput v-model="search" placeholder="Rechercher un formateur…" />
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-4" />

      <DataTable :columns="columns" :rows="paginated" :loading="loading">
        <template #cell-nom="{ row }">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-orange-700">
              {{ (row.utilisateur_prenom?.[0] ?? '?') + (row.utilisateur_nom?.[0] ?? '') }}
            </div>
            <p class="font-medium text-gray-900">{{ nomFormateur(row) }}</p>
          </div>
        </template>
        <template #cell-email="{ row }">
          <span class="text-zinc-600">{{ row.utilisateur_email ?? '—' }}</span>
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
            <i class="fa-solid fa-chalkboard-user text-3xl"></i>
            <span class="text-sm">{{ search ? 'Aucun résultat.' : 'Aucun formateur pour le moment.' }}</span>
          </div>
        </template>
      </DataTable>

      <div class="mt-4">
        <AppPagination v-model:page="page" :total="filtered.length" :page-size="PAGE_SIZE" />
      </div>

    </div>

    <!-- Modal invitation -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
              Ajouter un formateur
            </h2>
            <button type="button" @click="closeModal" class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="px-6 py-5">
            <InfoBanner v-if="inviteSuccess" variant="success" :message="inviteSuccess" class="mb-4" />
            <InfoBanner v-if="inviteGlobalError" variant="error" :message="inviteGlobalError" class="mb-4" />
            <form v-if="!inviteSuccess" @submit.prevent="handleInviter" class="flex flex-col gap-4" novalidate>
              <div class="grid grid-cols-2 gap-3">
                <FormField label="Prénom" :error="inviteErrors.prenom" required>
                  <TextInput v-model="inviteForm.prenom" placeholder="Jean" :disabled="inviteLoading" />
                </FormField>
                <FormField label="Nom" :error="inviteErrors.nom" required>
                  <TextInput v-model="inviteForm.nom" placeholder="Martin" :disabled="inviteLoading" />
                </FormField>
              </div>
              <FormField label="Adresse e-mail" :error="inviteErrors.email" required>
                <TextInput v-model="inviteForm.email" type="email" placeholder="jean.martin@exemple.fr" :disabled="inviteLoading" />
              </FormField>
              <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <AppButton type="button" variant="secondary" @click="closeModal" :disabled="inviteLoading">Annuler</AppButton>
                <AppButton type="submit" variant="primary" :loading="inviteLoading">Créer le compte</AppButton>
              </div>
            </form>
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
      libelle="formateur"
      @close="membreCible = null"
      @updated="handleMembreModifie"
    />

  </AppLayout>
</template>

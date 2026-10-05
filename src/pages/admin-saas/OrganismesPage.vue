<script setup>
/**
 * OrganismesPage — Admin SaaS
 *
 * - Indicateurs globaux de la plateforme
 * - Liste des organismes (clic → fiche)
 * - Création d'un organisme avec son premier administrateur
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import FilterSelect from '../../components/ui/FilterSelect.vue'
import DataTable from '../../components/ui/DataTable.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useTenants } from '../../composables/useTenants'
import { creerOrganisme, recupererIndicateursGlobaux } from '../../services/tenants'

const router = useRouter()
const { organismes, isLoading, errorMessage, chargerOrganismes } = useTenants()

const indicateurs  = ref(null)
const search       = ref('')
const filtreStatut = ref('')
const page         = ref(1)
const PAGE_SIZE    = 20

const statutOptions = [
  { value: 'true',  label: 'Actif' },
  { value: 'false', label: 'Suspendu' },
]

const columns = [
  { key: 'nom',            label: 'Organisme' },
  { key: 'code',           label: 'Code',          width: '130px' },
  { key: 'admin',          label: 'Administrateur' },
  { key: 'membres',        label: 'Membres',       width: '110px' },
  { key: 'statut',         label: 'Statut',        width: '110px' },
  { key: 'date_creation',  label: 'Créé le',       width: '120px' },
]

const chargerIndicateurs = async () => {
  try {
    indicateurs.value = await recupererIndicateursGlobaux()
  } catch {
    indicateurs.value = null
  }
}

onMounted(() => {
  chargerOrganismes()
  chargerIndicateurs()
})

const filtered = computed(() => {
  let list = organismes.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (o) =>
        o.nom.toLowerCase().includes(q) ||
        o.code?.toLowerCase().includes(q)
    )
  }
  if (filtreStatut.value !== '') {
    list = list.filter((o) => String(o.statut) === filtreStatut.value)
  }
  return list
})

const paginated = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const kpi = (cle) => (indicateurs.value ? indicateurs.value[cle] : '—')

const nbMembres = (o) =>
  (o.indicateurs?.nb_administrateurs ?? 0) +
  (o.indicateurs?.nb_formateurs ?? 0) +
  (o.indicateurs?.nb_apprenants ?? 0)

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

const goDetail = (row) => router.push(`/admin/organismes/${row.id}`)

// ─── Création ─────────────────────────────────────────────────────────────────
const showCreation   = ref(false)
const creationLoading = ref(false)
const creationError  = ref('')
const erreursChamps  = ref({})

const formVide = () => ({
  nom: '',
  email: '',
  telephone: '',
  adresse: '',
  site_web: '',
  admin_email: '',
  admin_prenom: '',
  admin_nom: '',
})
const form = reactive(formVide())

const ouvrirCreation = () => {
  Object.assign(form, formVide())
  creationError.value = ''
  erreursChamps.value = {}
  showCreation.value = true
}

const fermerCreation = () => {
  if (!creationLoading.value) showCreation.value = false
}

const premiereErreur = (valeur) => (Array.isArray(valeur) ? valeur[0] : valeur)

const handleCreer = async () => {
  creationError.value = ''
  erreursChamps.value = {}

  if (!form.nom.trim() || !form.admin_email.trim()) {
    creationError.value = "Le nom de l'organisme et l'email de l'administrateur sont obligatoires."
    return
  }

  creationLoading.value = true

  try {
    // Les champs vides ne sont pas envoyés
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v.trim() !== '')
    )
    const organisme = await creerOrganisme(payload)

    showCreation.value = false
    chargerIndicateurs()
    router.push(`/admin/organismes/${organisme.id}`)
  } catch (e) {
    const data = e.response?.data
    if (data && typeof data === 'object' && !data.detail) {
      erreursChamps.value = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, premiereErreur(v)])
      )
      creationError.value = 'Veuillez corriger les champs indiqués.'
    } else {
      creationError.value = data?.detail ?? "Une erreur est survenue lors de la création."
    }
  } finally {
    creationLoading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Organismes"
        description="Gérez les organismes enregistrés sur la plateforme."
      >
        <template #actions>
          <AppButton icon="fa-solid fa-plus" @click="ouvrirCreation">
            Nouvel organisme
          </AppButton>
        </template>
      </PageHeader>

      <!-- Indicateurs globaux -->
      <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Organismes"
          :value="kpi('nb_organismes')"
          icon="fa-solid fa-building"
          icon-background="bg-slate-100"
          icon-color="text-slate-600"
        />
        <StatCard
          label="Actifs"
          :value="kpi('nb_organismes_actifs')"
          icon="fa-solid fa-circle-check"
          icon-background="bg-emerald-50"
          icon-color="text-emerald-700"
        />
        <StatCard
          label="Suspendus"
          :value="kpi('nb_organismes_suspendus')"
          icon="fa-solid fa-pause"
          icon-background="bg-amber-50"
          icon-color="text-amber-600"
        />
        <StatCard
          label="Utilisateurs"
          :value="kpi('nb_utilisateurs')"
          icon="fa-solid fa-users"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-600"
        />
        <StatCard
          label="Formations"
          :value="kpi('nb_formations')"
          icon="fa-solid fa-book-open"
          icon-background="bg-sky-50"
          icon-color="text-sky-600"
        />
        <StatCard
          label="Promotions"
          :value="kpi('nb_promotions')"
          icon="fa-solid fa-user-graduate"
          icon-background="bg-violet-50"
          icon-color="text-violet-600"
        />
      </div>

      <!-- Filtres -->
      <div class="mt-5 flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-48">
          <SearchInput v-model="search" placeholder="Rechercher un organisme…" />
        </div>
        <FilterSelect
          v-model="filtreStatut"
          :options="statutOptions"
          placeholder="Tous les statuts"
        />
      </div>

      <InfoBanner v-if="errorMessage" variant="error" :message="errorMessage" class="mt-4" />

      <div class="mt-4">
        <DataTable
          :columns="columns"
          :rows="paginated"
          :loading="isLoading"
          @row-click="goDetail"
        >
          <template #cell-nom="{ row }">
            <div class="flex items-center gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-slate-600">
                {{ row.nom?.[0]?.toUpperCase() }}
              </div>
              <div>
                <span class="font-semibold text-gray-900">{{ row.nom }}</span>
                <p v-if="row.adresse" class="mt-0.5 line-clamp-1 text-xs text-zinc-400">{{ row.adresse }}</p>
              </div>
            </div>
          </template>

          <template #cell-code="{ row }">
            <span class="font-mono text-xs text-zinc-500">{{ row.code }}</span>
          </template>

          <template #cell-admin="{ row }">
            <span v-if="row.administrateurs?.length" class="text-zinc-600">
              {{ row.administrateurs[0].email }}
              <span v-if="row.administrateurs.length > 1" class="text-zinc-400">
                (+{{ row.administrateurs.length - 1 }})
              </span>
            </span>
            <span v-else class="text-zinc-400">—</span>
          </template>

          <template #cell-membres="{ row }">
            <span class="font-medium text-zinc-700">{{ nbMembres(row) }}</span>
          </template>

          <template #cell-statut="{ row }">
            <StatusBadge :value="row.statut" type="organisme" />
          </template>

          <template #cell-date_creation="{ row }">
            <span class="text-zinc-500">{{ formatDate(row.date_creation) }}</span>
          </template>

          <template #empty>
            <div class="flex flex-col items-center gap-2 py-8 text-zinc-400">
              <i class="fa-solid fa-building text-2xl"></i>
              <span class="font-['Plus_Jakarta_Sans'] text-sm">
                {{ search || filtreStatut ? 'Aucun résultat.' : 'Aucun organisme enregistré.' }}
              </span>
            </div>
          </template>
        </DataTable>
      </div>

      <div class="mt-4">
        <AppPagination
          v-model:page="page"
          :total="filtered.length"
          :page-size="PAGE_SIZE"
        />
      </div>

      <!-- Modal création -->
      <div
        v-if="showCreation"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="fermerCreation"
      >
        <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">

          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
                Nouvel organisme
              </h2>
              <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                L'administrateur recevra un email pour activer son compte.
              </p>
            </div>
            <button
              type="button"
              @click="fermerCreation"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
              aria-label="Fermer"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form class="flex flex-col gap-5 px-6 py-5" @submit.prevent="handleCreer">

            <InfoBanner v-if="creationError" variant="error" :message="creationError" />

            <div class="flex flex-col gap-4">
              <h3 class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Organisme
              </h3>
              <FormField label="Nom" required :error="erreursChamps.nom">
                <TextInput v-model="form.nom" placeholder="Ex. : Simplon Dakar" :disabled="creationLoading" />
              </FormField>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Email de contact" :error="erreursChamps.email">
                  <TextInput v-model="form.email" type="email" :disabled="creationLoading" />
                </FormField>
                <FormField label="Téléphone" :error="erreursChamps.telephone">
                  <TextInput v-model="form.telephone" :disabled="creationLoading" />
                </FormField>
              </div>
              <FormField label="Adresse" :error="erreursChamps.adresse">
                <TextInput v-model="form.adresse" :disabled="creationLoading" />
              </FormField>
              <FormField label="Site web" :error="erreursChamps.site_web">
                <TextInput v-model="form.site_web" placeholder="https://" :disabled="creationLoading" />
              </FormField>
            </div>

            <div class="flex flex-col gap-4 border-t border-slate-100 pt-5">
              <h3 class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Premier administrateur
              </h3>
              <FormField
                label="Email"
                required
                :error="erreursChamps.admin_email"
                hint="Si un compte existe déjà avec cet email, il devient administrateur de l'organisme."
              >
                <TextInput v-model="form.admin_email" type="email" :disabled="creationLoading" />
              </FormField>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Prénom" :error="erreursChamps.admin_prenom">
                  <TextInput v-model="form.admin_prenom" :disabled="creationLoading" />
                </FormField>
                <FormField label="Nom" :error="erreursChamps.admin_nom">
                  <TextInput v-model="form.admin_nom" :disabled="creationLoading" />
                </FormField>
              </div>
              <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Prénom et nom sont obligatoires pour un nouveau compte.
              </p>
            </div>

            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="creationLoading" @click="fermerCreation">
                Annuler
              </AppButton>
              <AppButton type="submit" :loading="creationLoading">
                Créer l'organisme
              </AppButton>
            </div>
          </form>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

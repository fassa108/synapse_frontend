<script setup>
/**
 * CategoriesPage — Admin Organisme
 *
 * Catégories de brief propres à l'organisme (ex. : Brief projet, TP,
 * Atelier, Veille). Elles servent uniquement à classer les briefs.
 * Une catégorie utilisée ne se supprime pas : on la désactive.
 */
import { ref, reactive, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import DataTable from '../../components/ui/DataTable.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import {
  getCategories,
  creerCategorie,
  modifierCategorie,
  supprimerCategorie,
} from '../../services/activites'

const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const categories  = ref([])
const loading     = ref(true)
const error       = ref('')
const pageSuccess = ref('')

const columns = [
  { key: 'nom',     label: 'Catégorie' },
  { key: 'actif',   label: 'Statut', width: '110px' },
  { key: 'actions', label: 'Actions', width: '110px' },
]

const statutOptions = [
  { value: 'true',  label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const charger = async () => {
  categories.value = await getCategories(tenantId)
}

onMounted(async () => {
  try {
    await charger()
  } catch {
    error.value = 'Impossible de charger les catégories.'
  } finally {
    loading.value = false
  }
})

const premier = (v) => (Array.isArray(v) ? v[0] : v)

// ─── Création / modification ──────────────────────────────────────────────────
const edition        = ref(null)
const editionLoading = ref(false)
const editionError   = ref('')
const form = reactive({ nom: '', actif: 'true' })

const ouvrir = (categorie = {}) => {
  Object.assign(form, { nom: categorie.nom ?? '', actif: String(categorie.actif ?? true) })
  editionError.value = ''
  edition.value = categorie
}

const enregistrer = async () => {
  if (!form.nom.trim()) {
    editionError.value = 'Le nom est obligatoire.'
    return
  }
  editionLoading.value = true
  editionError.value = ''
  try {
    const payload = { nom: form.nom.trim(), actif: form.actif === 'true' }
    if (edition.value.id) {
      await modifierCategorie(tenantId, edition.value.id, payload)
      pageSuccess.value = 'Catégorie modifiée.'
    } else {
      await creerCategorie(tenantId, payload)
      pageSuccess.value = 'Catégorie créée.'
    }
    await charger()
    edition.value = null
  } catch (e) {
    const d = e.response?.data
    editionError.value = d?.detail || premier(d?.nom) || "Impossible d'enregistrer la catégorie."
  } finally {
    editionLoading.value = false
  }
}

// ─── Suppression ──────────────────────────────────────────────────────────────
const aSupprimer         = ref(null)
const suppressionLoading = ref(false)
const suppressionError   = ref('')

const supprimer = async () => {
  suppressionLoading.value = true
  suppressionError.value = ''
  try {
    await supprimerCategorie(tenantId, aSupprimer.value.id)
    await charger()
    pageSuccess.value = 'Catégorie supprimée.'
    aSupprimer.value = null
  } catch (e) {
    suppressionError.value = e.response?.data?.detail ?? 'Impossible de supprimer cette catégorie.'
  } finally {
    suppressionLoading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader titre="Catégories" description="Pour classer les briefs de l'organisme : brief projet, TP, atelier, veille…">
        <template #actions>
          <AppButton icon="fa-solid fa-plus" @click="ouvrir()">Nouvelle catégorie</AppButton>
        </template>
      </PageHeader>

      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />
      <InfoBanner v-if="pageSuccess" variant="success" :message="pageSuccess" class="mt-4" />

      <div class="mt-5">
        <DataTable :columns="columns" :rows="categories" :loading="loading">
          <template #cell-nom="{ row }">
            <span class="font-semibold text-gray-900">{{ row.nom }}</span>
          </template>
          <template #cell-actif="{ row }">
            <StatusBadge :value="row.actif" type="boolean" />
          </template>
          <template #cell-actions="{ row }">
            <div class="flex items-center gap-1">
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-slate-100"
                      aria-label="Modifier" title="Modifier" @click="ouvrir(row)">
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      aria-label="Supprimer" title="Supprimer" @click="suppressionError = ''; aSupprimer = row">
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
            </div>
          </template>
          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-tags text-2xl"></i>
              <span class="text-sm">Aucune catégorie.</span>
              <p class="text-xs">Exemples : Brief projet, TP, Atelier, Veille</p>
            </div>
          </template>
        </DataTable>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="edition" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
           @click.self="!editionLoading && (edition = null)">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
              {{ edition.id ? 'Modifier la catégorie' : 'Nouvelle catégorie' }}
            </h2>
          </div>
          <form class="flex flex-col gap-4 px-6 py-5" @submit.prevent="enregistrer">
            <InfoBanner v-if="editionError" variant="error" :message="editionError" />
            <FormField label="Nom" required>
              <TextInput v-model="form.nom" placeholder="Ex. : Veille" :disabled="editionLoading" />
            </FormField>
            <FormField v-if="edition.id" label="Statut" hint="Une catégorie inactive n'est plus proposée pour les nouveaux briefs.">
              <AppSelect v-model="form.actif" :options="statutOptions" :disabled="editionLoading" />
            </FormField>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="editionLoading" @click="edition = null">Annuler</AppButton>
              <AppButton type="submit" :loading="editionLoading">Enregistrer</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="aSupprimer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
           @click.self="!suppressionLoading && (aSupprimer = null)">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Supprimer la catégorie</h2>
          </div>
          <div class="flex flex-col gap-4 px-6 py-5">
            <InfoBanner v-if="suppressionError" variant="error" :message="suppressionError" />
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
              Supprimer « {{ aSupprimer.nom }} » ? Une catégorie utilisée par des briefs ne peut pas être supprimée :
              désactivez-la à la place.
            </p>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="suppressionLoading" @click="aSupprimer = null">Annuler</AppButton>
              <AppButton variant="danger" :loading="suppressionLoading" @click="supprimer">Supprimer</AppButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

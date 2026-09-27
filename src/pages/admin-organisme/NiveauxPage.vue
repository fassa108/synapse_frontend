<script setup>
/**
 * NiveauxPage — Admin Organisme
 *
 * Niveaux de maîtrise de l'organisme (ex. : Imiter, Adapter, Transposer),
 * communs à toutes les formations. Chaque compétence peut ensuite être
 * décrite pour tout ou partie de ces niveaux (fiche du module).
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
  getNiveaux,
  creerNiveau,
  modifierNiveau,
  supprimerNiveau,
} from '../../services/pedagogie'

const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const niveaux     = ref([])
const loading     = ref(true)
const error       = ref('')
const pageSuccess = ref('')

const columns = [
  { key: 'ordre',       label: 'Ordre',  width: '80px' },
  { key: 'nom',         label: 'Niveau' },
  { key: 'actif',       label: 'Statut', width: '110px' },
  { key: 'actions',     label: 'Actions', width: '110px' },
]

const charger = async () => {
  niveaux.value = await getNiveaux(tenantId)
}

onMounted(async () => {
  try {
    await charger()
  } catch {
    error.value = 'Impossible de charger les niveaux.'
  } finally {
    loading.value = false
  }
})

const premier = (v) => (Array.isArray(v) ? v[0] : v)

// ─── Création / modification ──────────────────────────────────────────────────
const edition        = ref(null) // null = fermé, sinon niveau édité (ou {} en création)
const editionLoading = ref(false)
const editionError   = ref('')
const erreursChamps  = ref({})
const form = reactive({ nom: '', ordre: '', actif: 'true' })

const statutOptions = [
  { value: 'true',  label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

const ouvrirCreation = () => {
  const ordreSuivant = niveaux.value.reduce((max, n) => Math.max(max, n.ordre), 0) + 1
  Object.assign(form, { nom: '', ordre: String(ordreSuivant), actif: 'true' })
  editionError.value  = ''
  erreursChamps.value = {}
  edition.value = {}
}

const ouvrirModification = (niveau) => {
  Object.assign(form, {
    nom: niveau.nom,
    ordre: String(niveau.ordre),
    actif: String(niveau.actif),
  })
  editionError.value  = ''
  erreursChamps.value = {}
  edition.value = niveau
}

const fermerEdition = () => {
  if (!editionLoading.value) edition.value = null
}

const handleEnregistrer = async () => {
  erreursChamps.value = {}
  if (!form.nom.trim()) erreursChamps.value.nom = 'Le nom est obligatoire.'
  if (!form.ordre || parseInt(form.ordre) < 1) erreursChamps.value.ordre = "L'ordre doit être supérieur ou égal à 1."
  if (Object.keys(erreursChamps.value).length) return

  const payload = {
    nom: form.nom.trim(),
    ordre: parseInt(form.ordre),
    actif: form.actif === 'true',
  }

  editionLoading.value = true
  editionError.value   = ''
  try {
    if (edition.value.id) {
      await modifierNiveau(tenantId, edition.value.id, payload)
      pageSuccess.value = 'Niveau modifié.'
    } else {
      await creerNiveau(tenantId, payload)
      pageSuccess.value = 'Niveau créé.'
    }
    await charger()
    edition.value = null
  } catch (e) {
    const data = e.response?.data
    if (data?.detail) {
      editionError.value = data.detail
    } else if (data && typeof data === 'object') {
      erreursChamps.value = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, premier(v)])
      )
      if (data.non_field_errors) editionError.value = premier(data.non_field_errors)
    } else {
      editionError.value = "Impossible d'enregistrer le niveau."
    }
  } finally {
    editionLoading.value = false
  }
}

// ─── Suppression ──────────────────────────────────────────────────────────────
const aSupprimer          = ref(null)
const suppressionLoading  = ref(false)
const suppressionError    = ref('')

const demanderSuppression = (niveau) => {
  suppressionError.value = ''
  aSupprimer.value = niveau
}

const handleSupprimer = async () => {
  suppressionLoading.value = true
  suppressionError.value   = ''
  try {
    await supprimerNiveau(tenantId, aSupprimer.value.id)
    await charger()
    pageSuccess.value = 'Niveau supprimé.'
    aSupprimer.value = null
  } catch (e) {
    // Niveau déjà utilisé pour décrire des compétences : le désactiver
    suppressionError.value = e.response?.data?.detail ?? 'Impossible de supprimer ce niveau.'
  } finally {
    suppressionLoading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader
        titre="Niveaux"
        description="Niveaux de maîtrise communs à toutes les formations de l'organisme."
      >
        <template #actions>
          <AppButton icon="fa-solid fa-plus" @click="ouvrirCreation">Nouveau niveau</AppButton>
        </template>
      </PageHeader>

      <InfoBanner
        variant="info"
        message="Ce que l'apprenant doit savoir faire à chaque niveau se décrit compétence par compétence, depuis la fiche du module."
        class="mt-5"
      />
      <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />
      <InfoBanner v-if="pageSuccess" variant="success" :message="pageSuccess" class="mt-4" />

      <div class="mt-4">
        <DataTable :columns="columns" :rows="niveaux" :loading="loading">
          <template #cell-ordre="{ row }">
            <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 font-mono text-xs font-bold text-indigo-600">
              {{ row.ordre }}
            </span>
          </template>
          <template #cell-nom="{ row }">
            <span class="font-semibold text-gray-900">{{ row.nom }}</span>
          </template>
          <template #cell-actif="{ row }">
            <StatusBadge :value="row.actif" type="boolean" />
          </template>
          <template #cell-actions="{ row }">
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-slate-100"
                aria-label="Modifier"
                title="Modifier"
                @click="ouvrirModification(row)"
              >
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                aria-label="Supprimer"
                title="Supprimer"
                @click="demanderSuppression(row)"
              >
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
            </div>
          </template>
          <template #empty>
            <div class="flex flex-col items-center gap-2 py-6 text-zinc-400">
              <i class="fa-solid fa-stairs text-2xl"></i>
              <span class="text-sm">Aucun niveau défini.</span>
              <p class="text-xs">Exemple : 1. Imiter · 2. Adapter · 3. Transposer</p>
            </div>
          </template>
        </DataTable>
      </div>

    </div>

    <!-- Modal création / modification -->
    <Teleport to="body">
      <div
        v-if="edition"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="fermerEdition"
      >
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
              {{ edition.id ? 'Modifier le niveau' : 'Nouveau niveau' }}
            </h2>
          </div>
          <form class="flex flex-col gap-4 px-6 py-5" @submit.prevent="handleEnregistrer">
            <InfoBanner v-if="editionError" variant="error" :message="editionError" />
            <div class="grid grid-cols-3 gap-3">
              <FormField label="Ordre" required :error="erreursChamps.ordre">
                <TextInput v-model="form.ordre" type="number" :disabled="editionLoading" />
              </FormField>
              <div class="col-span-2">
                <FormField label="Nom" required :error="erreursChamps.nom">
                  <TextInput v-model="form.nom" placeholder="Ex. : Imiter" :disabled="editionLoading" />
                </FormField>
              </div>
            </div>
            <FormField v-if="edition.id" label="Statut" hint="Un niveau inactif est conservé mais ne sert plus pour de nouvelles descriptions.">
              <AppSelect v-model="form.actif" :options="statutOptions" :disabled="editionLoading" />
            </FormField>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="editionLoading" @click="fermerEdition">Annuler</AppButton>
              <AppButton type="submit" :loading="editionLoading">Enregistrer</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal suppression -->
    <Teleport to="body">
      <div
        v-if="aSupprimer"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="!suppressionLoading && (aSupprimer = null)"
      >
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Supprimer le niveau</h2>
          </div>
          <div class="flex flex-col gap-4 px-6 py-5">
            <InfoBanner v-if="suppressionError" variant="error" :message="suppressionError" />
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
              Supprimer le niveau « {{ aSupprimer.nom }} » ? Un niveau déjà utilisé pour décrire
              des compétences ne peut pas être supprimé : désactivez-le à la place.
            </p>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="suppressionLoading" @click="aSupprimer = null">Annuler</AppButton>
              <AppButton variant="danger" :loading="suppressionLoading" @click="handleSupprimer">Supprimer</AppButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

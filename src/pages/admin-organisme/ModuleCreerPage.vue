<script setup>
import { ref, onMounted } from 'vue'
import { useFormulaire } from '../../composables/useFormulaire'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { creerModule, getFormations, getModules } from '../../services/pedagogie'

const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const formations = ref([])
const formationOptions = ref([])
const loadingFormations = ref(true)

const form = ref({
  nom: '',
  formation: '',
  description: '',
  ordre: '',
  actif: 'true',
})

const globalError = ref('')
const loading = ref(false)

const statutOptions = [
  { value: 'true',  label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

onMounted(async () => {
  try {
    formations.value = await getFormations(tenantId)
    formationOptions.value = formations.value.map((f) => ({
      value: String(f.id),
      label: f.nom,
    }))
  } finally {
    loadingFormations.value = false
  }
})

// Suggérer un ordre automatique selon la formation choisie
const handleFormationChange = async () => {
  if (!form.value.formation) return
  try {
    const mods = await getModules(tenantId, { formation: form.value.formation })
    const maxOrdre = mods.reduce((max, m) => Math.max(max, m.ordre), 0)
    form.value.ordre = String(maxOrdre + 1)
  } catch {
    // pas critique
  }
}

const { erreur, surSortie, toutVerifier, erreursDuServeur } = useFormulaire({
  formation: () => (form.value.formation ? '' : 'La formation est obligatoire.'),
  nom: () => (form.value.nom.trim() ? '' : 'Le nom est obligatoire.'),
  description: () => '',
  ordre: () => {
    const ordre = String(form.value.ordre ?? '').trim()
    if (!ordre) return "L'ordre est obligatoire."
    return parseInt(ordre) < 1 ? "L'ordre doit être ≥ 1." : ''
  },
  actif: () => '',
}, { valeurs: form.value })

const handleSubmit = async () => {
  if (!toutVerifier()) return
  loading.value = true
  globalError.value = ''

  try {
    const module = await creerModule(tenantId, {
      nom: form.value.nom.trim(),
      formation: parseInt(form.value.formation),
      description: form.value.description.trim(),
      ordre: parseInt(form.value.ordre),
      actif: form.value.actif === 'true',
    })
    router.push(`/modules/${module.id}`)
  } catch (e) {
    const data = e.response?.data
    if (data && typeof data === 'object') {
      globalError.value = erreursDuServeur(data)
    } else {
      globalError.value = 'Erreur lors de la création.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader titre="Nouveau module">
        <template #actions>
          <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="router.push('/modules')">
            Retour
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-8 max-w-2xl">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <InfoBanner v-if="globalError" variant="error" :message="globalError" class="mb-6" />

          <form @submit.prevent="handleSubmit" class="flex flex-col gap-5" novalidate @focusout="surSortie">

            <FormField label="Formation associée" :error="erreur('formation')" data-champ="formation" required>
              <AppSelect
                v-model="form.formation"
                :options="formationOptions"
                placeholder="Sélectionner une formation…"
                :disabled="loading || loadingFormations"
                @update:model-value="handleFormationChange"
              />
            </FormField>

            <FormField label="Nom du module" :error="erreur('nom')" data-champ="nom" required>
              <TextInput v-model="form.nom" placeholder="Ex : JavaScript avancé" :disabled="loading" />
            </FormField>

            <FormField label="Description" :error="erreur('description')" data-champ="description">
              <TextInput v-model="form.description" type="textarea" :rows="3" :disabled="loading" />
            </FormField>

            <FormField
              label="Ordre d'affichage"
              :error="erreur('ordre')" data-champ="ordre"
              required
              hint="Position du module dans la formation (≥ 1). Doit être unique par formation."
            >
              <TextInput v-model="form.ordre" type="number" placeholder="1" :disabled="loading" />
            </FormField>

            <FormField label="Statut" :error="erreur('actif')" data-champ="actif">
              <AppSelect v-model="form.actif" :options="statutOptions" :disabled="loading" />
            </FormField>

            <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <AppButton type="button" variant="secondary" @click="router.push('/modules')" :disabled="loading">
                Annuler
              </AppButton>
              <AppButton type="submit" variant="primary" :loading="loading">
                Créer le module
              </AppButton>
            </div>

          </form>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

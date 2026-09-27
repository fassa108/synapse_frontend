<script setup>
import { ref, onMounted } from 'vue'
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

const errors = ref({})
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

const validate = () => {
  errors.value = {}
  if (!form.value.nom.trim()) errors.value.nom = 'Le nom est obligatoire.'
  if (!form.value.formation) errors.value.formation = 'La formation est obligatoire.'
  if (!form.value.ordre) {
    errors.value.ordre = "L'ordre est obligatoire."
  } else if (parseInt(form.value.ordre) < 1) {
    errors.value.ordre = "L'ordre doit être ≥ 1."
  }
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return
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
      Object.keys(data).forEach((key) => {
        const msg = Array.isArray(data[key]) ? data[key][0] : data[key]
        if (key === 'non_field_errors' || key === 'detail') {
          globalError.value = msg
        } else {
          errors.value[key] = msg
        }
      })
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

          <form @submit.prevent="handleSubmit" class="flex flex-col gap-5" novalidate>

            <FormField label="Formation associée" :error="errors.formation" required>
              <AppSelect
                v-model="form.formation"
                :options="formationOptions"
                placeholder="Sélectionner une formation…"
                :disabled="loading || loadingFormations"
                @update:model-value="handleFormationChange"
              />
            </FormField>

            <FormField label="Nom du module" :error="errors.nom" required>
              <TextInput v-model="form.nom" placeholder="Ex : JavaScript avancé" :disabled="loading" />
            </FormField>

            <FormField label="Description" :error="errors.description">
              <TextInput v-model="form.description" type="textarea" :rows="3" :disabled="loading" />
            </FormField>

            <FormField
              label="Ordre d'affichage"
              :error="errors.ordre"
              required
              hint="Position du module dans la formation (≥ 1). Doit être unique par formation."
            >
              <TextInput v-model="form.ordre" type="number" placeholder="1" :disabled="loading" />
            </FormField>

            <FormField label="Statut" :error="errors.actif">
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

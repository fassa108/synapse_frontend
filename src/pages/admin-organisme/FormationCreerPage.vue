<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { creerFormation } from '../../services/pedagogie'

const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const form = ref({
  nom: '',
  description: '',
  actif: true,
})

const errors = ref({})
const globalError = ref('')
const loading = ref(false)

const statutOptions = [
  { value: 'true',  label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

const validate = () => {
  errors.value = {}
  if (!form.value.nom.trim()) {
    errors.value.nom = 'Le nom de la formation est obligatoire.'
  }
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return

  loading.value = true
  globalError.value = ''

  try {
    const payload = {
      nom: form.value.nom.trim(),
      description: form.value.description.trim(),
      actif: form.value.actif === 'true' || form.value.actif === true,
    }

    const formation = await creerFormation(tenantId, payload)
    router.push(`/formations/${formation.id}`)
  } catch (e) {
    const data = e.response?.data
    if (data && typeof data === 'object') {
      // Erreurs champ par champ depuis le backend
      Object.keys(data).forEach((key) => {
        const msg = Array.isArray(data[key]) ? data[key][0] : data[key]
        if (key === 'non_field_errors' || key === 'detail') {
          globalError.value = msg
        } else {
          errors.value[key] = msg
        }
      })
    } else {
      globalError.value = 'Une erreur est survenue lors de la création.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader titre="Nouvelle formation">
        <template #actions>
          <AppButton
            variant="secondary"
            icon="fa-solid fa-arrow-left"
            @click="router.push('/formations')"
          >
            Retour
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-8 max-w-2xl">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <InfoBanner
            v-if="globalError"
            variant="error"
            :message="globalError"
            class="mb-6"
          />

          <form @submit.prevent="handleSubmit" class="flex flex-col gap-5" novalidate>

            <!-- Nom -->
            <FormField
              label="Nom de la formation"
              :error="errors.nom"
              required
            >
              <TextInput
                v-model="form.nom"
                placeholder="Ex : Développement Web Full Stack"
                :disabled="loading"
              />
            </FormField>

            <!-- Description -->
            <FormField label="Description" :error="errors.description">
              <TextInput
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="Décrivez la formation…"
                :disabled="loading"
              />
            </FormField>

            <!-- Statut -->
            <FormField label="Statut" :error="errors.actif">
              <AppSelect
                v-model="form.actif"
                :options="statutOptions"
                :disabled="loading"
              />
            </FormField>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <AppButton
                type="button"
                variant="secondary"
                @click="router.push('/formations')"
                :disabled="loading"
              >
                Annuler
              </AppButton>
              <AppButton
                type="submit"
                variant="primary"
                :loading="loading"
              >
                Créer la formation
              </AppButton>
            </div>

          </form>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

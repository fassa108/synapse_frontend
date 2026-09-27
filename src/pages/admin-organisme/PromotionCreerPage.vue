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
import { creerPromotion, getFormations } from '../../services/pedagogie'
import { getMembres } from '../../services/membres'

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
  date_debut: '',
  date_fin: '',
  // Formateurs affectés dès la création (facultatif)
  formateurs: [],
})

const formateurs = ref([])

const errors = ref({})
const globalError = ref('')
const loading = ref(false)

const nomFormateur = (m) =>
  m.utilisateur_prenom
    ? `${m.utilisateur_prenom} ${m.utilisateur_nom}`
    : m.utilisateur_email

onMounted(async () => {
  try {
    const [forms, membres] = await Promise.all([
      getFormations(tenantId),
      getMembres(tenantId),
    ])
    formateurs.value = membres.filter((m) => m.role === 'FORMATEUR' && m.actif)
    formations.value = forms
    formationOptions.value = formations.value.map((f) => ({
      value: String(f.id),
      label: f.nom,
    }))
  } catch {
    globalError.value = 'Impossible de charger les formations.'
  } finally {
    loadingFormations.value = false
  }
})

const validate = () => {
  errors.value = {}
  if (!form.value.nom.trim()) {
    errors.value.nom = 'Le nom de la promotion est obligatoire.'
  }
  if (!form.value.formation) {
    errors.value.formation = 'La formation est obligatoire.'
  }
  if (!form.value.date_debut) {
    errors.value.date_debut = 'La date de début est obligatoire.'
  }
  if (
    form.value.date_fin &&
    form.value.date_debut &&
    form.value.date_fin < form.value.date_debut
  ) {
    errors.value.date_fin = 'La date de fin doit être après la date de début.'
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
      formation: parseInt(form.value.formation),
      description: form.value.description.trim(),
      date_debut: form.value.date_debut,
      date_fin: form.value.date_fin || null,
      formateurs: form.value.formateurs,
    }

    const promo = await creerPromotion(tenantId, payload)
    router.push(`/promotions/${promo.id}`)
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

      <PageHeader titre="Nouvelle promotion">
        <template #actions>
          <AppButton
            variant="secondary"
            icon="fa-solid fa-arrow-left"
            @click="router.push('/promotions')"
          >
            Retour
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-8 max-w-2xl">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <InfoBanner v-if="globalError" variant="error" :message="globalError" class="mb-6" />

          <form @submit.prevent="handleSubmit" class="flex flex-col gap-5" novalidate>

            <FormField label="Nom de la promotion" :error="errors.nom" required>
              <TextInput
                v-model="form.nom"
                placeholder="Ex : Promo 2024 — Développement Web"
                :disabled="loading"
              />
            </FormField>

            <FormField label="Formation associée" :error="errors.formation" required>
              <AppSelect
                v-model="form.formation"
                :options="formationOptions"
                placeholder="Sélectionner une formation…"
                :disabled="loading || loadingFormations"
              />
            </FormField>

            <FormField label="Description" :error="errors.description">
              <TextInput
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="Description de la promotion…"
                :disabled="loading"
              />
            </FormField>

            <div class="grid grid-cols-2 gap-4">
              <FormField label="Date de début" :error="errors.date_debut" required>
                <TextInput
                  v-model="form.date_debut"
                  type="date"
                  :disabled="loading"
                />
              </FormField>

              <FormField
                label="Date de fin estimée"
                :error="errors.date_fin"
                hint="Facultatif"
              >
                <TextInput
                  v-model="form.date_fin"
                  type="date"
                  :disabled="loading"
                />
              </FormField>
            </div>

            <FormField
              label="Formateurs"
              :error="errors.formateurs"
              hint="Facultatif — vous pourrez en affecter ou en retirer depuis la fiche de la promotion."
            >
              <p
                v-if="formateurs.length === 0"
                class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400"
              >
                Aucun formateur actif dans l'organisme.
              </p>
              <div
                v-else
                class="flex max-h-48 flex-col divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200"
              >
                <label
                  v-for="f in formateurs"
                  :key="f.utilisateur"
                  class="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
                >
                  <input
                    v-model="form.formateurs"
                    type="checkbox"
                    :value="f.utilisateur"
                    :disabled="loading"
                    class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span class="font-['Plus_Jakarta_Sans'] text-sm text-gray-900">{{ nomFormateur(f) }}</span>
                  <span class="truncate font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ f.utilisateur_email }}</span>
                </label>
              </div>
            </FormField>

            <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <AppButton type="button" variant="secondary" @click="router.push('/promotions')" :disabled="loading">
                Annuler
              </AppButton>
              <AppButton type="submit" variant="primary" :loading="loading">
                Créer la promotion
              </AppButton>
            </div>

          </form>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

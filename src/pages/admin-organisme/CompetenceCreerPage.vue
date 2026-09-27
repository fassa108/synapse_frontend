<script setup>
/**
 * CompetenceCreerPage — création d'une compétence avec ses niveaux.
 *
 * Flux :
 * 1. L'utilisateur choisit un module
 * 2. Les niveaux du tenant sont chargés
 * 3. Pour chaque niveau, il peut saisir la description du critère observable
 * 4. Soumission : crée la compétence, puis crée les CompétenceNiveau renseignés
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import {
  creerCompetence,
  creerCompetenceNiveau,
  getModules,
  getNiveaux,
  getCompetences,
} from '../../services/pedagogie'

const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const modules = ref([])
const niveaux = ref([])
const loadingData = ref(true)

// Descriptions par niveau (niveauId -> string)
const niveauDescriptions = ref({})

const form = ref({
  nom: '',
  module: '',
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

const moduleOptions = computed(() =>
  modules.value.map((m) => ({ value: String(m.id), label: m.nom }))
)

onMounted(async () => {
  try {
    const [mods, nivs] = await Promise.all([
      getModules(tenantId),
      getNiveaux(tenantId),
    ])
    modules.value = mods
    niveaux.value = nivs
    // Initialiser les descriptions à vide
    nivs.forEach((n) => {
      niveauDescriptions.value[n.id] = ''
    })
  } catch {
    globalError.value = 'Impossible de charger les données nécessaires.'
  } finally {
    loadingData.value = false
  }
})

// Suggérer l'ordre automatiquement selon le module
const handleModuleChange = async () => {
  if (!form.value.module) return
  try {
    const comps = await getCompetences(tenantId, { module: form.value.module })
    const maxOrdre = comps.reduce((max, c) => Math.max(max, c.ordre), 0)
    form.value.ordre = String(maxOrdre + 1)
  } catch {
    // pas critique
  }
}

const validate = () => {
  errors.value = {}
  if (!form.value.nom.trim()) errors.value.nom = 'Le nom est obligatoire.'
  if (!form.value.module) errors.value.module = 'Le module est obligatoire.'
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
    // 1. Créer la compétence
    const competence = await creerCompetence(tenantId, {
      nom: form.value.nom.trim(),
      module: parseInt(form.value.module),
      description: form.value.description.trim(),
      ordre: parseInt(form.value.ordre),
      actif: form.value.actif === 'true',
    })

    // 2. Créer les CompétenceNiveau pour les niveaux renseignés
    const niveauxACreer = niveaux.value.filter(
      (n) => niveauDescriptions.value[n.id]?.trim()
    )

    await Promise.all(
      niveauxACreer.map((n) =>
        creerCompetenceNiveau(tenantId, {
          competence: competence.id,
          niveau: n.id,
          description: niveauDescriptions.value[n.id].trim(),
        })
      )
    )

    router.push('/competences')
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

      <PageHeader titre="Nouvelle compétence">
        <template #actions>
          <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="router.push('/competences')">
            Retour
          </AppButton>
        </template>
      </PageHeader>

      <div class="mt-8 max-w-3xl">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <InfoBanner v-if="globalError" variant="error" :message="globalError" class="mb-6" />

          <form @submit.prevent="handleSubmit" class="flex flex-col gap-6" novalidate>

            <!-- Section : informations de base -->
            <div>
              <h2 class="mb-4 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-zinc-700">
                Informations de la compétence
              </h2>
              <div class="flex flex-col gap-4">

                <FormField label="Module" :error="errors.module" required>
                  <AppSelect
                    v-model="form.module"
                    :options="moduleOptions"
                    placeholder="Sélectionner un module…"
                    :disabled="loading || loadingData"
                    @update:model-value="handleModuleChange"
                  />
                </FormField>

                <FormField label="Nom de la compétence" :error="errors.nom" required>
                  <TextInput
                    v-model="form.nom"
                    placeholder="Ex : Concevoir une API REST"
                    :disabled="loading"
                  />
                </FormField>

                <FormField label="Description" :error="errors.description">
                  <TextInput
                    v-model="form.description"
                    type="textarea"
                    :rows="3"
                    placeholder="Description de la compétence…"
                    :disabled="loading"
                  />
                </FormField>

                <div class="grid grid-cols-2 gap-4">
                  <FormField
                    label="Ordre"
                    :error="errors.ordre"
                    required
                    hint="Unique par module, ≥ 1"
                  >
                    <TextInput v-model="form.ordre" type="number" placeholder="1" :disabled="loading" />
                  </FormField>

                  <FormField label="Statut" :error="errors.actif">
                    <AppSelect v-model="form.actif" :options="statutOptions" :disabled="loading" />
                  </FormField>
                </div>
              </div>
            </div>

            <!-- Section : niveaux d'autonomie -->
            <div v-if="niveaux.length > 0">
              <div class="mb-4 flex items-center gap-2">
                <h2 class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-zinc-700">
                  Critères observables par niveau
                </h2>
                <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">(facultatif)</span>
              </div>

              <InfoBanner
                variant="info"
                message="Décrivez les comportements observables qui permettront d'évaluer cette compétence à chaque niveau."
                class="mb-4"
              />

              <div class="flex flex-col gap-4">
                <div
                  v-for="niveau in niveaux"
                  :key="niveau.id"
                  class="rounded-xl border border-slate-200 p-4"
                >
                  <div class="mb-2 flex items-center gap-2">
                    <span
                      class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-indigo-600"
                    >
                      {{ niveau.ordre }}
                    </span>
                    <span class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">
                      {{ niveau.nom }}
                    </span>
                  </div>
                  <TextInput
                    v-model="niveauDescriptions[niveau.id]"
                    type="textarea"
                    :rows="2"
                    :placeholder="`Critères observables pour le niveau « ${niveau.nom} »…`"
                    :disabled="loading"
                  />
                </div>
              </div>
            </div>

            <!-- Pas de niveaux configurés -->
            <InfoBanner
              v-else-if="!loadingData"
              variant="warning"
              message="Aucun niveau d'autonomie n'est configuré pour cet organisme. Créez des niveaux pour pouvoir associer des critères à cette compétence."
            />

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <AppButton type="button" variant="secondary" @click="router.push('/competences')" :disabled="loading">
                Annuler
              </AppButton>
              <AppButton type="submit" variant="primary" :loading="loading">
                Créer la compétence
              </AppButton>
            </div>

          </form>
        </div>
      </div>

    </div>
  </AppLayout>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getFormation, getPromotions, getModules, modifierFormation } from '../../services/pedagogie'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id
// Formateur : lecture seule (formations de ses promotions)
const isAdmin = computed(() => authStore.role === 'ADMINISTRATEUR')
const formationId = route.params.id

const formation = ref(null)
const promotions = ref([])
const modules = ref([])
const loading = ref(true)
const error = ref('')

// Mode édition
const editing = ref(false)
const editForm = ref({})
const editErrors = ref({})
const editGlobalError = ref('')
const editLoading = ref(false)

const statutOptions = [
  { value: 'true',  label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

onMounted(async () => {
  try {
    const [f, proms, mods] = await Promise.all([
      getFormation(tenantId, formationId),
      getPromotions(tenantId, { formation: formationId }),
      getModules(tenantId, { formation: formationId }),
    ])
    formation.value = f
    promotions.value = proms
    modules.value = mods
  } catch {
    error.value = 'Impossible de charger la formation.'
  } finally {
    loading.value = false
  }
})

const startEdit = () => {
  editForm.value = {
    nom: formation.value.nom,
    description: formation.value.description ?? '',
    actif: String(formation.value.actif),
  }
  editErrors.value = {}
  editGlobalError.value = ''
  editing.value = true
}

const cancelEdit = () => {
  editing.value = false
}

const handleSave = async () => {
  editErrors.value = {}
  editGlobalError.value = ''

  if (!editForm.value.nom?.trim()) {
    editErrors.value.nom = 'Le nom est obligatoire.'
    return
  }

  editLoading.value = true
  try {
    const updated = await modifierFormation(tenantId, formationId, {
      nom: editForm.value.nom.trim(),
      description: editForm.value.description.trim(),
      actif: editForm.value.actif === 'true',
    })
    formation.value = updated
    editing.value = false
  } catch (e) {
    const data = e.response?.data
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        const msg = Array.isArray(data[key]) ? data[key][0] : data[key]
        if (key === 'non_field_errors' || key === 'detail') {
          editGlobalError.value = msg
        } else {
          editErrors.value[key] = msg
        }
      })
    } else {
      editGlobalError.value = 'Erreur lors de la sauvegarde.'
    }
  } finally {
    editLoading.value = false
  }
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <!-- Chargement -->
      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <!-- Erreur -->
      <div v-else-if="error" class="flex h-64 items-center justify-center">
        <InfoBanner variant="error" :message="error" />
      </div>

      <template v-else-if="formation">
        <PageHeader :titre="formation.nom">
          <template #actions>
            <AppButton
              variant="secondary"
              icon="fa-solid fa-arrow-left"
              @click="router.push('/formations')"
            >
              Retour
            </AppButton>
            <AppButton
              v-if="isAdmin && !editing"
              variant="secondary"
              icon="fa-solid fa-pen"
              @click="startEdit"
            >
              Modifier
            </AppButton>
          </template>
        </PageHeader>

        <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">

          <!-- Colonne principale -->
          <div class="lg:col-span-2 flex flex-col gap-6">

            <!-- Informations générales -->
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="mb-5 font-['Sora'] text-base font-semibold text-gray-900">
                Informations générales
              </h2>

              <!-- Formulaire d'édition -->
              <form
                v-if="editing"
                @submit.prevent="handleSave"
                class="flex flex-col gap-4"
                novalidate
              >
                <InfoBanner v-if="editGlobalError" variant="error" :message="editGlobalError" />

                <FormField label="Nom" :error="editErrors.nom" required>
                  <TextInput v-model="editForm.nom" :disabled="editLoading" />
                </FormField>

                <FormField label="Description" :error="editErrors.description">
                  <TextInput
                    v-model="editForm.description"
                    type="textarea"
                    :rows="4"
                    :disabled="editLoading"
                  />
                </FormField>

                <FormField label="Statut" :error="editErrors.actif">
                  <AppSelect
                    v-model="editForm.actif"
                    :options="statutOptions"
                    :disabled="editLoading"
                  />
                </FormField>

                <div class="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <AppButton type="button" variant="secondary" @click="cancelEdit" :disabled="editLoading">
                    Annuler
                  </AppButton>
                  <AppButton type="submit" variant="primary" :loading="editLoading">
                    Enregistrer
                  </AppButton>
                </div>
              </form>

              <!-- Mode lecture -->
              <dl v-else class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Nom
                  </dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">
                    {{ formation.nom }}
                  </dd>
                </div>

                <div class="flex flex-col gap-1">
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Description
                  </dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">
                    {{ formation.description || '—' }}
                  </dd>
                </div>

                <div class="flex flex-col gap-1">
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Statut
                  </dt>
                  <dd>
                    <StatusBadge :value="formation.actif" type="boolean" />
                  </dd>
                </div>

                <div class="flex flex-col gap-1">
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Identifiant
                  </dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm font-mono text-zinc-400">
                    #{{ formation.id }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Modules -->
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
                  Modules ({{ modules.length }})
                </h2>
                <AppButton
                  v-if="isAdmin"
                  variant="secondary"
                  icon="fa-solid fa-plus"
                  @click="router.push('/modules/creer')"
                >
                  Ajouter
                </AppButton>
              </div>

              <div v-if="modules.length === 0" class="py-6 text-center text-sm text-zinc-400">
                <i class="fa-solid fa-layer-group mb-2 text-2xl"></i>
                <p>Aucun module pour cette formation.</p>
              </div>

              <ul v-else class="flex flex-col divide-y divide-slate-100">
                <li
                  v-for="mod in modules"
                  :key="mod.id"
                  class="flex items-center justify-between py-3"
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 font-['Plus_Jakarta_Sans'] text-xs font-bold text-zinc-500"
                    >
                      {{ mod.ordre }}
                    </span>
                    <RouterLink
                      :to="`/modules/${mod.id}`"
                      class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-indigo-600 hover:underline"
                    >
                      {{ mod.nom }}
                    </RouterLink>
                  </div>
                  <StatusBadge :value="mod.actif" type="boolean" />
                </li>
              </ul>
            </div>
          </div>

          <!-- Colonne latérale -->
          <div class="flex flex-col gap-6">

            <!-- Métadonnées -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">
                Détails
              </h2>
              <dl class="flex flex-col gap-3">
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Créée le</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
                    {{ formatDate(formation.date_creation) }}
                  </dd>
                </div>
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Modifiée le</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
                    {{ formatDate(formation.date_modification) }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Promotions liées -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">
                  Promotions ({{ promotions.length }})
                </h2>
                <AppButton
                  v-if="isAdmin"
                  variant="secondary"
                  icon="fa-solid fa-plus"
                  @click="router.push('/promotions/creer')"
                >
                  Ajouter
                </AppButton>
              </div>

              <div v-if="promotions.length === 0" class="text-sm text-zinc-400">
                Aucune promotion.
              </div>

              <ul v-else class="flex flex-col gap-2">
                <li
                  v-for="promo in promotions"
                  :key="promo.id"
                  class="flex items-center justify-between"
                >
                  <RouterLink
                    :to="`/promotions/${promo.id}`"
                    class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-indigo-600 hover:underline"
                  >
                    {{ promo.nom }}
                  </RouterLink>
                  <StatusBadge :value="promo.actif" type="boolean" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </template>

    </div>
  </AppLayout>
</template>

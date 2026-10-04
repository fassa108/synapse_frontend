<script setup>
/**
 * ModuleDetailPage — parcours Modules → détail → Compétences
 *
 * Compétences accessibles depuis ici, pas depuis le sidebar.
 * Chaque compétence affiche ses niveaux si disponibles.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import { useAuthStore } from '../../stores/auth'
import {
  getModule,
  getCompetences,
  getCompetenceNiveaux,
  getNiveaux,
  creerCompetence,
  creerCompetenceNiveau,
  modifierCompetenceNiveau,
  supprimerCompetenceNiveau,
  getCompetences as fetchComps,
} from '../../services/pedagogie'

const route   = useRoute()
const router  = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
// Formateur : lecture seule (formations de ses promotions)
const isAdmin = computed(() => authStore.role === 'ADMINISTRATEUR')
const moduleId  = route.params.id

// ─── État ─────────────────────────────────────────────────────────────────────
const module_        = ref(null)
const competences    = ref([])
const niveaux        = ref([])
const cnMap          = ref({}) // competenceId → [CompetenceNiveau]
const loading        = ref(true)
const error          = ref('')

// Panneau de création compétence (inline)
const showCreer      = ref(false)
const creerForm      = ref({ nom: '', description: '', ordre: '' })
const creerErrors    = ref({})
const creerGlobalErr = ref('')
const creerLoading   = ref(false)
// Descriptions par niveauId pour la nouvelle compétence
const niveauDescs    = ref({})

const statutOptions = [
  { value: 'true',  label: 'Actif' },
  { value: 'false', label: 'Inactif' },
]

// ─── Chargement ───────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [mod, comps, nivs] = await Promise.all([
      getModule(tenantId, moduleId),
      getCompetences(tenantId, { module: moduleId }),
      getNiveaux(tenantId),
    ])
    module_.value     = mod
    competences.value = comps
    niveaux.value     = nivs

    // Initialiser les descriptions de niveaux vides
    nivs.forEach((n) => { niveauDescs.value[n.id] = '' })

    // Charger les CompétenceNiveau pour chaque compétence
    await chargerNiveaux(comps)
  } catch {
    error.value = 'Impossible de charger le module.'
  } finally {
    loading.value = false
  }
})

const chargerNiveaux = async (comps) => {
  await Promise.all(
    comps.map(async (c) => {
      try {
        const cns = await getCompetenceNiveaux(tenantId, { competence: c.id })
        cnMap.value[c.id] = cns
      } catch {
        cnMap.value[c.id] = []
      }
    })
  )
}

// ─── Création compétence inline ───────────────────────────────────────────────
const ouvrirCreer = () => {
  // Suggérer l'ordre suivant
  const maxOrdre = competences.value.reduce((max, c) => Math.max(max, c.ordre), 0)
  creerForm.value = { nom: '', description: '', ordre: String(maxOrdre + 1), actif: 'true' }
  creerErrors.value    = {}
  creerGlobalErr.value = ''
  niveaux.value.forEach((n) => { niveauDescs.value[n.id] = '' })
  showCreer.value = true
}

const annulerCreer = () => { showCreer.value = false }

const validateCreer = () => {
  creerErrors.value = {}
  if (!creerForm.value.nom.trim()) creerErrors.value.nom = 'Le nom est obligatoire.'
  if (!creerForm.value.ordre) {
    creerErrors.value.ordre = "L'ordre est obligatoire."
  } else if (parseInt(creerForm.value.ordre) < 1) {
    creerErrors.value.ordre = "L'ordre doit être ≥ 1."
  }
  return Object.keys(creerErrors.value).length === 0
}

const handleCreerCompetence = async () => {
  if (!validateCreer()) return
  creerLoading.value   = true
  creerGlobalErr.value = ''

  try {
    const comp = await creerCompetence(tenantId, {
      nom:         creerForm.value.nom.trim(),
      module:      parseInt(moduleId),
      description: creerForm.value.description.trim(),
      ordre:       parseInt(creerForm.value.ordre),
      actif:       creerForm.value.actif === 'true',
    })

    // Créer les CompétenceNiveau renseignés
    const niveauxACreer = niveaux.value.filter(
      (n) => niveauDescs.value[n.id]?.trim()
    )
    await Promise.all(
      niveauxACreer.map((n) =>
        creerCompetenceNiveau(tenantId, {
          competence:  comp.id,
          niveau:      n.id,
          description: niveauDescs.value[n.id].trim(),
        })
      )
    )

    // Rafraîchir la liste
    const comps = await getCompetences(tenantId, { module: moduleId })
    competences.value = comps
    await chargerNiveaux(comps)
    showCreer.value = false
  } catch (e) {
    const data = e.response?.data
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        const msg = Array.isArray(data[key]) ? data[key][0] : data[key]
        if (key === 'non_field_errors' || key === 'detail') creerGlobalErr.value = msg
        else creerErrors.value[key] = msg
      })
    } else {
      creerGlobalErr.value = 'Erreur lors de la création.'
    }
  } finally {
    creerLoading.value = false
  }
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

// ─── Description des niveaux d'une compétence (Admin) ────────────────────────
// Une compétence peut être décrite pour tout ou partie des niveaux.
const competenceNiveauxEditee = ref(null)
const descsEdition            = ref({}) // niveauId → description
const niveauxEditionLoading   = ref(false)
const niveauxEditionError     = ref('')

const ouvrirNiveaux = (comp) => {
  descsEdition.value = Object.fromEntries(
    niveaux.value.map((n) => [
      n.id,
      cnMap.value[comp.id]?.find((cn) => cn.niveau === n.id)?.description ?? '',
    ])
  )
  niveauxEditionError.value = ''
  competenceNiveauxEditee.value = comp
}

const fermerNiveaux = () => {
  if (!niveauxEditionLoading.value) competenceNiveauxEditee.value = null
}

const enregistrerNiveaux = async () => {
  const comp = competenceNiveauxEditee.value
  const existants = cnMap.value[comp.id] ?? []

  niveauxEditionLoading.value = true
  niveauxEditionError.value   = ''
  try {
    await Promise.all(
      niveaux.value.map((n) => {
        const texte = descsEdition.value[n.id]?.trim() ?? ''
        const cn = existants.find((x) => x.niveau === n.id)
        if (cn && !texte) return supprimerCompetenceNiveau(tenantId, cn.id)
        if (cn && texte !== cn.description) {
          return modifierCompetenceNiveau(tenantId, cn.id, { description: texte })
        }
        if (!cn && texte) {
          return creerCompetenceNiveau(tenantId, { competence: comp.id, niveau: n.id, description: texte })
        }
        return null
      })
    )
    await chargerNiveaux([comp])
    competenceNiveauxEditee.value = null
  } catch (e) {
    niveauxEditionError.value =
      e.response?.data?.detail ?? 'Impossible d’enregistrer les niveaux de cette compétence.'
    await chargerNiveaux([comp])
  } finally {
    niveauxEditionLoading.value = false
  }
}

// Trouver le nom d'un niveau
const nomNiveau = (niveauId) =>
  niveaux.value.find((n) => n.id === niveauId)?.nom ?? `Niveau ${niveauId}`
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <!-- Chargement -->
      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner v-else-if="error" variant="error" :message="error" />

      <template v-else-if="module_">

        <PageHeader :titre="module_.nom">
          <template #actions>
            <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="isAdmin ? router.push('/modules') : router.back()">
              Modules
            </AppButton>
          </template>
        </PageHeader>

        <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">

          <!-- Compétences — colonne principale -->
          <div class="lg:col-span-2 flex flex-col gap-4">

            <!-- En-tête section compétences -->
            <div class="flex items-center justify-between">
              <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
                Compétences
                <span class="ml-1.5 font-['Plus_Jakarta_Sans'] text-sm font-normal text-zinc-400">
                  ({{ competences.length }})
                </span>
              </h2>
              <AppButton
                v-if="isAdmin && !showCreer"
                variant="primary"
                icon="fa-solid fa-plus"
                @click="ouvrirCreer"
              >
                Nouvelle compétence
              </AppButton>
            </div>

            <!-- Formulaire de création inline -->
            <div
              v-if="showCreer"
              class="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5"
            >
              <h3 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">
                Nouvelle compétence
              </h3>

              <InfoBanner v-if="creerGlobalErr" variant="error" :message="creerGlobalErr" class="mb-4" />

              <form @submit.prevent="handleCreerCompetence" class="flex flex-col gap-4" novalidate>

                <div class="grid grid-cols-2 gap-4">
                  <FormField label="Nom" :error="creerErrors.nom" required class="col-span-2 sm:col-span-1">
                    <TextInput v-model="creerForm.nom" placeholder="Ex : Concevoir une API REST" :disabled="creerLoading" />
                  </FormField>
                  <FormField label="Ordre" :error="creerErrors.ordre" required hint="Unique dans ce module, ≥ 1">
                    <TextInput v-model="creerForm.ordre" type="number" :disabled="creerLoading" />
                  </FormField>
                </div>

                <FormField label="Description" :error="creerErrors.description">
                  <TextInput v-model="creerForm.description" type="textarea" :rows="2" :disabled="creerLoading" />
                </FormField>

                <!-- Niveaux d'autonomie -->
                <div v-if="niveaux.length > 0" class="flex flex-col gap-3">
                  <p class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Critères observables par niveau <span class="font-normal normal-case text-zinc-400">(facultatif)</span>
                  </p>
                  <div
                    v-for="niveau in niveaux"
                    :key="niveau.id"
                    class="flex flex-col gap-1.5"
                  >
                    <label class="flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-zinc-600">
                      <span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                        {{ niveau.ordre }}
                      </span>
                      {{ niveau.nom }}
                    </label>
                    <TextInput
                      v-model="niveauDescs[niveau.id]"
                      type="textarea"
                      :rows="2"
                      :placeholder="`Critères pour « ${niveau.nom} »…`"
                      :disabled="creerLoading"
                    />
                  </div>
                </div>

                <div class="flex items-center justify-end gap-3 border-t border-indigo-200/60 pt-3">
                  <AppButton type="button" variant="ghost" @click="annulerCreer" :disabled="creerLoading">
                    Annuler
                  </AppButton>
                  <AppButton type="submit" variant="primary" :loading="creerLoading">
                    Créer la compétence
                  </AppButton>
                </div>
              </form>
            </div>

            <!-- Liste des compétences -->
            <div
              v-if="competences.length === 0 && !showCreer"
              class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-10 text-zinc-400"
            >
              <i class="fa-solid fa-bullseye text-2xl"></i>
              <p class="font-['Plus_Jakarta_Sans'] text-sm">Aucune compétence pour ce module.</p>
              
            </div>

            <div v-else class="flex flex-col gap-3">
              <div
                v-for="comp in competences"
                :key="comp.id"
                class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <!-- En-tête compétence -->
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3">
                    <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-mono text-xs font-bold text-indigo-600">
                      {{ comp.ordre }}
                    </span>
                    <div>
                      <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">
                        {{ comp.nom }}
                      </p>
                      <p v-if="comp.description" class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                        {{ comp.description }}
                      </p>
                    </div>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <button
                      v-if="isAdmin && niveaux.length > 0"
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                      @click="ouvrirNiveaux(comp)"
                    >
                      <i class="fa-solid fa-stairs"></i>
                      Niveaux
                    </button>
                    <StatusBadge :value="comp.actif" type="boolean" />
                  </div>
                </div>

                <!-- Niveaux de cette compétence -->
                <div
                  v-if="cnMap[comp.id]?.length > 0"
                  class="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3"
                >
                  <p class="font-['Plus_Jakarta_Sans'] text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Critères observables
                  </p>
                  <div
                    v-for="cn in cnMap[comp.id]"
                    :key="cn.id"
                    class="flex items-start gap-2.5"
                  >
                    <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-['Plus_Jakarta_Sans'] text-[10px] font-bold text-indigo-600">
                      {{ niveaux.find((n) => n.id === cn.niveau)?.ordre ?? '?' }}
                    </span>
                    <div>
                      <span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-zinc-600">
                        {{ nomNiveau(cn.niveau) }}
                      </span>
                      <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ cn.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Colonne latérale : infos du module -->
          <div class="flex flex-col gap-4">

            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">Informations</h2>
              <dl class="flex flex-col gap-3">
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Statut</dt>
                  <dd class="mt-0.5"><StatusBadge :value="module_.actif" type="boolean" /></dd>
                </div>
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Ordre</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ module_.ordre }}</dd>
                </div>
                <div v-if="module_.description">
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Description</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">{{ module_.description }}</dd>
                </div>
                <div>
                  <dt class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">Créé le</dt>
                  <dd class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ formatDate(module_.date_creation) }}</dd>
                </div>
              </dl>
            </div>

            <!-- Lien vers la formation parente -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-3 font-['Sora'] text-sm font-semibold text-gray-900">Formation</h2>
              <RouterLink
                :to="`/formations/${module_.formation}`"
                class="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm font-medium text-indigo-600 hover:underline"
              >
                <i class="fa-solid fa-book-open text-xs"></i>
                Voir la formation
              </RouterLink>
            </div>

          </div>
        </div>

      </template>
    </div>

    <!-- Modal : description des niveaux d'une compétence -->
    <Teleport to="body">
      <div
        v-if="competenceNiveauxEditee"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        @click.self="fermerNiveaux"
      >
        <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="border-b border-slate-100 px-6 py-4">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Niveaux de la compétence</h2>
            <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ competenceNiveauxEditee.nom }}</p>
          </div>
          <form class="flex flex-col gap-4 px-6 py-5" @submit.prevent="enregistrerNiveaux">
            <InfoBanner v-if="niveauxEditionError" variant="error" :message="niveauxEditionError" />
            <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              Décrivez ce que l'apprenant doit savoir faire à chaque niveau.
              Laissez vide les niveaux qui ne concernent pas cette compétence.
            </p>
            <div v-for="niveau in niveaux" :key="niveau.id" class="flex flex-col gap-1.5">
              <label class="flex items-center gap-1.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-zinc-600">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                  {{ niveau.ordre }}
                </span>
                {{ niveau.nom }}
                <span v-if="!niveau.actif" class="font-normal text-zinc-400">(inactif)</span>
              </label>
              <TextInput
                v-model="descsEdition[niveau.id]"
                type="textarea"
                :rows="2"
                :placeholder="`Critères pour « ${niveau.nom} »…`"
                :disabled="niveauxEditionLoading"
              />
            </div>
            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton variant="secondary" :disabled="niveauxEditionLoading" @click="fermerNiveaux">Annuler</AppButton>
              <AppButton type="submit" :loading="niveauxEditionLoading">Enregistrer</AppButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

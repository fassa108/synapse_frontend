<script setup>
/**
 * ActiviteDetailPage — Apprenant : contenu d'un brief, compétences
 * visées (avec ce qui est attendu au niveau visé), ressources.
 * Le dépôt de livrable sera ajouté avec l'étape « Livrables ».
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import TexteRiche from '../../components/texte-riche/TexteRiche.vue'
import { SECTIONS_BRIEF } from '../../utils/brief'
import { useAuthStore } from '../../stores/auth'
import { getBrief, getRessources, telechargerRessource, getAssignations, getCategories } from '../../services/activites'
import { getModule, getCompetences, getCompetenceNiveaux, getNiveaux } from '../../services/pedagogie'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
const briefId   = route.params.id

const brief        = ref(null)
const module_      = ref(null)
const competences  = ref([])
const cns          = ref([])
const niveaux      = ref([])
const ressources   = ref([])
const assignations = ref([])
const categorie    = ref(null)
const loading      = ref(true)
const error        = ref('')

onMounted(async () => {
  try {
    brief.value = await getBrief(tenantId, briefId)
    const [mod, comps, cnList, nivs, ress, ass, cats] = await Promise.all([
      getModule(tenantId, brief.value.module),
      getCompetences(tenantId),
      getCompetenceNiveaux(tenantId),
      getNiveaux(tenantId),
      getRessources(tenantId),
      getAssignations(tenantId, { brief: briefId }),
      getCategories(tenantId),
    ])
    categorie.value = cats.find((c) => c.id === brief.value.categorie) ?? null
    module_.value = mod
    competences.value = comps
    cns.value = cnList
    niveaux.value = nivs
    ressources.value = ress.filter((r) => brief.value.ressources.includes(r.id))
    assignations.value = ass
  } catch {
    error.value = 'Activité introuvable.'
  } finally {
    loading.value = false
  }
})

const estAssigne = computed(() => assignations.value.length > 0)

const competencesVisees = computed(() =>
  (brief.value?.competence_niveaux ?? [])
    .map((id) => cns.value.find((cn) => cn.id === id))
    .filter(Boolean)
    .map((cn) => ({
      ...cn,
      competence: competences.value.find((c) => c.id === cn.competence),
      niveau: niveaux.value.find((n) => n.id === cn.niveau),
    }))
)

const ouvrirRessource = async (r) => {
  if (r.url) {
    window.open(r.url, '_blank', 'noopener')
    return
  }
  try {
    await telechargerRessource(tenantId, r)
  } catch {
    error.value = 'Impossible de télécharger ce fichier.'
  }
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="!brief" variant="error" :message="error" />

      <template v-else>
        <PageHeader
          :titre="brief.titre"
          :description="[categorie?.nom, module_ ? `Module : ${module_.nom}` : ''].filter(Boolean).join(' · ')"
        >
          <template #actions>
            <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="router.push('/activites')">Mes activités</AppButton>
          </template>
        </PageHeader>

        <InfoBanner v-if="error" variant="error" :message="error" class="mt-4" />
        <InfoBanner
          :variant="estAssigne ? 'success' : 'info'"
          class="mt-6"
          :message="estAssigne
            ? 'Ce brief vous est assigné.'
            : 'Ce brief ne vous est pas assigné : vous pouvez le consulter, mais pas y déposer de livrable.'"
        />

        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="flex flex-col gap-6 lg:col-span-2">
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="mb-2 font-['Sora'] text-base font-semibold text-gray-900">Description</h2>
              <p class="whitespace-pre-line font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">{{ brief.description }}</p>
              <!-- Sections : le titre reste affiché même si le contenu est vide -->
              <section v-for="s in SECTIONS_BRIEF" :key="s.cle" class="mt-6 border-t border-slate-100 pt-5">
                <h2 class="mb-2 font-['Sora'] text-base font-semibold text-gray-900">{{ s.titre }}</h2>
                <TexteRiche :html="brief[s.cle]" />
              </section>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-base font-semibold text-gray-900">Ce qui est attendu</h2>
              <p v-if="competencesVisees.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Aucune compétence visée.
              </p>
              <ul class="flex flex-col gap-3">
                <li v-for="cv in competencesVisees" :key="cv.id" class="flex items-start gap-3">
                  <span class="mt-0.5 rounded-full bg-indigo-50 px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-semibold text-indigo-700">
                    {{ cv.niveau?.nom }}
                  </span>
                  <div>
                    <p class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">{{ cv.competence?.nom }}</p>
                    <p v-if="cv.description" class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ cv.description }}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div class="flex flex-col gap-6">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Dates</h2>
                <StatusBadge :value="brief.statut" type="brief" />
              </div>
              <dl class="flex flex-col gap-3 font-['Plus_Jakarta_Sans']">
                <div><dt class="text-xs text-zinc-400">Début</dt><dd class="text-sm text-zinc-700">{{ formatDate(brief.date_debut) }}</dd></div>
                <div><dt class="text-xs text-zinc-400">Date limite</dt><dd class="text-sm text-zinc-700">{{ formatDate(brief.date_limite) }}</dd></div>
              </dl>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-3 font-['Sora'] text-sm font-semibold text-gray-900">Ressources</h2>
              <p v-if="ressources.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Aucune ressource.</p>
              <ul class="flex flex-col gap-2">
                <li v-for="r in ressources" :key="r.id">
                  <button type="button" class="flex items-center gap-2 text-left font-['Plus_Jakarta_Sans'] text-sm text-indigo-600 hover:underline" @click="ouvrirRessource(r)">
                    <i :class="r.url ? 'fa-solid fa-link' : 'fa-solid fa-file-arrow-down'" class="text-xs"></i>
                    {{ r.titre }}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup>
/**
 * MaFormationPage — Apprenant
 *
 * Sa promotion, sa formation (modules, compétences et ce qui est attendu
 * à chaque niveau), ses groupes et leurs membres.
 * Lecture seule. Le backend ne renvoie que ce que l'apprenant peut voir.
 */
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import {
  getPromotions,
  getFormation,
  getModules,
  getCompetences,
  getCompetenceNiveaux,
  getNiveaux,
  getGroupes,
} from '../../services/pedagogie'

const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const promotion        = ref(null)
const formation        = ref(null)
const modules          = ref([])
const competences      = ref([])
const competenceNiveaux = ref([])
const niveaux          = ref([])
const groupes          = ref([])
const loading          = ref(true)
const error            = ref('')
const moduleOuvert     = ref(null)

onMounted(async () => {
  try {
    const promotions = await getPromotions(tenantId)
    // Promotion ouverte en priorité, sinon la plus récente (clôturée)
    promotion.value = promotions.find((p) => p.actif) ?? promotions[0] ?? null
    if (!promotion.value) return

    const [form, mods, comps, cns, nivs, grps] = await Promise.all([
      getFormation(tenantId, promotion.value.formation),
      getModules(tenantId, { formation: promotion.value.formation }),
      getCompetences(tenantId),
      getCompetenceNiveaux(tenantId),
      getNiveaux(tenantId),
      getGroupes(tenantId, { promotion: promotion.value.id }),
    ])
    formation.value         = form
    modules.value           = mods.filter((m) => m.actif)
    competences.value       = comps.filter((c) => c.actif)
    competenceNiveaux.value = cns
    niveaux.value           = nivs
    groupes.value           = grps
    moduleOuvert.value      = modules.value[0]?.id ?? null
  } catch {
    error.value = 'Impossible de charger votre formation.'
  } finally {
    loading.value = false
  }
})

const competencesDuModule = (moduleId) =>
  competences.value.filter((c) => c.module === moduleId)

// Niveaux décrits pour une compétence, du plus bas au plus haut
const niveauxDe = (competenceId) =>
  competenceNiveaux.value.filter((cn) => cn.competence === competenceId)

const nomNiveau = (id) => niveaux.value.find((n) => n.id === id)?.nom ?? `Niveau ${id}`

const nbCompetences = computed(() =>
  competences.value.filter((c) => modules.value.some((m) => m.id === c.module)).length
)

const basculer = (id) => {
  moduleOuvert.value = moduleOuvert.value === id ? null : id
}

const membresActifs = (groupe) => groupe.membres.filter((m) => m.actif)

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner v-else-if="error" variant="error" :message="error" />

      <div
        v-else-if="!promotion"
        class="flex flex-col items-center gap-2 py-16 text-center text-zinc-400"
      >
        <i class="fa-solid fa-graduation-cap text-3xl"></i>
        <p class="font-['Plus_Jakarta_Sans'] text-sm">
          Vous n'êtes inscrit dans aucune promotion pour le moment.
        </p>
      </div>

      <template v-else>
        <PageHeader
          :titre="formation?.nom ?? 'Ma formation'"
          :description="`Promotion ${promotion.nom}`"
        />

        <InfoBanner
          v-if="!promotion.actif"
          variant="info"
          message="Votre promotion est clôturée : son contenu reste consultable."
          class="mt-6"
        />

        <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          <!-- Modules et compétences -->
          <div class="flex flex-col gap-4 lg:col-span-2">
            <div class="flex items-baseline justify-between">
              <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
                Modules et compétences
              </h2>
              <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                {{ modules.length }} module{{ modules.length > 1 ? 's' : '' }} ·
                {{ nbCompetences }} compétence{{ nbCompetences > 1 ? 's' : '' }}
              </span>
            </div>

            <p v-if="formation?.description" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">
              {{ formation.description }}
            </p>

            <div
              v-if="modules.length === 0"
              class="rounded-2xl border border-slate-200 bg-white p-6 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-400 shadow-sm"
            >
              Aucun module pour cette formation.
            </div>

            <div
              v-for="module in modules"
              :key="module.id"
              class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <button
                type="button"
                class="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                :aria-expanded="moduleOuvert === module.id"
                @click="basculer(module.id)"
              >
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-['Plus_Jakarta_Sans'] text-xs font-bold text-indigo-600">
                  {{ module.ordre }}
                </span>
                <span class="flex-1">
                  <span class="block font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ module.nom }}</span>
                  <span class="block font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                    {{ competencesDuModule(module.id).length }} compétence{{ competencesDuModule(module.id).length > 1 ? 's' : '' }}
                  </span>
                </span>
                <i
                  class="fa-solid fa-chevron-down text-xs text-zinc-400 transition"
                  :class="{ 'rotate-180': moduleOuvert === module.id }"
                ></i>
              </button>

              <div v-if="moduleOuvert === module.id" class="border-t border-slate-100 px-5 py-4">
                <p v-if="module.description" class="mb-4 font-['Plus_Jakarta_Sans'] text-sm text-zinc-600">
                  {{ module.description }}
                </p>

                <p
                  v-if="competencesDuModule(module.id).length === 0"
                  class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400"
                >
                  Aucune compétence pour ce module.
                </p>

                <ul class="flex flex-col gap-4">
                  <li v-for="comp in competencesDuModule(module.id)" :key="comp.id">
                    <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ comp.nom }}</p>
                    <p v-if="comp.description" class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
                      {{ comp.description }}
                    </p>
                    <ul v-if="niveauxDe(comp.id).length" class="mt-2 flex flex-col gap-1.5 border-l-2 border-indigo-100 pl-3">
                      <li v-for="cn in niveauxDe(comp.id)" :key="cn.id" class="font-['Plus_Jakarta_Sans'] text-xs">
                        <span class="font-semibold text-indigo-700">{{ nomNiveau(cn.niveau) }}</span>
                        <span v-if="cn.description" class="text-zinc-600"> — {{ cn.description }}</span>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Colonne : promotion et groupes -->
          <div class="flex flex-col gap-6">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Ma promotion</h2>
                <StatusBadge :value="promotion.actif" type="promotion" />
              </div>
              <p class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">{{ promotion.nom }}</p>
              <p class="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Du {{ formatDate(promotion.date_debut) }}
                {{ promotion.date_fin ? 'au ' + formatDate(promotion.date_fin) : '' }}
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="mb-4 font-['Sora'] text-sm font-semibold text-gray-900">
                Mes groupes ({{ groupes.length }})
              </h2>
              <p v-if="groupes.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
                Vous n'êtes membre d'aucun groupe.
              </p>
              <div v-for="groupe in groupes" :key="groupe.id" class="mb-4 last:mb-0">
                <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ groupe.nom }}</p>
                <ul class="mt-2 flex flex-col gap-1.5">
                  <li
                    v-for="m in membresActifs(groupe)"
                    :key="m.id"
                    class="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-600"
                  >
                    <span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                      {{ (m.apprenant_prenom?.[0] ?? '') + (m.apprenant_nom?.[0] ?? '') }}
                    </span>
                    {{ m.apprenant_prenom }} {{ m.apprenant_nom }}
                    <span v-if="m.apprenant === authStore.utilisateur?.id" class="text-zinc-400">(vous)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </template>
    </div>
  </AppLayout>
</template>

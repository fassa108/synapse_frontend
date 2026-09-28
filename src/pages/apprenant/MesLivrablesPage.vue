<script setup>
/**
 * MesLivrablesPage — Apprenant : tous ses dépôts (et ceux de ses groupes),
 * regroupés par brief, du plus récent au plus ancien ; filtre par brief.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import FilterSelect from '../../components/ui/FilterSelect.vue'
import DepotCarte from '../../components/livrables/DepotCarte.vue'
import { useAuthStore } from '../../stores/auth'
import { getLivrables, getAssignations, getBriefs } from '../../services/activites'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const livrables    = ref([])
const assignations = ref([])
const briefs       = ref([])
const loading      = ref(true)
const error        = ref('')
const filtreBrief  = ref('')

onMounted(async () => {
  try {
    const [l, a, b] = await Promise.all([getLivrables(tenantId), getAssignations(tenantId), getBriefs(tenantId)])
    livrables.value = l
    assignations.value = a
    briefs.value = b
  } catch {
    error.value = 'Impossible de charger vos livrables.'
  } finally {
    loading.value = false
  }
})

// L'API renvoie aussi le dernier dépôt des pairs : on ne garde que les siens
const mesAssignations = computed(() => new Set(assignations.value.map((a) => a.id)))

const parBrief = computed(() => {
  const groupes = new Map()
  for (const l of livrables.value) {
    if (!mesAssignations.value.has(l.assignation)) continue
    if (!groupes.has(l.brief)) groupes.set(l.brief, [])
    groupes.get(l.brief).push(l)
  }
  return [...groupes.entries()].map(([briefId, depots]) => ({
    brief: briefs.value.find((b) => b.id === briefId),
    depots,
  }))
})

const briefOptions = computed(() =>
  parBrief.value.map((g) => ({ value: String(g.brief?.id), label: g.brief?.titre ?? '—' }))
)

const affiches = computed(() =>
  filtreBrief.value ? parBrief.value.filter((g) => String(g.brief?.id) === filtreBrief.value) : parBrief.value
)
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader titre="Mes livrables" description="Vos dépôts, brief par brief." />

      <div v-if="loading" class="flex h-48 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="error" variant="error" :message="error" class="mt-4" />

      <div v-else-if="parBrief.length === 0" class="flex flex-col items-center gap-2 py-16 text-center text-zinc-400">
        <i class="fa-solid fa-file-lines text-3xl"></i>
        <p class="font-['Plus_Jakarta_Sans'] text-sm">Vous n'avez encore rien déposé.</p>
        <button type="button" class="font-['Plus_Jakarta_Sans'] text-sm text-indigo-600 hover:underline" @click="router.push('/activites')">
          Voir mes activités
        </button>
      </div>

      <div v-else class="mt-6 flex flex-col gap-6">
        <div v-if="briefOptions.length > 1" class="flex">
          <FilterSelect v-model="filtreBrief" :options="briefOptions" placeholder="Tous les briefs" />
        </div>
        <section v-for="g in affiches" :key="g.brief?.id" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">{{ g.brief?.titre }}</h2>
            <button type="button" class="font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline"
                    @click="router.push(`/activites/${g.brief?.id}`)">
              Voir le brief
            </button>
          </div>
          <div class="flex flex-col gap-3">
            <DepotCarte v-for="d in g.depots" :key="d.id" :depot="d" afficher-cible />
          </div>
        </section>
      </div>
    </div>
  </AppLayout>
</template>

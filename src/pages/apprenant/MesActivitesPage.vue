<script setup>
/**
 * MesActivitesPage — Apprenant
 *
 * Briefs publiés ou archivés de sa promotion (le backend ne renvoie que
 * ceux-là). Ceux qui lui sont assignés — directement ou via un groupe —
 * sont mis en avant : ce sont les seuls sur lesquels il pourra déposer.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getBriefs, getAssignations, getCategories } from '../../services/activites'

const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const briefs       = ref([])
const assignations = ref([])
const categories   = ref([])
const loading      = ref(true)
const error        = ref('')
const filtre       = ref('assignes') // 'assignes' | 'tous'

onMounted(async () => {
  try {
    const [b, a, c] = await Promise.all([getBriefs(tenantId), getAssignations(tenantId), getCategories(tenantId)])
    categories.value = c
    briefs.value = b
    assignations.value = a
  } catch {
    error.value = 'Impossible de charger vos activités.'
  } finally {
    loading.value = false
  }
})

const nomCategorie = (id) => categories.value.find((c) => c.id === id)?.nom

const briefsAssignes = computed(() => new Set(assignations.value.map((a) => a.brief)))

const affiches = computed(() => {
  const list = filtre.value === 'assignes'
    ? briefs.value.filter((b) => briefsAssignes.value.has(b.id))
    : briefs.value
  // En cours d'abord, puis par date limite
  return [...list].sort((a, b) => {
    if (a.statut !== b.statut) return a.statut === 'PUBLIE' ? -1 : 1
    return new Date(a.date_limite) - new Date(b.date_limite)
  })
})

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const etat = (b) => {
  const maintenant = new Date()
  if (b.statut === 'ARCHIVE') return { label: 'Terminé', classes: 'text-zinc-400' }
  if (new Date(b.date_debut) > maintenant) return { label: `Commence le ${formatDate(b.date_debut)}`, classes: 'text-sky-600' }
  if (new Date(b.date_limite) < maintenant) return { label: `Date limite dépassée (${formatDate(b.date_limite)})`, classes: 'text-red-500' }
  return { label: `À rendre avant le ${formatDate(b.date_limite)}`, classes: 'text-zinc-600' }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader titre="Mes activités" description="Les briefs de votre promotion." />

      <div class="mt-5 flex rounded-xl border border-slate-200 bg-white p-0.5 sm:w-fit">
        <button v-for="f in [{ v: 'assignes', l: 'Qui me sont assignés' }, { v: 'tous', l: 'Tous les briefs de la promotion' }]"
                :key="f.v" type="button"
                class="flex-1 rounded-lg px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium transition"
                :class="filtre === f.v ? 'bg-indigo-500 text-white' : 'text-zinc-600 hover:bg-slate-50'"
                @click="filtre = f.v">
          {{ f.l }}
        </button>
      </div>

      <div v-if="loading" class="flex h-48 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="error" variant="error" :message="error" class="mt-4" />

      <div v-else-if="affiches.length === 0" class="flex flex-col items-center gap-2 py-16 text-center text-zinc-400">
        <i class="fa-solid fa-clipboard text-3xl"></i>
        <p class="font-['Plus_Jakarta_Sans'] text-sm">
          {{ filtre === 'assignes' ? 'Aucun brief ne vous est assigné pour le moment.' : 'Aucun brief publié dans votre promotion.' }}
        </p>
      </div>

      <div v-else class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <button v-for="b in affiches" :key="b.id" type="button"
                class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                @click="router.push(`/activites/${b.id}`)">
          <div class="flex items-start justify-between gap-3">
            <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ b.titre }}</p>
            <StatusBadge :value="b.statut" type="brief" />
          </div>
          <span v-if="b.categorie" class="w-fit rounded-full bg-violet-50 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-medium text-violet-700">
            {{ nomCategorie(b.categorie) }}
          </span>
          <p class="line-clamp-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">{{ b.description }}</p>
          <div class="mt-auto flex items-center justify-between gap-2">
            <span class="font-['Plus_Jakarta_Sans'] text-xs" :class="etat(b).classes">{{ etat(b).label }}</span>
            <span v-if="briefsAssignes.has(b.id)" class="rounded-full bg-indigo-50 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold text-indigo-700">
              Assigné
            </span>
          </div>
        </button>
      </div>
    </div>
  </AppLayout>
</template>

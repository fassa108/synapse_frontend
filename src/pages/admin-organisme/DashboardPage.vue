<script setup>
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import StatCard from '../../components/dashboard/StatCard.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { getFormations, getPromotions } from '../../services/pedagogie'
import { getMembres } from '../../services/membres'

const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const stats   = ref({ formations: null, promotions: null, apprenants: null, formateurs: null })
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    const [formations, promotions, membres] = await Promise.all([
      getFormations(tenantId),
      getPromotions(tenantId),
      getMembres(tenantId),
    ])
    stats.value = {
      formations: formations.length,
      promotions: promotions.length,
      apprenants: membres.filter((m) => m.role === 'APPRENANT' && m.actif).length,
      formateurs: membres.filter((m) => m.role === 'FORMATEUR' && m.actif).length,
    }
  } catch {
    error.value = 'Impossible de charger les statistiques.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <!-- En-tête -->
      <div class="mb-6">
        <h1 class="font-['Sora'] text-xl font-semibold text-gray-900">
          Bonjour, {{ authStore.utilisateur?.prenom }} 👋
        </h1>
        <p class="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
          Vue d'ensemble de
          <span class="font-semibold text-zinc-700">{{ authStore.tenantCourant?.nom }}</span>.
        </p>
      </div>

      <InfoBanner v-if="error" variant="error" :message="error" class="mb-6" />

      <!-- KPI -->
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Formations"
          :value="loading ? '—' : stats.formations"
          icon="fa-solid fa-book-open"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-600"
        />
        <StatCard
          label="Promotions"
          :value="loading ? '—' : stats.promotions"
          icon="fa-solid fa-users"
          icon-background="bg-violet-50"
          icon-color="text-violet-600"
        />
        <StatCard
          label="Apprenants"
          :value="loading ? '—' : stats.apprenants"
          icon="fa-solid fa-user-graduate"
          icon-background="bg-indigo-50"
          icon-color="text-indigo-700"
        />
        <StatCard
          label="Formateurs"
          :value="loading ? '—' : stats.formateurs"
          icon="fa-solid fa-chalkboard-user"
          icon-background="bg-violet-50"
          icon-color="text-violet-700"
        />
      </div>

    </div>
  </AppLayout>
</template>

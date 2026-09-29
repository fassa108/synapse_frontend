<script setup>
/**
 * MaProgressionPage — Apprenant : compétences validées et briefs validés
 * dans sa promotion, référentiel détaillé.
 */
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import ProgressionDetail from '../../components/progression/ProgressionDetail.vue'
import { useAuthStore } from '../../stores/auth'
import { getMaProgression } from '../../services/activites'

const authStore   = useAuthStore()
const progression = ref(null)
const loading     = ref(true)
const error       = ref('')

onMounted(async () => {
  try {
    progression.value = await getMaProgression(authStore.tenantCourant?.id)
  } catch (e) {
    error.value = e.response?.status === 404
      ? "Vous n'êtes inscrit à aucune promotion ouverte."
      : 'Impossible de charger votre progression.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        titre="Ma progression"
        :description="progression ? `Promotion ${progression.promotion.nom}` : 'Vos compétences validées et vos briefs.'"
      />
      <div v-if="loading" class="flex h-48 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="error" variant="info" :message="error" class="mt-4" />
      <ProgressionDetail v-else class="mt-6" :progression="progression" :lien-brief="(id) => `/activites/${id}`" />
    </div>
  </AppLayout>
</template>

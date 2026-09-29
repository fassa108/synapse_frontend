<script setup>
/**
 * ProgressionApprenantPage — Formateur / Admin : progression détaillée
 * d'un apprenant (compétences, briefs).
 */
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import ProgressionDetail from '../../components/progression/ProgressionDetail.vue'
import { useAuthStore } from '../../stores/auth'
import { getProgressionApprenant } from '../../services/activites'

const route       = useRoute()
const router      = useRouter()
const authStore   = useAuthStore()
const progression = ref(null)
const loading     = ref(true)
const error       = ref('')

onMounted(async () => {
  try {
    progression.value = await getProgressionApprenant(authStore.tenantCourant?.id, route.params.id)
  } catch {
    error.value = 'Progression introuvable.'
  } finally {
    loading.value = false
  }
})

const retour = () => {
  router.push({ path: '/progression', query: progression.value ? { promotion: progression.value.promotion.id } : {} })
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        :titre="progression ? progression.apprenant.nom : 'Progression'"
        :description="progression ? `Promotion ${progression.promotion.nom}` : ''"
      >
        <template #actions>
          <AppButton variant="secondary" icon="fa-solid fa-arrow-left" @click="retour">Toute la promotion</AppButton>
        </template>
      </PageHeader>
      <div v-if="loading" class="flex h-48 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>
      <InfoBanner v-else-if="error" variant="error" :message="error" class="mt-4" />
      <ProgressionDetail v-else class="mt-6" :progression="progression" :lien-brief="(id) => `/briefs/${id}`" />
    </div>
  </AppLayout>
</template>

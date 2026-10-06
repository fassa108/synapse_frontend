<script setup>
import { computed } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import OrganismeInfosForm from '../../components/organismes/OrganismeInfosForm.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const estAdminOrganisme = computed(() => authStore.role === 'ADMINISTRATEUR')
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        titre="Paramètres"
        description="Configuration de votre espace."
      />
      <div class="mt-8 max-w-2xl">
        <OrganismeInfosForm v-if="estAdminOrganisme" />
        <InfoBanner
          v-else
          variant="info"
          message="Les paramètres avancés seront disponibles dans une prochaine version."
        />
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader
        titre="Paramètres"
        description="Configuration de votre espace."
      />
      <div class="mt-8 max-w-2xl">
        <InfoBanner
          variant="info"
          message="Les paramètres avancés seront disponibles dans une prochaine version."
        />
      </div>
    </div>
  </AppLayout>
</template>

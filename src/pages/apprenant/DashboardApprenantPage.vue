<script setup>
import AppLayout from '../../components/layouts/AppLayout.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <h1 class="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-gray-900">
        Espace Apprenant
      </h1>
      <p class="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
        Bonjour, {{ authStore.utilisateur?.prenom }}. Votre espace apprenant sera disponible prochainement.
      </p>
    </div>
  </AppLayout>
</template>

<script setup>
/**
 * BoutonExportMembres — admin : tous les membres de l'organisme en Excel
 * (rôle, statut, dernière connexion, promotions ouvertes).
 */
import { ref } from 'vue'
import AppButton from '../ui/AppButton.vue'
import { useAuthStore } from '../../stores/auth'
import { exporterMembres } from '../../services/rapports'

const authStore = useAuthStore()
const enCours = ref(false)
const echec = ref(false)

const exporter = async () => {
  enCours.value = true
  echec.value = false
  try {
    await exporterMembres(authStore.tenantCourant?.id)
  } catch {
    echec.value = true
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <AppButton
    variant="secondary"
    :icon="echec ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-file-excel'"
    :loading="enCours"
    :title="echec ? 'L’export a échoué. Réessayez.' : 'Tous les membres de l’organisme, au format Excel'"
    @click="exporter"
  >
    Exporter
  </AppButton>
</template>

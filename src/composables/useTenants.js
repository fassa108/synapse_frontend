import { ref } from 'vue'
import { recupererOrganismes } from '../services/tenants'

export const useTenants = () => {
  const organismes = ref([])
  const isLoading = ref(false)
  const errorMessage = ref('')

  const chargerOrganismes = async () => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const data = await recupererOrganismes()
      organismes.value = data
    } catch (error) {
      errorMessage.value =
        error.response?.data?.detail ||
        'Impossible de charger les organismes.'
    } finally {
      isLoading.value = false
    }
  }

  return {
    organismes,
    isLoading,
    errorMessage,
    chargerOrganismes,
  }
}

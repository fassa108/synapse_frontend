import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  getCompteurNotifications,
  getNotifications,
  lireNotification,
  toutLireNotifications,
} from '../services/notifications'

/**
 * Notifications partagées entre la cloche du header et la page dédiée.
 *
 * Le compteur est relu à chaque page (le header est remonté, ce qui
 * couvre aussi le changement d'organisme), toutes les 60 s quand l'onglet
 * est visible, et au retour sur l'onglet.
 */
const INTERVALLE_MS = 60 * 1000

const nonLues = ref(0)
const recentes = ref([])
let minuterie = null
let surVisibilite = null
let abonnes = 0

export const useNotifications = () => {
  const authStore = useAuthStore()
  const tenantId = computed(() => authStore.tenantCourant?.id ?? null)

  const rafraichirCompteur = async () => {
    if (!authStore.isAuthenticated) return
    try {
      nonLues.value = await getCompteurNotifications(tenantId.value)
    } catch {
      // réseau indisponible : on garde le dernier compteur connu
    }
  }

  const chargerRecentes = async () => {
    const data = await getNotifications(tenantId.value, { taille: 8 })
    recentes.value = data.results
  }

  const marquerLue = async (notification) => {
    if (notification.lue) return
    const maj = await lireNotification(notification.id)
    Object.assign(notification, maj)
    const recente = recentes.value.find((n) => n.id === notification.id)
    if (recente) Object.assign(recente, maj)
    nonLues.value = Math.max(0, nonLues.value - 1)
  }

  const toutMarquerLu = async () => {
    await toutLireNotifications(tenantId.value)
    recentes.value.forEach((n) => (n.lue = true))
    nonLues.value = 0
  }

  // Une seule minuterie, quel que soit l'ordre de montage et de démontage
  // des headers lors d'un changement de page
  const demarrer = () => {
    abonnes += 1
    rafraichirCompteur()
    if (minuterie) return
    minuterie = setInterval(() => {
      if (document.visibilityState === 'visible') rafraichirCompteur()
    }, INTERVALLE_MS)
    surVisibilite = () => {
      if (document.visibilityState === 'visible') rafraichirCompteur()
    }
    document.addEventListener('visibilitychange', surVisibilite)
  }

  const arreter = () => {
    abonnes = Math.max(0, abonnes - 1)
    if (abonnes > 0) return
    clearInterval(minuterie)
    minuterie = null
    document.removeEventListener('visibilitychange', surVisibilite)
    surVisibilite = null
  }

  return {
    tenantId,
    nonLues,
    recentes,
    rafraichirCompteur,
    chargerRecentes,
    marquerLue,
    toutMarquerLu,
    demarrer,
    arreter,
  }
}

import { ref } from 'vue'
import { renvoyerInvitation } from '../services/membres'

/**
 * Renvoi de l'invitation d'un membre dont le compte est « En attente ».
 *
 * - enCours : id du membre en cours de renvoi (bouton en chargement)
 * - retour  : { variant: 'success' | 'error', message } à afficher en bandeau
 */
export const useRenvoiInvitation = (tenantId) => {
  const enCours = ref(null)
  const retour = ref(null)

  const renvoyer = async (membre) => {
    enCours.value = membre.id
    retour.value = null
    try {
      const { detail } = await renvoyerInvitation(tenantId, membre.id)
      retour.value = { variant: 'success', message: `${detail} Le nouveau lien est valable 72 heures.` }
    } catch (e) {
      retour.value = {
        variant: 'error',
        message: e.response?.status === 429
          ? "Trop d'envois pour ce membre. Réessayez dans une heure."
          : e.response?.data?.detail ?? "L'invitation n'a pas pu être renvoyée.",
      }
    } finally {
      enCours.value = null
    }
  }

  return { enCours, retour, renvoyer }
}

/**
 * useAbonnement — état de l'abonnement de l'organisme courant, partagé entre
 * la bannière de l'administrateur (AppLayout) et la page « Mon abonnement ».
 * Chargé une fois par organisme ; la page le met à jour après un paiement.
 */
import { computed, ref } from 'vue'
import { getAbonnement } from '../services/abonnement'

const abonnement = ref(null)
let organismeCharge = null

export const useAbonnement = () => {
  const charger = async (tenantId) => {
    if (!tenantId || organismeCharge === tenantId) return
    organismeCharge = tenantId
    try {
      abonnement.value = (await getAbonnement(tenantId)).abonnement
    } catch {
      abonnement.value = null
    }
  }

  const mettreAJour = (valeur) => {
    abonnement.value = valeur
  }

  // Bannière : échéance dans 7 jours ou moins, grâce, ou suspension
  const alerte = computed(() => {
    const a = abonnement.value
    if (!a) return null
    const fin = new Date(`${a.date_fin}T00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    if (a.suspendu_pour_impaye) {
      return { niveau: 'erreur', texte: 'Abonnement expiré : l’accès des membres est suspendu.' }
    }
    if (a.statut === 'EN_GRACE') {
      const grace = new Date(`${a.fin_grace}T00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
      return { niveau: 'erreur', texte: `Abonnement échu le ${fin} : l’organisme sera suspendu après le ${grace}.` }
    }
    if (a.jours_restants <= 7) {
      const quand = a.jours_restants === 0 ? 'aujourd’hui' : a.jours_restants === 1 ? 'demain' : `dans ${a.jours_restants} jours`
      return { niveau: 'avertissement', texte: `Votre abonnement expire ${quand} (le ${fin}).` }
    }
    return null
  })

  return { abonnement, alerte, charger, mettreAJour }
}

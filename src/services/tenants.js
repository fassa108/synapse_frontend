import api, { publicApi } from './api'

// ─── Organismes (Admin SaaS) ──────────────────────────────────────────────────

export const recupererOrganismes = async () => {
  const response = await api.get('tenants/')
  return response.data
}

export const recupererOrganisme = async (id) => {
  const response = await api.get(`tenants/${id}/`)
  return response.data
}

// payload : informations de l'organisme + admin_email, admin_nom, admin_prenom
export const creerOrganisme = async (payload) => {
  const response = await api.post('tenants/', payload)
  return response.data
}

export const changerStatutOrganisme = async (id, statut) => {
  const response = await api.patch(`tenants/${id}/`, { statut })
  return response.data
}

// Admin d'organisme : nom, description, email, telephone, adresse, site_web
export const modifierOrganisme = async (id, champs) => {
  const response = await api.patch(`tenants/${id}/`, champs)
  return response.data
}

// Refusé par le backend si l'organisme n'est pas vide.
export const supprimerOrganisme = async (id) => {
  await api.delete(`tenants/${id}/`)
}

// ─── Inscriptions d'organismes ────────────────────────────────────────────────
// Le formulaire et le paiement sont publics : pas de jeton nécessaire.

// Renvoie { reference, montant } : la référence ouvre la page de paiement.
export const deposerDemandeInscription = async (payload) => {
  const response = await publicApi.post('demandes-inscription/', payload)
  return response.data
}

// { nom_organisme, email, statut, montant }
export const recupererInscriptionAPayer = async (reference) => {
  const response = await publicApi.get(`demandes-inscription/paiement/${reference}/`)
  return response.data
}

// Paiement simulé. moyen : 'WAVE' | 'ORANGE_MONEY'
export const payerInscription = async (reference, moyen, telephone) => {
  const response = await publicApi.post(`demandes-inscription/paiement/${reference}/`, { moyen, telephone })
  return response.data
}

// Historique (Admin SaaS). statut : 'EN_ATTENTE_PAIEMENT' | 'PAYEE' | '' (toutes)
export const recupererDemandesInscription = async (statut = '') => {
  const response = await api.get('demandes-inscription/', { params: statut ? { statut } : {} })
  return response.data
}

export const recupererIndicateursGlobaux = async () => {
  const response = await api.get('tenants/indicateurs/')
  return response.data
}

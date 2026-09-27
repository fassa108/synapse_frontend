import api from './api'

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

// Refusé par le backend si l'organisme n'est pas vide.
export const supprimerOrganisme = async (id) => {
  await api.delete(`tenants/${id}/`)
}

export const recupererIndicateursGlobaux = async () => {
  const response = await api.get('tenants/indicateurs/')
  return response.data
}

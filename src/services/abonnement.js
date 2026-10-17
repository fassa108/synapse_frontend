/**
 * Service abonnement — abonnement mensuel de l'organisme (admin d'organisme)
 * et finances de la plateforme (admin SaaS).
 *
 * Les routes d'abonnement restent accessibles quand l'organisme est suspendu
 * pour impayé : l'administrateur peut renouveler pour rétablir l'accès.
 */

import api from './api'

// { organisme, abonnement: { statut, date_fin, fin_grace, jours_restants, … }, paiements, mode_test }
export const getAbonnement = (tenantId) => api.get(`abonnements/${tenantId}/`).then((r) => r.data)

// Facture PayDunya d'un mois. Renvoie { url } : la page de paiement PayDunya.
export const renouvelerAbonnement = (tenantId) =>
  api.post(`abonnements/${tenantId}/renouveler/`).then((r) => r.data)

// Retour de PayDunya (?token=…) : même réponse que getAbonnement, plus { paiement }.
export const confirmerRenouvellement = (tenantId, token) =>
  api.post(`abonnements/${tenantId}/confirmer/`, { token }).then((r) => r.data)

// ─── Finances (admin SaaS) ────────────────────────────────────────────────────
// params : { mode: 'test' | 'live', statut, type }

export const getFinances = (params = {}) => api.get('finances/', { params }).then((r) => r.data)

export const exporterTransactions = async (params = {}) => {
  const reponse = await api.get('finances/export/', { params, responseType: 'blob' })
  const nom = reponse.headers['content-disposition']?.match(/filename="([^"]+)"/)?.[1] ?? 'transactions.xlsx'
  const url = URL.createObjectURL(reponse.data)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  lien.click()
  URL.revokeObjectURL(url)
}

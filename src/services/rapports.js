/**
 * Service rapports — rapports de promotion et bilans individuels (texte
 * rédigé par l'IA, chiffres calculés par le backend), PDF et exports Excel.
 * Un rapport en cours de génération est à relire jusqu'à « BROUILLON » ou « ECHEC ».
 */

import api from './api'

const base = (tenantId) => `tenants/${tenantId}/rapports/`

export const getRapports = (tenantId, params = {}) => api.get(base(tenantId), { params }).then((r) => r.data)

export const getRapport = (tenantId, id) => api.get(`${base(tenantId)}${id}/`).then((r) => r.data)

// type : 'PROMOTION' | 'APPRENANT' (apprenant obligatoire pour un bilan)
export const demanderRapport = (tenantId, { type, promotion, apprenant = null }) =>
  api.post(base(tenantId), { type, promotion, apprenant }).then((r) => r.data)

export const modifierRapport = (tenantId, id, contenu) =>
  api.patch(`${base(tenantId)}${id}/`, { contenu }).then((r) => r.data)

export const validerRapport = (tenantId, id) => api.post(`${base(tenantId)}${id}/valider/`).then((r) => r.data)

export const partagerRapport = (tenantId, id) => api.post(`${base(tenantId)}${id}/partager/`).then((r) => r.data)

export const relancerRapport = (tenantId, id) => api.post(`${base(tenantId)}${id}/relancer/`).then((r) => r.data)

export const supprimerRapport = (tenantId, id) => api.delete(`${base(tenantId)}${id}/`)

// ─── Téléchargements (authentifiés) ──────────────────────────────────────────

const nomDuFichier = (entete, parDefaut) => entete?.match(/filename="([^"]+)"/)?.[1] ?? parDefaut

const telecharger = async (chemin, parDefaut) => {
  const reponse = await api.get(chemin, { responseType: 'blob' })
  const url = URL.createObjectURL(reponse.data)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomDuFichier(reponse.headers['content-disposition'], parDefaut)
  lien.click()
  URL.revokeObjectURL(url)
}

export const telechargerPdf = (tenantId, id) => telecharger(`${base(tenantId)}${id}/pdf/`, 'rapport.pdf')

export const exporterProgression = (tenantId, promotionId) =>
  telecharger(`tenants/${tenantId}/exports/promotions/${promotionId}/progression/`, 'progression.xlsx')

export const exporterSuivi = (tenantId, promotionId) =>
  telecharger(`tenants/${tenantId}/exports/promotions/${promotionId}/suivi/`, 'suivi-livrables.xlsx')

export const exporterMembres = (tenantId) => telecharger(`tenants/${tenantId}/exports/membres/`, 'membres.xlsx')

/**
 * Dates relatives des tableaux de bord : « dans 2 j », « échu il y a 1 j »…
 * Comptées en jours calendaires (minuit à minuit), pas en tranches de 24 h.
 */

const JOUR = 24 * 3600 * 1000

const debutDuJour = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

// Nombre de jours entre aujourd'hui et la date (négatif si passée)
export const joursJusqua = (iso) =>
  Math.round((debutDuJour(new Date(iso)) - debutDuJour(new Date())) / JOUR)

export const echeanceRelative = (iso) => {
  const jours = joursJusqua(iso)
  if (jours === 0) return new Date(iso) < new Date() ? "échu aujourd'hui" : "aujourd'hui"
  if (jours === 1) return 'demain'
  if (jours > 1) return `dans ${jours} j`
  if (jours === -1) return 'échu hier'
  return `échu il y a ${-jours} j`
}

export const depuis = (iso) => {
  const jours = -joursJusqua(iso)
  if (jours <= 0) return "aujourd'hui"
  if (jours === 1) return 'hier'
  return `il y a ${jours} j`
}

export const dateCourte = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'

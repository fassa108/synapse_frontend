/**
 * États d'un rendu vis-à-vis de l'évaluation (listes, badges).
 * La plus récente évaluation fait foi.
 */

const STYLES = {
  VALIDE:     { libelle: 'Validé',     classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  NON_VALIDE: { libelle: 'Non validé', classes: 'bg-rose-50 text-rose-700 ring-rose-200' },
  EVALUE:     { libelle: 'Évalué',     classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  A_EVALUER:  { libelle: 'À évaluer',  classes: 'bg-sky-50 text-sky-700 ring-sky-200' },
  NON_RENDU:  { libelle: 'Non rendu',  classes: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
}

export const styleEtat = (etat) => STYLES[etat] ?? STYLES.NON_RENDU

/**
 * État d'un rendu à partir de sa dernière évaluation (ou null) et de ses
 * dépôts ({ date_depot }). Un dépôt postérieur à l'évaluation est à réévaluer.
 */
export const etatRendu = (derniere, depots = []) => {
  if (!derniere) return depots.length ? 'A_EVALUER' : 'NON_RENDU'
  const evaluee = new Date(derniere.date_creation)
  if (depots.some((d) => new Date(d.date_depot) > evaluee)) return 'A_EVALUER'
  if (!derniere.competences.length) return 'EVALUE'
  return derniere.competences.every((c) => c.acquis) ? 'VALIDE' : 'NON_VALIDE'
}

/**
 * Le formateur peut (ré)évaluer : jamais évalué, ou nouveau dépôt depuis
 * la dernière évaluation (celle-ci n'avait donc pas tout validé).
 */
export const peutEtreEvalue = (derniere, depots = []) =>
  !derniere || etatRendu(derniere, depots) === 'A_EVALUER'

/** Rendu terminé : tout est acquis (ou évalué sans compétence visée), plus de dépôt. */
export const estTermine = (derniere, depots = []) =>
  ['VALIDE', 'EVALUE'].includes(etatRendu(derniere, depots))

/** Dernière évaluation de chaque assignation (l'API les renvoie de la plus récente à la plus ancienne). */
export const dernieresParAssignation = (evaluations) => {
  const m = new Map()
  for (const e of evaluations) if (!m.has(e.assignation)) m.set(e.assignation, e)
  return m
}

export const ETATS_OPTIONS = ['A_EVALUER', 'VALIDE', 'NON_VALIDE', 'NON_RENDU'].map((v) => ({
  value: v,
  label: STYLES[v].libelle,
}))

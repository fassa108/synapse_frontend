/**
 * Sections en texte riche d'un brief, dans l'ordre d'affichage.
 * « obligatoire » reflète les règles du backend (activites/serializers.py).
 */
export const SECTIONS_BRIEF = [
  { cle: 'contexte',               titre: 'Contexte',                 obligatoire: false },
  { cle: 'modalites_pedagogiques', titre: 'Modalités pédagogiques',   obligatoire: false },
  { cle: 'modalites_evaluation',   titre: "Modalités d'évaluation",   obligatoire: true },
  { cle: 'criteres_performance',   titre: 'Critères de performance',  obligatoire: false },
  { cle: 'livrables_attendus',     titre: 'Livrables',                obligatoire: true },
]

/**
 * Mise en forme sûre des réponses de l'assistant : le texte est d'abord
 * échappé (aucun HTML venant du LLM n'est interprété), puis seuls le gras,
 * le code en ligne, les listes et les paragraphes sont reconstitués.
 */

const echapper = (texte) =>
  texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const enLigne = (texte) =>
  texte
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 text-[0.85em]">$1</code>')

export const miseEnForme = (brut) => {
  const lignes = echapper(brut ?? '').split('\n')
  const blocs = []
  let liste = null

  const fermerListe = () => {
    if (liste) blocs.push(`<${liste.type}${liste.debut > 1 ? ` start="${liste.debut}"` : ''} class="${liste.type === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 space-y-0.5">${liste.items.join('')}</${liste.type}>`)
    liste = null
  }

  for (const ligne of lignes) {
    const titre = ligne.match(/^\s*#{1,4}\s+(.*)$/)
    if (titre) {
      fermerListe()
      blocs.push(`<p class="font-semibold text-gray-900">${enLigne(titre[1])}</p>`)
      continue
    }
    const puce = ligne.match(/^\s*[-*•]\s+(.*)$/)
    const numero = ligne.match(/^\s*(\d+)[.)]\s+(.*)$/)
    if (puce || numero) {
      const type = puce ? 'ul' : 'ol'
      if (liste?.type !== type) {
        fermerListe()
        // Une liste numérotée coupée par des sous-puces reprend à son numéro
        liste = { type, items: [], debut: numero ? Number(numero[1]) : 1 }
      }
      liste.items.push(`<li>${enLigne(puce ? puce[1] : numero[2])}</li>`)
    } else if (!ligne.trim()) {
      fermerListe()
    } else {
      fermerListe()
      blocs.push(`<p>${enLigne(ligne)}</p>`)
    }
  }
  fermerListe()
  return blocs.join('')
}

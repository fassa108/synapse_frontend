import { ref, watch } from 'vue'

/**
 * État de la sidebar, partagé entre le header (bouton ☰) et la sidebar.
 * Desktop : réduite aux icônes ou non (mémorisé dans le navigateur).
 * Mobile : tiroir ouvert ou fermé.
 */
const CLE_STOCKAGE = 'sidebar_reduite'

const lireReduite = () => {
  try {
    return localStorage.getItem(CLE_STOCKAGE) === '1'
  } catch {
    return false
  }
}

const reduite = ref(lireReduite())
const ouverteMobile = ref(false)

watch(reduite, (valeur) => {
  try {
    localStorage.setItem(CLE_STOCKAGE, valeur ? '1' : '0')
  } catch {
    // stockage indisponible : l'état ne sera simplement pas mémorisé
  }
})

const estDesktop = () => window.matchMedia('(min-width: 1024px)').matches

export const useSidebar = () => {
  const basculer = () => {
    if (estDesktop()) reduite.value = !reduite.value
    else ouverteMobile.value = !ouverteMobile.value
  }

  const fermerMobile = () => {
    ouverteMobile.value = false
  }

  return { reduite, ouverteMobile, basculer, fermerMobile }
}

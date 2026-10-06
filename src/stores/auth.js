import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import {
  connexion,
  refreshToken,
  logout,
} from '../services/auth'

export const useAuthStore = defineStore('auth', () => {
  // ─────────────────────────────────────────
  // État
  // ─────────────────────────────────────────

  const utilisateur = ref(
    JSON.parse(localStorage.getItem('utilisateur')) || null
  )

  const tenants = ref(
    JSON.parse(localStorage.getItem('tenants')) || []
  )

  const accessToken = ref(
    localStorage.getItem('access_token')
  )

  const refreshTokenValue = ref(
    localStorage.getItem('refresh_token')
  )

  const tenantCourant = ref(
    JSON.parse(localStorage.getItem('tenant_courant')) || null
  )

  // ─────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────

  const isAuthenticated = computed(() => {
    return !!accessToken.value
  })

  const role = computed(() => {
    if (utilisateur.value?.est_admin_saas) {
      return 'admin_saas'
    }

    return tenantCourant.value?.role ?? null
  })

  // ─────────────────────────────────────────
  // Session
  // ─────────────────────────────────────────

  const sauvegarderSession = (data) => {
    utilisateur.value = data.utilisateur
    tenants.value = data.tenants
    accessToken.value = data.access
    refreshTokenValue.value = data.refresh

    localStorage.setItem(
      'utilisateur',
      JSON.stringify(data.utilisateur)
    )

    localStorage.setItem(
      'tenants',
      JSON.stringify(data.tenants)
    )

    localStorage.setItem(
      'access_token',
      data.access
    )

    localStorage.setItem(
      'refresh_token',
      data.refresh
    )
  }

  // Après un refresh : le backend renvoie un nouvel access token
  // et un nouveau refresh token (l'ancien est invalidé).
  const enregistrerTokens = (access, refresh) => {
    accessToken.value = access
    localStorage.setItem('access_token', access)

    if (refresh) {
      refreshTokenValue.value = refresh
      localStorage.setItem('refresh_token', refresh)
    }
  }

  // ─────────────────────────────────────────
  // Connexion
  // ─────────────────────────────────────────

  const seConnecter = async (email, password) => {
    const data = await connexion(email, password)

    sauvegarderSession(data)

    if (data.tenants.length === 1) {
      definirTenantCourant(data.tenants[0])
    }

    return data
  }

  // ─────────────────────────────────────────
  // Tenant courant
  // ─────────────────────────────────────────

  const definirTenantCourant = (tenant) => {
    tenantCourant.value = tenant

    localStorage.setItem(
      'tenant_courant',
      JSON.stringify(tenant)
    )
  }

  // Le backend a répondu « organisme_suspendu » ou « membre_suspendu » :
  // on met à jour l'état local pour que le routeur affiche la page dédiée.
  const mettreAJourTenantCourant = (champs) => {
    if (!tenantCourant.value) return

    definirTenantCourant({ ...tenantCourant.value, ...champs })

    tenants.value = tenants.value.map((t) =>
      t.id === tenantCourant.value.id ? { ...t, ...champs } : t
    )
    localStorage.setItem('tenants', JSON.stringify(tenants.value))
  }

  const marquerOrganismeSuspendu = () => mettreAJourTenantCourant({ statut: false })

  const marquerAccesSuspendu = () => mettreAJourTenantCourant({ actif: false })

  // ─────────────────────────────────────────
  // Déconnexion
  // ─────────────────────────────────────────

  const seDeconnecter = async () => {
    try {
      if (refreshTokenValue.value) {
        await logout(refreshTokenValue.value)
      }
    } finally {
      utilisateur.value = null
      tenants.value = []
      accessToken.value = null
      refreshTokenValue.value = null
      tenantCourant.value = null

      localStorage.removeItem('utilisateur')
      localStorage.removeItem('tenants')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('tenant_courant')
    }
  }

  // ─────────────────────────────────────────
  // Refresh access token
  // ─────────────────────────────────────────

  const rafraichirAccessToken = async () => {
    if (!refreshTokenValue.value) {
      throw new Error('Aucun refresh token disponible.')
    }

    const data = await refreshToken(
      refreshTokenValue.value
    )

    enregistrerTokens(data.access, data.refresh)

    return data.access
  }

  return {
    utilisateur,
    tenants,
    tenantCourant,
    accessToken,
    refreshTokenValue,

    isAuthenticated,
    role,

    seConnecter,
    seDeconnecter,
    rafraichirAccessToken,
    enregistrerTokens,
    definirTenantCourant,
    mettreAJourTenantCourant,
    marquerOrganismeSuspendu,
    marquerAccesSuspendu,
  }
})


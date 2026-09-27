import { createRouter, createWebHistory } from 'vue-router'

// ─── Routes publiques ─────────────────────────────────────────────────────────

const routes = [
  // Auth
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/auth/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/activate-account/:uid/:token',
    name: 'activate-account',
    component: () => import('../pages/auth/ActivateAccountPage.vue'),
    meta: { public: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../pages/auth/ForgotPasswordPage.vue'),
    meta: { public: true },
  },
  {
    path: '/forgot-password-confirmation',
    name: 'forgot-password-confirmation',
    component: () => import('../pages/auth/ForgotPasswordConfirmationPage.vue'),
    meta: { public: true },
  },
  {
    path: '/reset-password/:uid/:token',
    name: 'reset-password',
    component: () => import('../pages/auth/ResetPasswordPage.vue'),
    meta: { public: true },
  },

  // Sélection du tenant (multi-organisme)
  {
    path: '/choisir-organisme',
    name: 'choisir-organisme',
    component: () => import('../pages/auth/ChoisirOrganismePage.vue'),
    meta: { requiresAuth: true },
  },

  // Organisme suspendu : membres connectés mais sans accès à l'organisme
  {
    path: '/organisme-suspendu',
    name: 'organisme-suspendu',
    component: () => import('../pages/auth/OrganismeSuspenduPage.vue'),
    meta: { requiresAuth: true },
  },

  // ─── Admin SaaS ────────────────────────────────────────────────────────────
  {
    path: '/admin/organismes',
    name: 'admin-organismes',
    component: () => import('../pages/admin-saas/OrganismesPage.vue'),
    meta: { requiresAuth: true, roles: ['admin_saas'] },
  },
  {
    path: '/admin/organismes/:id',
    name: 'admin-organisme-detail',
    component: () => import('../pages/admin-saas/OrganismeDetailPage.vue'),
    meta: { requiresAuth: true, roles: ['admin_saas'] },
  },

  // ─── Admin Organisme ────────────────────────────────────────────────────────
  {
    path: '/dashboard/admin',
    name: 'dashboard-admin',
    component: () => import('../pages/admin-organisme/DashboardPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },
  {
    path: '/apprenants',
    name: 'apprenants',
    component: () => import('../pages/admin-organisme/ApprenantsPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },
  {
    path: '/formateurs',
    name: 'formateurs',
    component: () => import('../pages/admin-organisme/FormateursPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },


  // ─── Profil & Paramètres (tous rôles authentifiés) ─────────────────────────
  {
    path: '/profil',
    name: 'profil',
    component: () => import('../pages/shared/ProfilPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/parametres',
    name: 'parametres',
    component: () => import('../pages/shared/ParametresPage.vue'),
    meta: { requiresAuth: true },
  },

  // ─── Formateur ─────────────────────────────────────────────────────────────
  {
    path: '/dashboard/formateur',
    name: 'dashboard-formateur',
    component: () => import('../pages/formateur/DashboardFormateurPage.vue'),
    meta: { requiresAuth: true, roles: ['FORMATEUR'] },
  },
  {
    path: '/briefs',
    name: 'briefs',
    component: () => import('../pages/formateur/DashboardFormateurPage.vue'),
    meta: { requiresAuth: true, roles: ['FORMATEUR'] },
  },

  // ─── Apprenant ─────────────────────────────────────────────────────────────
  {
    path: '/dashboard/apprenant',
    name: 'dashboard-apprenant',
    component: () => import('../pages/apprenant/DashboardApprenantPage.vue'),
    meta: { requiresAuth: true, roles: ['APPRENANT'] },
  },
  {
    path: '/activites',
    name: 'activites',
    component: () => import('../pages/apprenant/DashboardApprenantPage.vue'),
    meta: { requiresAuth: true, roles: ['APPRENANT'] },
  },
  {
    path: '/livrables',
    name: 'livrables',
    component: () => import('../pages/apprenant/DashboardApprenantPage.vue'),
    meta: { requiresAuth: true, roles: ['APPRENANT'] },
  },


  // ─── Racine ─────────────────────────────────────────────────────────────────
  {
    path: '/',
    redirect: '/login',
  },

  // ─── 404 fallback ──────────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ─── Navigation guards ────────────────────────────────────────────────────────

router.beforeEach((to) => {
  const accessToken = localStorage.getItem('access_token')
  const isAuthenticated = !!accessToken

  // Routes publiques : accès libre
  if (to.meta.public) {
    // Déjà connecté → ne pas rester sur /login
    if (isAuthenticated && to.name === 'login') {
      const tenantCourant = JSON.parse(
        localStorage.getItem('tenant_courant') || 'null'
      )
      const utilisateur = JSON.parse(
        localStorage.getItem('utilisateur') || 'null'
      )

      if (utilisateur?.est_admin_saas) {
        return { name: 'admin-organismes' }
      }

      if (tenantCourant?.role === 'ADMINISTRATEUR') {
        return { name: 'dashboard-admin' }
      }
      if (tenantCourant?.role === 'FORMATEUR') {
        return { name: 'dashboard-formateur' }
      }
      if (tenantCourant?.role === 'APPRENANT') {
        return { name: 'dashboard-apprenant' }
      }
    }
    return true
  }

  // Route protégée : doit être authentifié
  if (!isAuthenticated) {
    return { name: 'login' }
  }

  // Vérification du rôle si la route le requiert
  const allowedRoles = to.meta.roles
  if (allowedRoles && allowedRoles.length > 0) {
    const utilisateur = JSON.parse(
      localStorage.getItem('utilisateur') || 'null'
    )
    const tenantCourant = JSON.parse(
      localStorage.getItem('tenant_courant') || 'null'
    )

    let currentRole = null
    if (utilisateur?.est_admin_saas) {
      currentRole = 'admin_saas'
    } else {
      currentRole = tenantCourant?.role ?? null
    }

    // Organisme suspendu ou accès du membre suspendu :
    // aucun accès aux pages de l'organisme
    if (
      currentRole !== 'admin_saas' &&
      (tenantCourant?.statut === false || tenantCourant?.actif === false)
    ) {
      return { name: 'organisme-suspendu' }
    }

    if (!currentRole || !allowedRoles.includes(currentRole)) {
      // Redirection vers le bon espace selon le rôle réel
      if (utilisateur?.est_admin_saas) return { name: 'admin-organismes' }
      if (tenantCourant?.role === 'ADMINISTRATEUR') return { name: 'dashboard-admin' }
      if (tenantCourant?.role === 'FORMATEUR') return { name: 'dashboard-formateur' }
      if (tenantCourant?.role === 'APPRENANT') return { name: 'dashboard-apprenant' }
      return { name: 'login' }
    }
  }

  return true
})

export default router

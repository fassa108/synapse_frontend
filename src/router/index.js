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
    path: '/formations',
    name: 'formations',
    component: () => import('../pages/admin-organisme/FormationsPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/formations/creer',
    name: 'formation-creer',
    component: () => import('../pages/admin-organisme/FormationCreerPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },
  {
    path: '/formations/:id',
    name: 'formation-detail',
    component: () => import('../pages/admin-organisme/FormationDetailPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/modules',
    name: 'modules',
    component: () => import('../pages/admin-organisme/ModulesPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },
  {
    path: '/modules/creer',
    name: 'module-creer',
    component: () => import('../pages/admin-organisme/ModuleCreerPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },
  {
    path: '/modules/:id',
    name: 'module-detail',
    component: () => import('../pages/admin-organisme/ModuleDetailPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/competences',
    name: 'competences',
    component: () => import('../pages/admin-organisme/CompetencesPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },
  {
    path: '/competences/creer',
    name: 'competence-creer',
    component: () => import('../pages/admin-organisme/CompetenceCreerPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },
  {
    path: '/niveaux',
    name: 'niveaux',
    component: () => import('../pages/admin-organisme/NiveauxPage.vue'),
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
  {
    path: '/promotions/creer',
    name: 'promotion-creer',
    component: () => import('../pages/admin-organisme/PromotionCreerPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },

  // ─── Pages partagées Admin Organisme + Formateur ────────────────────────────
  {
    path: '/promotions',
    name: 'promotions',
    component: () => import('../pages/shared/PromotionsPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/promotions/:id',
    name: 'promotion-detail',
    component: () => import('../pages/shared/PromotionDetailPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/apprenants/:id',
    name: 'apprenant-detail',
    component: () => import('../pages/shared/ApprenantDetailPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/groupes',
    name: 'groupes',
    component: () => import('../pages/shared/GroupesPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/groupes/:id',
    name: 'groupe-detail',
    component: () => import('../pages/shared/GroupeDetailPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
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
    component: () => import('../pages/shared/BriefsPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/briefs/creer',
    name: 'brief-creer',
    component: () => import('../pages/formateur/BriefFormPage.vue'),
    meta: { requiresAuth: true, roles: ['FORMATEUR'] },
  },
  {
    path: '/briefs/:id',
    name: 'brief-detail',
    component: () => import('../pages/shared/BriefDetailPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/briefs/:id/modifier',
    name: 'brief-modifier',
    component: () => import('../pages/formateur/BriefFormPage.vue'),
    meta: { requiresAuth: true, roles: ['FORMATEUR'] },
  },
  {
    path: '/suivi-livrables',
    name: 'suivi-livrables',
    component: () => import('../pages/shared/LivrablesPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/progression',
    name: 'progression',
    component: () => import('../pages/shared/ProgressionPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/progression/:id',
    name: 'progression-apprenant',
    component: () => import('../pages/shared/ProgressionApprenantPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('../pages/admin-organisme/CategoriesPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR'] },
  },
  {
    path: '/ressources',
    name: 'ressources',
    component: () => import('../pages/shared/RessourcesPage.vue'),
    meta: { requiresAuth: true, roles: ['ADMINISTRATEUR', 'FORMATEUR'] },
  },

  // ─── Apprenant ─────────────────────────────────────────────────────────────
  {
    path: '/dashboard/apprenant',
    name: 'dashboard-apprenant',
    component: () => import('../pages/apprenant/DashboardApprenantPage.vue'),
    meta: { requiresAuth: true, roles: ['APPRENANT'] },
  },
  {
    path: '/ma-formation',
    name: 'ma-formation',
    component: () => import('../pages/apprenant/MaFormationPage.vue'),
    meta: { requiresAuth: true, roles: ['APPRENANT'] },
  },
  {
    path: '/activites',
    name: 'activites',
    component: () => import('../pages/apprenant/MesActivitesPage.vue'),
    meta: { requiresAuth: true, roles: ['APPRENANT'] },
  },
  {
    path: '/activites/:id',
    name: 'activite-detail',
    component: () => import('../pages/apprenant/ActiviteDetailPage.vue'),
    meta: { requiresAuth: true, roles: ['APPRENANT'] },
  },
  {
    path: '/ma-progression',
    name: 'ma-progression',
    component: () => import('../pages/apprenant/MaProgressionPage.vue'),
    meta: { requiresAuth: true, roles: ['APPRENANT'] },
  },
  {
    path: '/livrables',
    name: 'livrables',
    component: () => import('../pages/apprenant/MesLivrablesPage.vue'),
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

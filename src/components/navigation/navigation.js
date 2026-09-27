export const navigationByRole = {
  ADMINISTRATEUR: [
    {
      label: 'Dashboard',
      icon: 'fa-solid fa-chart-line',
      to: '/dashboard/admin',
    },
    {
      label: 'Formations',
      icon: 'fa-solid fa-book-open',
      to: '/formations',
    },
    {
      label: 'Promotions',
      icon: 'fa-solid fa-users',
      to: '/promotions',
    },
    {
      label: 'Modules',
      icon: 'fa-solid fa-layer-group',
      to: '/modules',
    },
    {
      label: 'Apprenants',
      icon: 'fa-solid fa-user-graduate',
      to: '/apprenants',
    },
    {
      label: 'Formateurs',
      icon: 'fa-solid fa-chalkboard-user',
      to: '/formateurs',
    },
  ],

  FORMATEUR: [
    {
      label: 'Dashboard',
      icon: 'fa-solid fa-chart-line',
      to: '/dashboard/formateur',
    },
    {
      label: 'Formations',
      icon: 'fa-solid fa-book-open',
      to: '/formations',
    },
    {
      label: 'Groupes',
      icon: 'fa-solid fa-user-group',
      to: '/groupes',
    },
    {
      label: 'Briefs',
      icon: 'fa-solid fa-clipboard',
      to: '/briefs',
    },
  ],

  APPRENANT: [
    {
      label: 'Dashboard',
      icon: 'fa-solid fa-chart-line',
      to: '/dashboard/apprenant',
    },
    {
      label: 'Mes activités',
      icon: 'fa-solid fa-book-open',
      to: '/activites',
    },
    {
      label: 'Mes livrables',
      icon: 'fa-solid fa-file-lines',
      to: '/livrables',
    },
    {
      label: 'Mes compétences',
      icon: 'fa-solid fa-bullseye',
      to: '/competences',
    },
  ],

  admin_saas: [
    {
      label: 'Organismes',
      icon: 'fa-solid fa-building',
      to: '/admin/organismes',
    },
  ],
}


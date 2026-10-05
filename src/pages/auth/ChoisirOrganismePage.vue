<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const handleChoisir = (tenant) => {
  authStore.definirTenantCourant(tenant)

  if (tenant.statut === false || tenant.actif === false) {
    router.push('/organisme-suspendu')
    return
  }

  switch (tenant.role) {
    case 'ADMINISTRATEUR':
      router.push('/dashboard/admin')
      break
    case 'FORMATEUR':
      router.push('/dashboard/formateur')
      break
    case 'APPRENANT':
      router.push('/dashboard/apprenant')
      break
    default:
      router.push('/login')
  }
}

const handleLogout = async () => {
  await authStore.seDeconnecter()
  router.push('/login')
}

const labelRole = (role) => {
  const map = {
    ADMINISTRATEUR: 'Admin Organisme',
    FORMATEUR: 'Formateur',
    APPRENANT: 'Apprenant',
  }
  return map[role] ?? role
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-md">

      <!-- Logo -->
      <div class="mb-8 flex flex-col items-center gap-3">
        <img src="../../assets/logo-eduhub.png" alt="EduHub" class="h-10 w-auto" />
        <div class="text-center">
          <h1
            class="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-gray-900"
          >
            Choisir un organisme
          </h1>
          <p
            class="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500"
          >
            Vous êtes membre de plusieurs organismes. Sélectionnez celui dans lequel vous souhaitez travailler.
          </p>
        </div>
      </div>

      <!-- Liste des tenants -->
      <div class="flex flex-col gap-3">
        <button
          v-for="tenant in authStore.tenants"
          :key="tenant.id"
          type="button"
          class="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          @click="handleChoisir(tenant)"
        >
          <!-- Icône organisme -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50"
          >
            <i class="fa-solid fa-building text-sm text-indigo-500"></i>
          </div>

          <!-- Infos -->
          <div class="min-w-0 flex-1">
            <p
              class="truncate font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900"
            >
              {{ tenant.nom }}
            </p>
            <p
              class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500"
            >
              {{ labelRole(tenant.role) }}
              <span
                v-if="tenant.statut === false || tenant.actif === false"
                class="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-200"
              >
                {{ tenant.statut === false ? 'Suspendu' : 'Accès suspendu' }}
              </span>
            </p>
          </div>

          <i class="fa-solid fa-chevron-right text-xs text-zinc-400"></i>
        </button>
      </div>

      <!-- Déconnexion -->
      <div class="mt-8 text-center">
        <button
          type="button"
          class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500 hover:text-red-500 transition"
          @click="handleLogout"
        >
          Se déconnecter
        </button>
      </div>

    </div>
  </main>
</template>

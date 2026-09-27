<script setup>
/**
 * OrganismeSuspenduPage — affichée quand l'utilisateur n'a plus accès
 * à l'organisme courant :
 *   - l'organisme est suspendu par l'admin SaaS (statut = false) ;
 *   - son accès de membre est suspendu par l'admin d'organisme (actif = false).
 *
 * L'utilisateur reste connecté. S'il appartient à d'autres organismes
 * accessibles, il peut en choisir un autre.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const organismeSuspendu = computed(() => authStore.tenantCourant?.statut === false)

const autresOrganismes = computed(() =>
  authStore.tenants.filter(
    (t) =>
      t.id !== authStore.tenantCourant?.id &&
      t.statut !== false &&
      t.actif !== false
  )
)

const handleChoisirAutre = () => router.push('/choisir-organisme')

const handleLogout = async () => {
  await authStore.seDeconnecter()
  router.push('/login')
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-md text-center">

      <div class="mb-6 flex justify-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-200">
          <i class="fa-solid fa-pause text-lg text-amber-600"></i>
        </div>
      </div>

      <h1 class="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-gray-900">
        {{ organismeSuspendu ? 'Organisme suspendu' : 'Accès suspendu' }}
      </h1>
      <p class="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
        {{ organismeSuspendu ? "L'accès à" : 'Votre accès à' }}
        <span class="font-semibold text-zinc-700">{{ authStore.tenantCourant?.nom ?? 'cet organisme' }}</span>
        {{ organismeSuspendu ? 'est temporairement suspendu.' : 'a été suspendu par son administrateur.' }}
        Contactez l'administrateur de votre organisme pour plus d'informations.
      </p>
      <p class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
        Si votre accès a été rétabli, reconnectez-vous.
      </p>

      <div class="mt-8 flex flex-col items-center gap-3">
        <button
          v-if="autresOrganismes.length > 0"
          type="button"
          class="w-full rounded-xl bg-indigo-500 px-6 py-3 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
          @click="handleChoisirAutre"
        >
          Choisir un autre organisme
        </button>
        <button
          type="button"
          class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500 transition hover:text-red-500"
          @click="handleLogout"
        >
          Se déconnecter
        </button>
      </div>

    </div>
  </main>
</template>

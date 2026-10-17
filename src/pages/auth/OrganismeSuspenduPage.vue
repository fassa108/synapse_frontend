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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getAbonnement } from '../../services/abonnement'

const router = useRouter()
const authStore = useAuthStore()

const organismeSuspendu = computed(() => authStore.tenantCourant?.statut === false)

// Suspendu faute de paiement : l'administrateur peut renouveler lui-même
const estAdmin = computed(() => authStore.tenantCourant?.role === 'ADMINISTRATEUR' && authStore.tenantCourant?.actif !== false)
const impaye = ref(authStore.tenantCourant?.abonnement_expire === true)

onMounted(async () => {
  if (!organismeSuspendu.value || !estAdmin.value) return
  try {
    const { abonnement } = await getAbonnement(authStore.tenantCourant.id)
    impaye.value = abonnement.suspendu_pour_impaye
    if (impaye.value) authStore.marquerAbonnementExpire()
  } catch {
    // Page affichée telle quelle
  }
})

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
        {{ organismeSuspendu && impaye ? 'Abonnement expiré' : organismeSuspendu ? 'Organisme suspendu' : 'Accès suspendu' }}
      </h1>

      <!-- Impayé : renouvellement par l'administrateur -->
      <template v-if="organismeSuspendu && impaye">
        <p class="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
          L'abonnement de
          <span class="font-semibold text-zinc-700">{{ authStore.tenantCourant?.nom ?? 'cet organisme' }}</span>
          n'a pas été renouvelé : l'accès est suspendu.
          {{ estAdmin ? 'Renouvelez-le pour rétablir immédiatement l’accès de tous les membres.' : 'Contactez l’administrateur de votre organisme pour le renouveler.' }}
        </p>
        <button
          v-if="estAdmin"
          type="button"
          class="mt-6 w-full rounded-xl bg-indigo-500 px-6 py-3 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
          @click="router.push('/abonnement')"
        >
          <i class="fa-solid fa-credit-card mr-1.5"></i> Renouveler l'abonnement
        </button>
      </template>

      <p v-else class="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
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

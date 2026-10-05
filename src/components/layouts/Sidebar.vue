<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import SidebarNav from '../navigation/SidebarNav.vue'
import { navigationByRole } from '../navigation/navigation.js'
import { useAuthStore } from '../../stores/auth'
import { useSidebar } from '../../composables/useSidebar'

const props = defineProps({
  role:      { type: String, required: true },
  organisme: { type: String, default: '' },
  tenants:   { type: Array,  default: () => [] },
})

const router    = useRouter()
const authStore = useAuthStore()
const { reduite, ouverteMobile } = useSidebar()

const navigation = computed(() => navigationByRole[props.role] ?? [])

// Réduite (desktop uniquement) : libellés masqués, icônes centrées
const masqueLibelle = computed(() => (reduite.value ? 'lg:hidden' : ''))
const centreLien    = computed(() => (reduite.value ? 'lg:justify-center lg:px-0' : ''))
const infobulle     = (libelle) => (reduite.value ? libelle : undefined)

const handleLogout = async () => {
  await authStore.seDeconnecter()
  router.push('/login')
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-[width,transform] duration-200 lg:static lg:translate-x-0"
    :class="[
      ouverteMobile ? 'translate-x-0 shadow-xl' : '-translate-x-full',
      reduite ? 'lg:w-16' : 'lg:w-64',
    ]"
  >
    <!-- Logo -->
    <div
      class="flex h-14 shrink-0 items-center border-b border-gray-100 px-5"
      :class="reduite ? 'lg:justify-center lg:px-0' : ''"
    >
      <img src="../../assets/logo-eduhub.png" alt="EduHub" class="h-8 w-auto" :class="masqueLibelle" />
      <img
        src="../../assets/logo-eduhub-icone.png"
        alt="EduHub"
        class="hidden h-7 w-auto"
        :class="reduite ? 'lg:block' : ''"
      />
    </div>

    <!-- Navigation scrollable -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3" :class="reduite ? 'lg:px-2' : ''">
      <SidebarNav :items="navigation" :reduite="reduite" />
    </div>

    <!-- Pied : profil, paramètres, déconnexion -->
    <div class="flex flex-col gap-0.5 border-t border-gray-100 px-3 py-3" :class="reduite ? 'lg:px-2' : ''">
      <RouterLink
        to="/profil"
        class="flex items-center gap-3 rounded-lg px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        :class="centreLien"
        :title="infobulle('Profil')"
        active-class="bg-gray-100 !text-gray-900"
      >
        <i class="fa-regular fa-user w-4 shrink-0 text-center text-sm text-gray-400"></i>
        <span :class="masqueLibelle">Profil</span>
      </RouterLink>

      <RouterLink
        to="/parametres"
        class="flex items-center gap-3 rounded-lg px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        :class="centreLien"
        :title="infobulle('Paramètres')"
        active-class="bg-gray-100 !text-gray-900"
      >
        <i class="fa-regular fa-gear w-4 shrink-0 text-center text-sm text-gray-400"></i>
        <span :class="masqueLibelle">Paramètres</span>
      </RouterLink>

      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
        :class="centreLien"
        :title="infobulle('Déconnexion')"
        @click="handleLogout"
      >
        <i class="fa-solid fa-arrow-right-from-bracket w-4 shrink-0 text-center text-sm text-gray-400"></i>
        <span :class="masqueLibelle">Déconnexion</span>
      </button>
    </div>
  </aside>
</template>

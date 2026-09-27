<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import SidebarNav from '../navigation/SidebarNav.vue'
import { navigationByRole } from '../navigation/navigation.js'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  role:      { type: String, required: true },
  organisme: { type: String, default: '' },
  tenants:   { type: Array,  default: () => [] },
})

const router    = useRouter()
const authStore = useAuthStore()

const navigation = computed(() => navigationByRole[props.role] ?? [])

const handleLogout = async () => {
  await authStore.seDeconnecter()
  router.push('/login')
}
</script>

<template>
  <aside
    class="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white"
  >
    <!-- Logo -->
    <div class="flex h-14 shrink-0 items-center gap-2.5 px-5 border-b border-gray-100">
      <div
        class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 shadow-sm"
      >
        <div class="h-2.5 w-3.5 rounded-sm bg-white opacity-90"></div>
      </div>
      <span class="font-['Sora'] text-[17px] font-semibold leading-5 tracking-tight text-gray-900">
        EduHub
      </span>
    </div>

    <!-- Navigation scrollable -->
    <div class="flex-1 overflow-y-auto px-3 py-3">
      <SidebarNav :items="navigation" />
    </div>

    <!-- Pied : profil, paramètres, déconnexion -->
    <div class="flex flex-col gap-0.5 border-t border-gray-100 px-3 py-3">
      <RouterLink
        to="/profil"
        class="flex items-center gap-3 rounded-lg px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        active-class="bg-gray-100 !text-gray-900"
      >
        <i class="fa-regular fa-user w-4 shrink-0 text-center text-sm text-gray-400"></i>
        <span>Profil</span>
      </RouterLink>

      <RouterLink
        to="/parametres"
        class="flex items-center gap-3 rounded-lg px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        active-class="bg-gray-100 !text-gray-900"
      >
        <i class="fa-regular fa-gear w-4 shrink-0 text-center text-sm text-gray-400"></i>
        <span>Paramètres</span>
      </RouterLink>

      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
        @click="handleLogout"
      >
        <i class="fa-solid fa-arrow-right-from-bracket w-4 shrink-0 text-center text-sm text-gray-400"></i>
        <span>Déconnexion</span>
      </button>
    </div>
  </aside>
</template>

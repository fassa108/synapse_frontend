<script setup>
/**
 * Cloche du header : badge des non lues et menu des dernières notifications.
 * Un clic sur une notification la marque comme lue et ouvre sa page.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '../../composables/useNotifications'
import NotificationItem from './NotificationItem.vue'

const router = useRouter()
const { nonLues, recentes, chargerRecentes, marquerLue, toutMarquerLu, demarrer, arreter } = useNotifications()

const ouvert = ref(false)
const chargement = ref(false)
const erreur = ref(false)
const racine = ref(null)

const badge = computed(() => (nonLues.value > 9 ? '9+' : String(nonLues.value)))

const basculer = async () => {
  ouvert.value = !ouvert.value
  if (!ouvert.value) return
  chargement.value = true
  erreur.value = false
  try {
    await chargerRecentes()
  } catch {
    erreur.value = true
  } finally {
    chargement.value = false
  }
}

const fermer = () => {
  ouvert.value = false
}

const ouvrir = async (notification) => {
  fermer()
  try {
    await marquerLue(notification)
  } catch {
    // la navigation reste possible même si le marquage échoue
  }
  if (notification.lien) router.push(notification.lien)
}

const voirTout = () => {
  fermer()
  router.push('/notifications')
}

const surClicExterieur = (e) => {
  if (ouvert.value && racine.value && !racine.value.contains(e.target)) fermer()
}
const surEchap = (e) => {
  if (e.key === 'Escape') fermer()
}

onMounted(() => {
  demarrer()
  document.addEventListener('click', surClicExterieur)
  document.addEventListener('keydown', surEchap)
})

onUnmounted(() => {
  arreter()
  document.removeEventListener('click', surClicExterieur)
  document.removeEventListener('keydown', surEchap)
})
</script>

<template>
  <div ref="racine" class="relative">
    <button
      type="button"
      class="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-slate-100"
      :class="ouvert ? 'bg-slate-100 text-zinc-700' : ''"
      :aria-label="nonLues ? `Notifications, ${nonLues} non lue(s)` : 'Notifications'"
      :aria-expanded="ouvert"
      aria-haspopup="true"
      @click="basculer"
    >
      <i class="fa-solid fa-bell text-sm"></i>
      <span
        v-if="nonLues > 0"
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-['Plus_Jakarta_Sans'] text-[10px] font-bold leading-none text-white ring-2 ring-white"
      >
        {{ badge }}
      </span>
    </button>

    <div
      v-if="ouvert"
      class="absolute right-0 top-10 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
      role="dialog"
      aria-label="Notifications"
    >
      <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span class="font-['Sora'] text-sm font-semibold text-gray-900">Notifications</span>
        <button
          v-if="nonLues > 0"
          type="button"
          class="font-['Plus_Jakarta_Sans'] text-xs font-medium text-indigo-600 hover:text-indigo-700"
          @click="toutMarquerLu"
        >
          Tout marquer comme lu
        </button>
      </div>

      <div class="max-h-96 divide-y divide-slate-100 overflow-y-auto">
        <p v-if="chargement && !recentes.length" class="px-4 py-6 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
          Chargement…
        </p>
        <p v-else-if="erreur" class="px-4 py-6 text-center font-['Plus_Jakarta_Sans'] text-sm text-red-500">
          Impossible de charger les notifications.
        </p>
        <div v-else-if="!recentes.length" class="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <i class="fa-regular fa-bell text-xl text-zinc-300"></i>
          <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Aucune notification pour le moment.</p>
        </div>
        <template v-else>
          <NotificationItem
            v-for="n in recentes"
            :key="n.id"
            :notification="n"
            compact
            @ouvrir="ouvrir"
          />
        </template>
      </div>

      <button
        type="button"
        class="block w-full border-t border-slate-100 px-4 py-2.5 text-center font-['Plus_Jakarta_Sans'] text-xs font-semibold text-indigo-600 hover:bg-slate-50"
        @click="voirTout"
      >
        Voir toutes les notifications
      </button>
    </div>
  </div>
</template>

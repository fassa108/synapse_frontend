<template>
  <main class="grid min-h-screen w-full grid-cols-1 bg-slate-50 lg:grid-cols-2">
    <!-- Partie gauche -->
    <AuthBrandPanel />

    <!-- Partie droite -->
    <section
      class="flex lg:min-h-screen items-start lg:items-center justify-start bg-slate-50 px-6 py-12 sm:px-10 lg:px-36 lg:py-24"
    >
      <div class="w-full max-w-96">
        <div class="flex flex-col gap-8">

          <!-- En-tête -->
          <div class="flex flex-col gap-5">

            <!-- Icône -->
            <div
              class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100"
            >
              <i
                class="fa-solid fa-check text-xl text-emerald-700"
              ></i>
            </div>

            <!-- Texte -->
            <div class="flex flex-col gap-3">
              <h1
                class="font-['Plus_Jakarta_Sans'] text-3xl font-bold leading-9 text-gray-900"
              >
                Lien envoyé
              </h1>

              <p
                class="font-['Plus_Jakarta_Sans'] text-sm leading-6 text-zinc-600"
              >
                Nous avons envoyé un lien de réinitialisation à
                <span class="font-semibold text-zinc-900">
                  {{ email }}
                </span>.
              </p>

              <p
                class="font-['Plus_Jakarta_Sans'] text-sm leading-6 text-zinc-500"
              >
                Consultez votre boîte de réception et cliquez sur le lien
                pour créer un nouveau mot de passe.
              </p>
            </div>
          </div>

          <!-- Information -->
          <div
            class="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3.5"
          >
            <i
              class="fa-regular fa-clock mt-0.5 text-sm text-zinc-500"
            ></i>

            <p
              class="font-['Plus_Jakarta_Sans'] text-xs leading-5 text-zinc-600"
            >
              Le lien est valable pendant 15 minutes.
            </p>
          </div>

          <!-- Retour connexion -->
          <RouterLink
            to="/login"
            class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow-md"
          >
            <span>Retour à la connexion</span>

            <i class="fa-solid fa-arrow-right text-xs"></i>
          </RouterLink>

          <!-- Vérification boîte mail -->
          <p
            class="text-center font-['Plus_Jakarta_Sans'] text-xs leading-5 text-zinc-500"
          >
            Vous ne trouvez pas l'e-mail ?
            <span class="text-zinc-700">
              Vérifiez vos spams ou courriers indésirables.
            </span>
          </p>

        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel.vue'

const route = useRoute()

const email = computed(() => {
  return route.query.email || ''
})
</script>
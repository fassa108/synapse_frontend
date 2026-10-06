<template>
  <main class="grid min-h-screen w-full grid-cols-1 bg-slate-50 lg:grid-cols-2">

    <!-- Partie gauche -->
    <AuthBrandPanel />

    <!-- Partie droite -->
    <section
      class="flex lg:min-h-screen items-start lg:items-center justify-start bg-slate-50 px-6 py-12 sm:px-10 lg:px-36 lg:py-24"
    >
      <div class="w-full max-w-96 py-6">

        <div class="flex flex-col gap-8">

          <!-- En-tête -->
          <div class="flex flex-col gap-3">

            <!-- Icône -->
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 shadow-sm"
            >
              <i class="fa-solid fa-envelope text-[20px] text-indigo-500"></i>
            </div>

            <!-- Titre -->
            <div class="pt-3">
              <h1
                class="font-['Plus_Jakarta_Sans'] text-3xl font-bold leading-9 text-gray-900"
              >
                Mot de passe oublié
              </h1>
            </div>

            <!-- Description -->
            <p
              class="font-['Plus_Jakarta_Sans'] text-sm font-normal leading-6 text-zinc-700"
            >
              Indiquez votre adresse e-mail pour recevoir un lien de
              réinitialisation sécurisé (valable 2 heures).
            </p>

          </div>

          <!-- Formulaire -->
            <form
            @submit.prevent="handleSubmit"
            novalidate
            class="flex flex-col gap-5"
            >
            <!-- Email -->
            <div class="flex flex-col gap-2.5">
                <label
                for="email"
                class="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-zinc-900"
                >
                Adresse e-mail
                </label>

                <div class="group relative">
                <div
                    class="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center"
                >
                    <i
                    class="fa-regular fa-envelope text-[15px] text-zinc-400 transition-colors group-focus-within:text-indigo-600"
                    ></i>
                </div>

                <input
                    id="email"
                    v-model="email"
                    name="email"
                    type="email"
                    placeholder="nom.prenom@eduhub.fr"
                    autocomplete="email"
                    @blur="quitter('email')"
                    @input="modifier('email')"
                    :aria-invalid="!!erreur('email')"
                    class="h-13 w-full rounded-xl border border-zinc-200 bg-white pl-12 pr-4 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    :class="{
                    'border-red-300 focus:border-red-500 focus:ring-red-500/5': erreur('email')
                    }"
                />
                </div>

                <p
                v-if="erreur('email')"
                class="flex items-center gap-1.5 px-1 text-xs font-medium text-red-600"
                >
                <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
                {{ erreur('email') }}
                </p>

                <p
                v-else
                class="px-1 text-xs leading-5 text-zinc-500"
                >
                Utilisez l’adresse associée à votre compte EduHub.
                </p>
            </div>

            <!-- Erreur API -->
            <div
                v-if="errorMessage"
                class="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
                <i class="fa-solid fa-circle-exclamation mt-0.5 text-xs"></i>
                <span>{{ errorMessage }}</span>
            </div>

            <!-- Bouton -->
            <button
                type="submit"
                :disabled="isLoading"
                class="mt-1 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
                <i
                v-if="isLoading"
                class="fa-solid fa-spinner fa-spin text-xs"
                ></i>

                <span>
                {{ isLoading
                    ? 'Envoi en cours...'
                    : 'Recevoir le lien'
                }}
                </span>

                <i
                v-if="!isLoading"
                class="fa-solid fa-arrow-right text-xs"
                ></i>
            </button>
            </form>

          <!-- Retour connexion -->
          <div class="flex justify-center pt-6">

            <RouterLink
              to="/login"
              class="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm font-semibold leading-5 text-indigo-600 hover:underline"
            >
              <i class="fa-solid fa-arrow-left text-xs"></i>
              <span>Retour à la connexion</span>
            </RouterLink>

          </div>

        </div>

      </div>
    </section>

  </main>
</template>


<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel.vue'
import { demanderResetPassword } from '@/services/auth'
import { useFormulaire } from '@/composables/useFormulaire'
import { erreurEmail } from '@/utils/validation'
const router = useRouter()

const email = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const { erreur, quitter, modifier, toutVerifier, erreursDuServeur } = useFormulaire({
  email: () => erreurEmail(email.value),
})

const handleSubmit = async () => {
  errorMessage.value = ''
  if (!toutVerifier()) return

  isLoading.value = true
  try {
    await demanderResetPassword(email.value.trim())
    router.push({
      name: 'forgot-password-confirmation',
      query: { email: email.value.trim() },
    })
  } catch (error) {
    errorMessage.value =
      erreursDuServeur(error.response?.data) ||
      (error.response?.status === 429 ? 'Trop de demandes. Réessayez dans une minute.' : '') ||
      (erreur('email') ? '' : 'Une erreur est survenue. Veuillez réessayer.')
  } finally {
    isLoading.value = false
  }
}
</script>


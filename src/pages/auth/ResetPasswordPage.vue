<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from '../../services/auth'
import AuthBrandPanel from '../../components/auth/AuthBrandPanel.vue'

const route = useRoute()
const router = useRouter()

const password = ref('')
const confirmationPassword = ref('')

const showPassword = ref(false)
const showConfirmationPassword = ref(false)

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const confirmationError = ref('')

const verifierConfirmation = () => {
  if (!confirmationPassword.value) {
    confirmationError.value = ''
    return
  }

  if (password.value !== confirmationPassword.value) {
    confirmationError.value = 'Les mots de passe ne correspondent pas.'
  } else {
    confirmationError.value = ''
  }
}

const reinitialiser = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!password.value || !confirmationPassword.value) {
    errorMessage.value = 'Veuillez remplir tous les champs.'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value =
      'Le mot de passe doit comporter au moins 8 caractères.'
    return
  }

  if (password.value !== confirmationPassword.value) {
    errorMessage.value = 'Les mots de passe ne correspondent pas.'
    return
  }

  isLoading.value = true

  try {
    await resetPassword(
      route.params.uid,
      route.params.token,
      password.value,
      confirmationPassword.value
    )

    successMessage.value =
      'Votre mot de passe a été réinitialisé avec succès.'

    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (error) {

    errorMessage.value =
      error.response?.data?.detail ||
      error.response?.data?.non_field_errors?.[0] ||
      error.response?.data?.password?.[0] ||
      'Impossible de réinitialiser le mot de passe.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main
    class="grid min-h-screen w-full grid-cols-1 bg-slate-50 lg:grid-cols-2"
  >
    <!-- Partie gauche -->
    <AuthBrandPanel />

    <!-- Partie droite -->
    <section
      class="flex min-h-screen items-center justify-start bg-slate-50 px-6 py-12 sm:px-10 lg:px-36 lg:py-16"
    >
      <div class="w-full max-w-96 py-6">

        <div class="flex flex-col gap-8">

          <!-- En-tête -->
          <div class="flex flex-col gap-3">

            <!-- Icône -->
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 shadow-sm"
            >
              <i
                class="fa-solid fa-lock text-[18px] text-indigo-500"
              ></i>
            </div>

            <!-- Titre -->
            <div class="pt-3">
              <h1
                class="font-['Plus_Jakarta_Sans'] text-3xl font-bold leading-9 text-gray-900"
              >
                Définir un nouveau mot de passe
              </h1>
            </div>

            <!-- Description -->
            <p
              class="font-['Plus_Jakarta_Sans'] text-sm font-normal leading-6 text-zinc-700"
            >
              Choisissez un mot de passe sécurisé comportant au moins
              8 caractères pour protéger votre compte.
            </p>

          </div>

          <!-- Formulaire -->
          <form
            @submit.prevent="reinitialiser"
            class="flex flex-col gap-5"
          >

            <!-- Nouveau mot de passe -->
            <div class="flex flex-col gap-2">

              <label
                for="password"
                class="font-['Plus_Jakarta_Sans'] text-sm font-semibold leading-5 text-gray-900"
              >
                Nouveau mot de passe
              </label>

              <div class="group relative">

                <input
                  id="password"
                  v-model="password"
                  @input="verifierConfirmation"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••••••"
                  autocomplete="new-password"
                  class="h-[52px] w-full rounded-xl border border-transparent bg-white pl-12 pr-12 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 shadow-sm outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />

                <!-- Icône cadenas -->
                <i
                  class="fa-solid fa-lock pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-[14px] text-zinc-500"
                ></i>

                <!-- Afficher / masquer -->
                <button
                  type="button"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-indigo-600"
                  @click="showPassword = !showPassword"
                  :aria-label="
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  "
                >
                  <i
                    :class="
                      showPassword
                        ? 'fa-solid fa-eye-slash'
                        : 'fa-solid fa-eye'
                    "
                    class="text-sm"
                  ></i>
                </button>

              </div>
              <p
                v-if="confirmationError"
                class="flex items-center gap-1.5 px-1 text-xs font-medium leading-4 text-red-600"
              >
                <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
                {{ confirmationError }}
              </p>
              <p
                class="pt-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium leading-4 tracking-tight text-zinc-700"
              >
                8 caractères minimum, 1 chiffre et 1 lettre majuscule.
              </p>

            </div>

            <!-- Confirmation -->
            <div class="flex flex-col gap-2 pb-2">

              <label
                for="confirmationPassword"
                class="font-['Plus_Jakarta_Sans'] text-sm font-semibold leading-5 text-gray-900"
              >
                Confirmer le nouveau mot de passe
              </label>

              <div class="relative">

                <input
                  id="confirmationPassword"
                  v-model="confirmationPassword"
                  @input="verifierConfirmation"
                  :type="
                    showConfirmationPassword
                      ? 'text'
                      : 'password'
                  "
                  placeholder="••••••••••••"
                  autocomplete="new-password"
                  class="h-[52px] w-full rounded-xl border border-transparent bg-white pl-12 pr-12 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 shadow-sm outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />

                <!-- Icône cadenas -->
                <i
                  class="fa-solid fa-lock pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-[14px] text-zinc-500"
                ></i>

                <!-- Afficher / masquer -->
                <button
                  type="button"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-indigo-600"
                  @click="
                    showConfirmationPassword =
                      !showConfirmationPassword
                  "
                  :aria-label="
                    showConfirmationPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  "
                >
                  <i
                    :class="
                      showConfirmationPassword
                        ? 'fa-solid fa-eye-slash'
                        : 'fa-solid fa-eye'
                    "
                    class="text-sm"
                  ></i>
                </button>

              </div>

            </div>

            <!-- Message erreur -->
            <div
              v-if="errorMessage"
              class="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <i
                class="fa-solid fa-circle-exclamation mt-0.5 text-xs"
              ></i>

              <span>{{ errorMessage }}</span>
            </div>

            <!-- Message succès -->
            <div
              v-if="successMessage"
              class="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              <i
                class="fa-solid fa-circle-check mt-0.5 text-xs"
              ></i>

              <span>{{ successMessage }}</span>
            </div>

            <!-- Bouton -->
            <button
              type="submit"
              :disabled="isLoading"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 font-['Plus_Jakarta_Sans'] text-sm font-semibold leading-5 text-white shadow-md transition-all hover:bg-indigo-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i
                v-if="isLoading"
                class="fa-solid fa-spinner fa-spin text-xs"
              ></i>

              <span>
                {{
                  isLoading
                    ? 'Enregistrement...'
                    : 'Enregistrer le mot de passe'
                }}
              </span>

              <i
                v-if="!isLoading"
                class="fa-solid fa-arrow-right text-xs"
              ></i>
            </button>

          </form>

          <!-- Retour connexion -->
          <div class="flex justify-center pt-4">

            <RouterLink
              to="/login"
              class="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm font-semibold leading-5 text-indigo-600 transition hover:text-indigo-500 hover:underline"
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
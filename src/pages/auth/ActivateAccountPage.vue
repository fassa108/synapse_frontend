<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthBrandPanel from '../../components/auth/AuthBrandPanel.vue'
import CriteresMotDePasse from '../../components/auth/CriteresMotDePasse.vue'
import { useFormulaire } from '../../composables/useFormulaire'
import { activerCompte } from '../../services/auth'
import { erreurConfirmation, erreurMotDePasse } from '../../utils/validation'

const route = useRoute()
const router = useRouter()

const password = ref('')
const confirmationPassword = ref('')

const showPassword = ref(false)
const showConfirmation = ref(false)

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const { erreur, quitter, modifier, toutVerifier, erreursDuServeur } = useFormulaire(
  {
    password: () => erreurMotDePasse(password.value),
    confirmation: () => erreurConfirmation(password.value, confirmationPassword.value),
  },
  { correspondances: { password_confirm: 'confirmation' } },
)

const activer = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  if (!toutVerifier()) return

  const token = route.params.token
  if (!token) {
    errorMessage.value = 'Le lien d’activation est invalide ou incomplet.'
    return
  }

  isLoading.value = true
  try {
    await activerCompte(token, password.value, confirmationPassword.value)

    successMessage.value = 'Votre compte a été activé avec succès.'
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (error) {
    // Lien invalide ou expiré : message général ; règles du mot de passe : sous le champ
    errorMessage.value =
      erreursDuServeur(error.response?.data) ||
      (error.response?.status === 429 ? 'Trop de tentatives. Réessayez plus tard.' : '') ||
      (erreur('password') || erreur('confirmation') ? '' : 'Impossible d’activer votre compte.')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 lg:flex">

    <!-- =========================
         PANNEAU GAUCHE
    ========================== -->
    <AuthBrandPanel />

    <!-- =========================
         CONTENU
    ========================== -->
    <main
      class="flex lg:min-h-screen flex-1 items-start lg:items-center justify-center px-6 py-10 sm:px-10 lg:px-16"
    >
      <div class="w-full max-w-[576px]">

        <!-- En-tête -->
        <div class="mb-8">
          <h1
            class="text-[30px] font-bold tracking-[-0.02em] text-slate-900 sm:text-[34px]"
          >
            Activez votre compte EduHub
          </h1>

          <p class="mt-2 text-[15px] leading-6 text-slate-500">
            Définissez votre mot de passe pour finaliser
            l’activation de votre compte.
          </p>
        </div>

        <!-- =========================
             EMAIL
        ========================== -->
        <section class="mb-7">
          <div class="mb-2 flex items-center justify-between gap-4">
            <label
              class="text-sm font-semibold text-slate-700"
            >
              Adresse e-mail rattachée
            </label>

            <span
              class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600"
            >
              Vérifiée par l'organisation
            </span>
          </div>

          <div
            class="flex h-12 items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-4"
          >
            <span class="text-sm font-medium text-slate-700">
              Adresse e-mail vérifiée
            </span>

            <span
              class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-600 shadow-sm"
            >
              ✓ Vérifiée
            </span>
          </div>

          <p class="mt-2 text-xs leading-5 text-slate-500">
            L'adresse de contact a été validée via votre lien
            d'invitation personnel.
          </p>
        </section>

        <form novalidate @submit.prevent="activer">
        <!-- =========================
             MOT DE PASSE
        ========================== -->
        <section class="mb-7">
          <div class="mb-2 flex items-center justify-between">
            <label
              for="password"
              class="text-sm font-semibold text-slate-700"
            >
              Nouveau mot de passe
            </label>

          </div>

          <!-- Input -->
          <div class="relative">
            <!-- Lock -->
            <svg
              class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <rect
                x="4"
                y="10"
                width="16"
                height="10"
                rx="2"
              />
              <path
                d="M8 10V7a4 4 0 0 1 8 0v3"
              />
            </svg>

            <input
              id="password"
              v-model="password"
              name="password"
              @blur="quitter('password')"
              @input="modifier('password')"
              :aria-invalid="!!erreur('password')"
              :class="{ '!border-red-300': erreur('password') }"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Votre nouveau mot de passe"
              class="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />

            <!-- Eye -->
            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              :aria-label="
                showPassword
                  ? 'Masquer le mot de passe'
                  : 'Afficher le mot de passe'
              "
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="!showPassword"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>

              <svg
                v-else
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="m3 3 18 18"
                />
                <path
                  d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                />
                <path
                  d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.7 18.7 0 0 1-3.1 3.8"
                />
                <path
                  d="M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.2"
                />
              </svg>
            </button>
          </div>

          <p
            v-if="erreur('password')"
            class="mt-2 text-xs font-medium text-red-500"
          >
            {{ erreur('password') }}
          </p>

          <CriteresMotDePasse :mot-de-passe="password" class="mt-4" />
        </section>

        <!-- =========================
             CONFIRMATION
        ========================== -->
        <section class="mb-6">
          <label
            for="confirmationPassword"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Confirmer le mot de passe
          </label>

          <div class="relative">
            <!-- Lock -->
            <svg
              class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <rect
                x="4"
                y="10"
                width="16"
                height="10"
                rx="2"
              />
              <path
                d="M8 10V7a4 4 0 0 1 8 0v3"
              />
            </svg>

            <input
              id="confirmationPassword"
              v-model="confirmationPassword"
              name="confirmation"
              @blur="quitter('confirmation')"
              :type="
                showConfirmation ? 'text' : 'password'
              "
              autocomplete="new-password"
              placeholder="Confirmez votre mot de passe"
              class="h-12 w-full rounded-xl border bg-white pl-12 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4"
              :class="
                erreur('confirmation')
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
              "
              @input="modifier('confirmation')"
              :aria-invalid="!!erreur('confirmation')"
            />

            <!-- Eye -->
            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              :aria-label="
                showConfirmation
                  ? 'Masquer le mot de passe'
                  : 'Afficher le mot de passe'
              "
              @click="
                showConfirmation = !showConfirmation
              "
            >
              <svg
                v-if="!showConfirmation"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>

              <svg
                v-else
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path d="m3 3 18 18" />
                <path
                  d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                />
                <path
                  d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.7 18.7 0 0 1-3.1 3.8"
                />
                <path
                  d="M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.2"
                />
              </svg>
            </button>
          </div>

          <p
            v-if="erreur('confirmation')"
            class="mt-2 text-xs font-medium text-red-500"
          >
            {{ erreur('confirmation') }}
          </p>

          <p
            v-else-if="
              confirmationPassword &&
              password === confirmationPassword
            "
            class="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600"
          >
            <span>✓</span>
            Les mots de passe correspondent parfaitement.
          </p>
        </section>


        <!-- =========================
             MESSAGES
        ========================== -->
        <div
          v-if="errorMessage"
          class="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {{ errorMessage }}
        </div>

        <div
          v-if="successMessage"
          class="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-600"
        >
          {{ successMessage }}
        </div>

        <!-- =========================
             BOUTON
        ========================== -->
        <button
          type="submit"
          :disabled="isLoading"
          class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>
            {{
              isLoading
                ? 'Activation en cours...'
                : 'Activer mon compte'
            }}
          </span>

          <svg
            v-if="!isLoading"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M5 12h14"
            />
            <path
              d="m13 6 6 6-6 6"
            />
          </svg>
        </button>
        </form>

        <!-- =========================
             LOGIN
        ========================== -->
        <p class="mt-6 text-center text-sm text-slate-500">
          Déjà un compte activé ?
          <button
            type="button"
            class="font-semibold text-indigo-600 hover:underline"
            @click="router.push('/login')"
          >
            Se connecter
          </button>
        </p>

      </div>
    </main>
  </div>
</template>
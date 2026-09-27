<template>
  <main class="grid min-h-screen w-full grid-cols-1 bg-slate-50 lg:grid-cols-2">

    <!-- Partie gauche -->
    <AuthBrandPanel />

    <!-- Partie droite -->
    <section
      class="flex min-h-screen items-center justify-center bg-white px-6 py-12 sm:px-10 lg:px-24 lg:py-20"
    >
      <div class="w-full max-w-96 py-8">

        <!-- En-tête -->
        <div class="mb-8 flex flex-col gap-2">
          <h1
            class="font-['Plus_Jakarta_Sans'] text-3xl font-bold leading-9 text-gray-900"
          >
            Bienvenue sur EduHub
          </h1>

          <p
            class="font-['Plus_Jakarta_Sans'] text-sm font-normal leading-5 text-zinc-700"
          >
            Connectez-vous pour accéder à votre espace.
          </p>
        </div>

        <!-- Formulaire -->
        <form
          @submit.prevent="handleLogin"
          class="flex flex-col gap-6"
        >

          <!-- Email -->
          <div class="flex flex-col gap-1.5">
            <label
              for="email"
              class="font-['Plus_Jakarta_Sans'] text-xs font-medium leading-4 text-zinc-700"
            >
              Adresse e-mail
            </label>

            <div class="relative">
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="nom@exemple.fr"
                @input="validateEmail"
                autocomplete="email"
                class="h-[52px] w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 outline-none placeholder:text-zinc-500/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />

              <span
                class="pointer-events-none absolute left-[17px] top-1/2 -translate-y-1/2 text-zinc-500"
              >
                @
              </span>
            </div>
            <p
            v-if="emailError"
            class="-mt-2 text-sm text-red-600"
          >
            {{ emailError }}
          </p>
          </div>

          <!-- Mot de passe -->
          <div class="flex flex-col gap-1.5">

            <div class="flex items-center justify-between">
              <label
                for="password"
                class="font-['Plus_Jakarta_Sans'] text-xs font-medium leading-4 text-zinc-700"
              >
                Mot de passe
              </label>

              <RouterLink
                to="/forgot-password"
                class="font-['Plus_Jakarta_Sans'] text-xs font-medium leading-4 text-indigo-600 hover:underline"
              >
                Mot de passe oublié ?
              </RouterLink>
            </div>

            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                @input="validatePassword"
                placeholder="Votre mot de passe"
                autocomplete="current-password"
                class="h-[52px] w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 outline-none placeholder:text-zinc-500/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />

              <span
                class="pointer-events-none absolute left-[19px] top-1/2 -translate-y-1/2 text-zinc-500"
              >
                •
              </span>

              <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-indigo-50"
                  :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                >
                  <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
                </button>
              </div>
              <p
                v-if="passwordError"
                class="-mt-2 text-sm text-red-600"
              >
                {{ passwordError }}
              </p>
            </div>


          

            <!-- Message erreur -->
            <div
              v-if="errorMessage"
              class="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              <i class="fa-solid fa-circle-exclamation mt-0.5 text-xs"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Connexion -->
            <button
              type="submit"
              :disabled="isLoading"
              class="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 font-['Plus_Jakarta_Sans'] text-base font-semibold leading-6 text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>
                {{ isLoading ? 'Connexion...' : 'Se connecter' }}
              </span>

              <span v-if="!isLoading" class="text-lg">
                →
              </span>
            </button>

        </form>

        

      </div>
    </section>

  </main>
</template>


<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AuthBrandPanel from '../../components/auth/AuthBrandPanel.vue'
import {
  isRequired,
  isValidEmail,
} from '../../utils/validation'

const router = useRouter()
const authStore = useAuthStore()

const showPassword = ref(false)

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const emailError = ref('')
const passwordError = ref('')

const validateEmail = () => {
  emailError.value = ''
  let isValid = true

  if (!isRequired(email.value)) {
    emailError.value = 'L’adresse e-mail est obligatoire.'
    isValid = false
  } else if (!isValidEmail(email.value)) {
    emailError.value = 'Veuillez saisir une adresse e-mail valide.'
    isValid = false
  }

  return isValid
}

const validatePassword = () => {
  passwordError.value = ''

  let isValid = true

  if (!isRequired(password.value)) {
    passwordError.value = 'Le mot de passe est obligatoire.'
    isValid = false
  }

  return isValid
}

const validateForm = () => {
  emailError.value = ''
  passwordError.value = ''

  let isValid = true

  if (!isRequired(email.value)) {
    emailError.value = 'L’adresse e-mail est obligatoire.'
    isValid = false
  } else if (!isValidEmail(email.value)) {
    emailError.value = 'Veuillez saisir une adresse e-mail valide.'
    isValid = false
  }

  if (!isRequired(password.value)) {
    passwordError.value = 'Le mot de passe est obligatoire.'
    isValid = false
  }

  return isValid
}

const redirigerSelonRole = (tenant) => {
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
      errorMessage.value = 'Rôle utilisateur non reconnu.'
  }
}

const handleLogin = async () => {
  errorMessage.value = ''

  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    await authStore.seConnecter(
      email.value,
      password.value
    )

    if (authStore.utilisateur?.est_admin_saas) {
      router.push('/admin/organismes')

    } else if (authStore.tenants.length === 1) {
      redirigerSelonRole(authStore.tenants[0])

    } else if (authStore.tenants.length > 1) {
      router.push('/choisir-organisme')

    } else {
      errorMessage.value =
        'Aucun organisme associé à votre compte.'
    }

  } catch (error) {
    if (error.response?.status === 429) {
      errorMessage.value =
        'Trop de tentatives de connexion. Réessayez dans une minute.'
    } else if (error.response?.data?.detail) {
      errorMessage.value = error.response.data.detail
    } else {
      errorMessage.value =
        'Une erreur est survenue lors de la connexion.'
    }

  } finally {
    isLoading.value = false
  }
}
</script>




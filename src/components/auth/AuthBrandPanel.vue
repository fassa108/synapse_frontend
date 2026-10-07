<script setup>
import photo from '../../assets/auth-formation.jpg'

// Voile : léger en haut pour laisser voir la scène, plus sombre en bas sous le texte
const fond = {
  backgroundImage: `linear-gradient(180deg, rgba(49,46,129,.35) 0%, rgba(30,27,75,.55) 45%, rgba(30,27,75,.92) 100%), url(${photo})`,
}
</script>

<template>
  <!-- Mobile : bandeau compact au-dessus du formulaire ; grand écran : moitié gauche pleine hauteur -->
  <section
    class="relative flex min-h-52 items-end justify-center overflow-hidden bg-indigo-900 bg-cover bg-[center_30%] px-6 py-8 lg:min-h-screen lg:px-32 lg:pb-24 lg:pt-20"
    :style="fond"
  >
    <!-- Contenu -->
    <div class="relative z-10 flex w-full max-w-[520px] flex-col items-center text-center text-white">
      <!-- Logo -->
      <h1>
        <img src="../../assets/logo-eduhub-blanc.png" alt="EduHub" class="h-10 w-auto lg:h-16" />
      </h1>

      <!-- Slogan -->
      <p class="mt-3 max-w-96 px-6 font-['Plus_Jakarta_Sans'] text-base font-bold leading-6 lg:mt-8 lg:text-2xl lg:leading-8">
        L'excellence pédagogique <br />
        au service de votre avenir
      </p>
    </div>
  </section>
</template>

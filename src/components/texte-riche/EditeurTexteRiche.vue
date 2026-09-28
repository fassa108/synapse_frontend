<script setup>
/**
 * EditeurTexteRiche — éditeur Tiptap (v-model : HTML).
 *
 * Mise en forme proposée : gras, italique, souligné, barré, titres,
 * listes, citation, lien. Elle correspond à la liste blanche du backend,
 * qui nettoie le HTML à l'enregistrement (activites/texte_riche.py).
 * Un éditeur vide renvoie une chaîne vide.
 */
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled:   { type: Boolean, default: false },
  invalide:   { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      // Hors liste blanche du backend
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null },
      },
    }),
  ],
  onUpdate: ({ editor: e }) => emit('update:modelValue', e.isEmpty ? '' : e.getHTML()),
})

// Valeur chargée après coup (modification d'un brief)
watch(() => props.modelValue, (valeur) => {
  if (!editor.value) return
  const actuel = editor.value.isEmpty ? '' : editor.value.getHTML()
  if (valeur !== actuel) editor.value.commands.setContent(valeur || '', { emitUpdate: false })
})
watch(() => props.disabled, (d) => editor.value?.setEditable(!d))

onBeforeUnmount(() => editor.value?.destroy())

const definirLien = () => {
  const actuel = editor.value.getAttributes('link').href ?? ''
  const url = window.prompt('Adresse du lien (laisser vide pour retirer le lien) :', actuel)
  if (url === null) return
  const chaine = editor.value.chain().focus().extendMarkRange('link')
  if (url.trim() === '') chaine.unsetLink().run()
  else chaine.setLink({ href: url.trim() }).run()
}

const boutons = [
  { icone: 'fa-bold',          titre: 'Gras',             actif: 'bold',        action: (c) => c.toggleBold() },
  { icone: 'fa-italic',        titre: 'Italique',         actif: 'italic',      action: (c) => c.toggleItalic() },
  { icone: 'fa-underline',     titre: 'Souligné',         actif: 'underline',   action: (c) => c.toggleUnderline() },
  { icone: 'fa-strikethrough', titre: 'Barré',            actif: 'strike',      action: (c) => c.toggleStrike() },
  { separateur: true },
  { texte: 'T1', titre: 'Titre',                 actif: ['heading', { level: 2 }], action: (c) => c.toggleHeading({ level: 2 }) },
  { texte: 'T2', titre: 'Sous-titre',            actif: ['heading', { level: 3 }], action: (c) => c.toggleHeading({ level: 3 }) },
  { separateur: true },
  { icone: 'fa-list-ul',       titre: 'Liste à puces',    actif: 'bulletList',  action: (c) => c.toggleBulletList() },
  { icone: 'fa-list-ol',       titre: 'Liste numérotée',  actif: 'orderedList', action: (c) => c.toggleOrderedList() },
  { icone: 'fa-quote-left',    titre: 'Citation',         actif: 'blockquote',  action: (c) => c.toggleBlockquote() },
]

const estActif = (b) =>
  Array.isArray(b.actif) ? editor.value?.isActive(...b.actif) : editor.value?.isActive(b.actif)

const executer = (b) => b.action(editor.value.chain().focus()).run()
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border bg-white transition focus-within:ring-2"
    :class="invalide
      ? 'border-red-300 focus-within:ring-red-500/10'
      : 'border-slate-200 focus-within:border-indigo-500 focus-within:ring-indigo-500/10'"
  >
    <div v-if="editor && !disabled" class="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/60 px-2 py-1.5">
      <template v-for="(b, i) in boutons" :key="i">
        <span v-if="b.separateur" class="mx-1 h-5 w-px bg-slate-200"></span>
        <button
          v-else
          type="button"
          :title="b.titre"
          :aria-label="b.titre"
          :aria-pressed="estActif(b)"
          class="flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 font-['Plus_Jakarta_Sans'] text-xs font-bold transition"
          :class="estActif(b) ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-500 hover:bg-slate-200/70 hover:text-zinc-800'"
          @click="executer(b)"
        >
          <i v-if="b.icone" :class="`fa-solid ${b.icone}`"></i>
          <span v-else>{{ b.texte }}</span>
        </button>
      </template>
      <span class="mx-1 h-5 w-px bg-slate-200"></span>
      <button
        type="button" title="Lien" aria-label="Lien" :aria-pressed="editor.isActive('link')"
        class="flex h-7 w-7 items-center justify-center rounded-md text-xs transition"
        :class="editor.isActive('link') ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-500 hover:bg-slate-200/70 hover:text-zinc-800'"
        @click="definirLien"
      >
        <i class="fa-solid fa-link"></i>
      </button>
      <span class="ml-auto flex gap-0.5">
        <button type="button" title="Annuler" aria-label="Annuler" class="flex h-7 w-7 items-center justify-center rounded-md text-xs text-zinc-400 hover:bg-slate-200/70 disabled:opacity-40"
                :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">
          <i class="fa-solid fa-rotate-left"></i>
        </button>
        <button type="button" title="Rétablir" aria-label="Rétablir" class="flex h-7 w-7 items-center justify-center rounded-md text-xs text-zinc-400 hover:bg-slate-200/70 disabled:opacity-40"
                :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </span>
    </div>
    <EditorContent :editor="editor" class="texte-riche editeur" />
  </div>
</template>

<style scoped>
.editeur :deep(.ProseMirror) {
  min-height: 7rem;
  padding: 0.75rem 1rem;
  outline: none;
}
</style>

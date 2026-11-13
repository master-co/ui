import { Editor, Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { toolbar } from '@master/ui/behaviors/toolbar.js'
import { notes, other } from './content.js'

/**
 * A heading writes the class of its level, so the editor styles it without selecting the element: Heading
 * itself renders no attribute for its level.
 */
const headingClass = Extension.create({
  name: 'headingClass',
  addGlobalAttributes() {
    return [{
      types: ['heading'],
      attributes: {
        headingClass: {
          default: null,
          parseHTML: () => null,
          renderHTML: (attributes) => ({ class: attributes.level === 3 ? 'editor-subheading' : 'editor-heading' }),
        },
      },
    }]
  },
})

/** What the toolbar's buttons do, and how each asks whether it is on and whether it can run now. */
const commands = {
  bold: { run: (chain) => chain.toggleBold(), active: 'bold' },
  italic: { run: (chain) => chain.toggleItalic(), active: 'italic' },
  underline: { run: (chain) => chain.toggleUnderline(), active: 'underline' },
  bulletList: { run: (chain) => chain.toggleBulletList(), active: 'bulletList' },
  orderedList: { run: (chain) => chain.toggleOrderedList(), active: 'orderedList' },
  blockquote: { run: (chain) => chain.toggleBlockquote(), active: 'blockquote' },
  undo: { run: (chain) => chain.undo() },
  redo: { run: (chain) => chain.redo() },
}

/**
 * TipTap in the editor frame. TipTap owns the document, the selection, the history and the keys, an input
 * method's composition among them; this module only connects the toolbar and the states to it, and returns
 * the function that destroys it.
 */
export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const frame = root.querySelector('.editor')
  const bar = root.querySelector('.editor-toolbar')
  const style = bar.querySelector('[data-command="style"]')
  const linkButton = bar.querySelector('[data-command="link"]')
  const form = root.querySelector('#rich-text-link')
  const output = root.querySelector('[data-value]')
  const states = { readonly: false, disabled: false }

  /** The document's own attributes: its role, its name, its description and its states. */
  const attributes = () => ({
    id: 'rich-text-document',
    class: 'editor-document',
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-labelledby': 'rich-text-label',
    'aria-describedby': 'rich-text-hint rich-text-error',
    ...(states.readonly ? { 'aria-readonly': 'true' } : {}),
    ...(invalid ? { 'aria-invalid': 'true' } : {}),
  })
  let invalid = false

  const editor = new Editor({
    element: root.querySelector('[data-editor]'),
    content: notes,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        paragraph: { HTMLAttributes: { class: 'editor-paragraph' } },
        bulletList: { HTMLAttributes: { class: 'editor-list' } },
        orderedList: { HTMLAttributes: { class: 'editor-list editor-list-numbered' } },
        listItem: { HTMLAttributes: { class: 'editor-item' } },
        blockquote: { HTMLAttributes: { class: 'editor-quote' } },
        code: { HTMLAttributes: { class: 'code' } },
        codeBlock: { HTMLAttributes: { class: 'code-block' } },
        horizontalRule: { HTMLAttributes: { class: 'editor-rule' } },
        // A link is followed with the keyboard or a modifier click outside the editor, never by a click while editing.
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { class: 'editor-link', rel: 'noopener noreferrer nofollow', target: null } },
      }),
      headingClass,
    ],
    editorProps: { attributes: attributes() },
  })
  const detachToolbar = toolbar(bar)

  /** Say what the selection holds and what can run now, on the toolbar. */
  function sync() {
    const editable = editor.isEditable
    for (const button of bar.querySelectorAll('button[data-command]')) {
      const command = commands[button.dataset.command]
      if (button === linkButton) {
        button.setAttribute('aria-pressed', String(editor.isActive('link')))
        button.disabled = !editable
        continue
      }
      if (command.active) button.setAttribute('aria-pressed', String(editor.isActive(command.active)))
      button.disabled = !editable || !command.run(editor.can().chain()).run()
    }
    style.disabled = !editable
    style.value = editor.isActive('heading', { level: 2 }) ? 'heading' : editor.isActive('heading', { level: 3 }) ? 'subheading' : 'paragraph'
  }

  /** The value as data: what an application saves. It is written as text, never as markup. */
  let pending = 0
  function show() {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(() => { output.textContent = JSON.stringify(editor.getJSON(), null, 2) })
  }

  /** Draw the states the reader chose, and the invalid one, on the frame and the document. */
  function mark() {
    editor.setEditable(!states.readonly && !states.disabled, false)
    editor.setOptions({ editorProps: { attributes: attributes() } })
    if (states.disabled) frame.setAttribute('aria-disabled', 'true')
    else frame.removeAttribute('aria-disabled')
    sync()
  }

  editor.on('transaction', sync)
  editor.on('update', () => {
    show()
    // An error is cleared as soon as the reader writes again.
    if (invalid && !editor.isEmpty) {
      invalid = false
      mark()
    }
  })
  // Empty on leaving: the error shows, as a field's does once the reader has tried.
  editor.on('blur', () => {
    if (editor.isEmpty && editor.isEditable && !invalid) {
      invalid = true
      mark()
    }
  })

  bar.addEventListener('click', (click) => {
    const button = click.target.closest('button[data-command]')
    const command = button && commands[button.dataset.command]
    // Every tool hands focus back to the document, where the reader was writing.
    if (command) command.run(editor.chain().focus()).run()
    // The link button only opens its form: what it says comes from the selection, not from the press.
    if (button === linkButton) sync()
  }, { signal })

  style.addEventListener('change', () => {
    const chain = editor.chain().focus()
    if (style.value === 'paragraph') chain.setParagraph().run()
    else chain.setHeading({ level: style.value === 'heading' ? 2 : 3 }).run()
  }, { signal })

  // The link form opens with the link under the caret, and puts the address on the selection when sent.
  const field = form.elements.href
  form.addEventListener('toggle', (toggle) => {
    if (toggle.newState !== 'open') return
    field.value = editor.getAttributes('link').href ?? ''
    field.focus()
  }, { signal })
  form.addEventListener('submit', (submit) => {
    submit.preventDefault()
    if (!field.reportValidity()) return
    const href = field.value
    const chain = editor.chain().focus().extendMarkRange('link')
    if (editor.state.selection.empty && !editor.isActive('link')) {
      chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run()
    } else {
      chain.setLink({ href }).run()
    }
    form.hidePopover()
  }, { signal })
  form.querySelector('[data-command="unlink"]').addEventListener('click', () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    form.hidePopover()
  }, { signal })

  root.addEventListener('click', (click) => {
    const command = click.target.closest('[data-command]')?.dataset.command
    // A document from outside replaces the one in the editor, as loading a saved draft does.
    if (command === 'replace') editor.commands.setContent(other)
    if (command === 'reset') editor.commands.setContent(notes)
  }, { signal })

  root.addEventListener('change', (change) => {
    const state = change.target.dataset?.state
    if (!state) return
    states[state] = change.target.checked
    mark()
  }, { signal })

  sync()
  show()
  return () => {
    controller.abort()
    cancelAnimationFrame(pending)
    detachToolbar()
    editor.destroy()
    if (form.matches(':popover-open')) form.hidePopover()
  }
}

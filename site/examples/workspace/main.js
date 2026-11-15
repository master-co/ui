import { Editor, Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { toolbar } from '@master/ui/behaviors/toolbar.js'
import { notes } from './content.js'

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

/** The tone a status gives its badge in the header. */
const tones = { draft: '', review: 'badge-info', published: 'badge-success' }

/**
 * A workspace: one document in the main region, and one set of properties that stands in the aside while the
 * shell shows it and in a drawer while it does not. TipTap owns the document; the controls own their values.
 * This module connects the toolbar, moves the properties when the shell crosses its threshold, and returns the
 * function that releases all of it.
 */
export function mount(root) {
  const controller = new AbortController()
  const { signal } = controller
  const bar = root.querySelector('.editor-toolbar')
  const style = bar.querySelector('[data-command="style"]')
  const title = root.querySelector('[data-title]')
  const status = root.querySelector('[data-status]')
  const aside = root.querySelector('.shell-aside')
  const properties = root.querySelector('[data-properties]')
  const home = root.querySelector('[data-properties-home]')
  const away = root.querySelector('[data-properties-away]')
  const drawer = root.querySelector('#workspace-properties-drawer')
  const toggle = root.querySelector('[data-properties-toggle]')
  const navigation = root.querySelector('#workspace-navigation')
  const navigationToggle = root.querySelector('.shell-toggle')

  // The one editor of this document. It stays in the main region at every width, so nothing is ever copied.
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
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { class: 'editor-link', rel: 'noopener noreferrer nofollow', target: null } },
      }),
      headingClass,
    ],
    editorProps: {
      attributes: {
        id: 'workspace-document',
        class: 'editor-document',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': 'workspace-title',
      },
    },
  })
  const detachToolbar = toolbar(bar)

  /** Say what the selection holds and what can run now, on the toolbar. */
  function sync() {
    for (const button of bar.querySelectorAll('button[data-command]')) {
      const command = commands[button.dataset.command]
      if (command.active) button.setAttribute('aria-pressed', String(editor.isActive(command.active)))
      button.disabled = !command.run(editor.can().chain()).run()
    }
    style.value = editor.isActive('heading', { level: 2 }) ? 'heading' : editor.isActive('heading', { level: 3 }) ? 'subheading' : 'paragraph'
  }
  editor.on('transaction', sync)

  bar.addEventListener('click', (click) => {
    const command = commands[click.target.closest('button[data-command]')?.dataset.command]
    // Every tool hands focus back to the document, where the reader was writing.
    if (command) command.run(editor.chain().focus()).run()
  }, { signal })

  style.addEventListener('change', () => {
    const chain = editor.chain().focus()
    if (style.value === 'paragraph') chain.setParagraph().run()
    else chain.setHeading({ level: style.value === 'heading' ? 2 : 3 }).run()
  }, { signal })

  /** The header says what the properties hold: the title, and the status as a badge in its tone. */
  const fields = { title: properties.querySelector('[name="title"]'), status: properties.querySelector('[name="status"]') }
  function describe() {
    title.textContent = fields.title.value.trim() || 'Untitled'
    status.textContent = fields.status.selectedOptions[0].textContent
    status.classList.remove(...Object.values(tones).filter(Boolean))
    if (tones[fields.status.value]) status.classList.add(tones[fields.status.value])
  }
  properties.addEventListener('input', describe, { signal })

  /**
   * Put the properties where the shell has room for them: in the aside while it is displayed, in the drawer
   * while it is not. The same elements move, so every value, and with moveBefore() the focus, moves with them.
   */
  function place() {
    const shown = getComputedStyle(aside).display !== 'none'
    const target = shown ? home : away
    if (properties.parentNode !== target) {
      const active = document.activeElement
      // Focus on a field stays on it; focus on the button that is about to leave goes to the first field.
      const focused = properties.contains(active) ? active : active === toggle ? fields.title : null
      // The aside is back: its drawer has nothing left to show.
      if (shown && drawer.open) drawer.close()
      if ('moveBefore' in target) target.moveBefore(properties, null)
      else target.append(properties)
      // What had focus keeps it beside the document; in a closed drawer it cannot, so its button takes it.
      if (focused) (shown ? focused : toggle).focus()
    }
    // The sidebar is back: the drawer that stood in for it closes.
    if (navigation.open && getComputedStyle(navigationToggle).display === 'none') navigation.close()
  }
  const observer = new ResizeObserver(place)
  observer.observe(root)

  sync()
  describe()
  return () => {
    controller.abort()
    observer.disconnect()
    detachToolbar()
    editor.destroy()
    for (const dialog of [drawer, navigation]) if (dialog.open) dialog.close()
    home.append(properties)
  }
}

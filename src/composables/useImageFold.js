/**
 * useImageFold - CodeMirror 6 Base64 图片折叠扩展
 *
 * 三层架构：
 * A. 扫描层：正则识别 ![alt](data:image/...;base64,...) 格式
 * B. 装饰层：Decoration.replace 将 Base64 替换为原子 Widget（光标跳过）
 * C. 状态层：StateField + StateEffect 管理折叠状态，随文档变化映射位置
 */

import { StateField, StateEffect, RangeSet } from '@codemirror/state'
import { EditorView, Decoration, WidgetType, gutter, GutterMarker } from '@codemirror/view'

// 识别 Base64 图片的正则：捕获 (前缀)(base64数据)(后缀)
const BASE64_RE = /(!\[[^\]]*\]\()(data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]{50,})(\))/g

// ─── A. 状态层 ─────────────────────────────────────────────────────────────

// Effect：切换某个 base64 起始位置的折叠状态
export const toggleFoldEffect = StateEffect.define()

// StateField：存储已折叠的 base64 起始位置集合 Set<number>
// 每次文档变化时，用 mapPos 将旧位置映射到新位置
export const imageFoldField = StateField.define({
  create: () => new Set(),
  update(foldSet, tr) {
    // 1. 映射位置（处理文档增删）
    let next = foldSet
    if (tr.docChanged) {
      next = new Set()
      for (const pos of foldSet) {
        const mapped = tr.changes.mapPos(pos, 1)
        next.add(mapped)
      }
    }

    // 2. 处理切换 Effect
    for (const e of tr.effects) {
      if (e.is(toggleFoldEffect)) {
        next = new Set(next)
        if (next.has(e.value)) {
          next.delete(e.value)
        } else {
          next.add(e.value)
        }
      }
    }

    return next
  }
})

// ─── B. 装饰层 ─────────────────────────────────────────────────────────────

// Widget：替换 Base64 内容，点击展开，hover 显示预览
class FoldWidget extends WidgetType {
  constructor(imageName, dataUrl, byteLength, base64Start) {
    super()
    this.imageName = imageName
    this.dataUrl = dataUrl
    this.byteLength = byteLength
    this.base64Start = base64Start
  }

  eq(other) {
    return this.base64Start === other.base64Start && this.byteLength === other.byteLength
  }

  toDOM(view) {
    const wrap = document.createElement('span')
    wrap.className = 'cm-img-fold'

    const kb = (this.byteLength / 1024).toFixed(1)
    const tag = document.createElement('span')
    tag.className = 'cm-img-fold-tag'
    tag.textContent = `📷 ${this.imageName || '图片'} · ${kb}KB`
    wrap.appendChild(tag)

    // hover 缩略图预览
    const preview = document.createElement('img')
    preview.className = 'cm-img-fold-preview'
    preview.src = this.dataUrl
    wrap.appendChild(preview)

    // 点击展开
    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault()
      view.dispatch({ effects: toggleFoldEffect.of(this.base64Start) })
      // 展开后把光标移到 Base64 起始位置
      setTimeout(() => {
        view.dispatch({ selection: { anchor: this.base64Start } })
        view.focus()
      }, 10)
    })

    return wrap
  }

  // Widget 是原子的，光标直接跳过它
  ignoreEvent() { return false }
}

// 根据当前 foldField 状态构建 DecorationSet
function buildDecorations(state) {
  const foldSet = state.field(imageFoldField)
  if (foldSet.size === 0) return Decoration.none

  const text = state.doc.toString()
  const decos = []
  BASE64_RE.lastIndex = 0

  let m
  while ((m = BASE64_RE.exec(text)) !== null) {
    const base64Start = m.index + m[1].length
    const base64End = base64Start + m[2].length

    if (foldSet.has(base64Start)) {
      const altMatch = /!\[([^\]]*)\]/.exec(m[0])
      const imageName = altMatch?.[1] || '图片'

      decos.push(
        Decoration.replace({
          widget: new FoldWidget(imageName, m[2], m[2].length, base64Start),
          inclusive: false
        }).range(base64Start, base64End)
      )
    }
  }

  return Decoration.set(decos)
}

// 将 foldField 的变化计算为 Decoration（响应式更新）
const imageFoldDecorations = EditorView.decorations.compute(
  [imageFoldField],
  buildDecorations
)

// ─── C. Gutter 按钮层 ──────────────────────────────────────────────────────

class FoldGutterMarker extends GutterMarker {
  constructor(isFolded, base64Start) {
    super()
    this.isFolded = isFolded
    this.base64Start = base64Start
  }

  eq(other) {
    return this.isFolded === other.isFolded && this.base64Start === other.base64Start
  }

  toDOM(view) {
    const btn = document.createElement('button')
    btn.className = 'cm-fold-gutter-btn'
    btn.textContent = this.isFolded ? '▶' : '▼'
    btn.title = this.isFolded ? '展开图片数据' : '折叠图片数据'

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      view.dispatch({ effects: toggleFoldEffect.of(this.base64Start) })
    })

    return btn
  }
}

const imageFoldGutter = gutter({
  class: 'cm-img-fold-gutter',
  markers(view) {
    const foldSet = view.state.field(imageFoldField)
    const text = view.state.doc.toString()
    const markers = []

    BASE64_RE.lastIndex = 0
    let m
    while ((m = BASE64_RE.exec(text)) !== null) {
      const base64Start = m.index + m[1].length
      const lineFrom = view.state.doc.lineAt(m.index).from
      const isFolded = foldSet.has(base64Start)
      markers.push(new FoldGutterMarker(isFolded, base64Start).range(lineFrom))
    }

    return markers.length ? RangeSet.of(markers, true) : RangeSet.empty
  }
})

// ─── 对外导出：所有扩展打包 ─────────────────────────────────────────────────

export function imageFoldExtension() {
  return [
    imageFoldField,
    imageFoldDecorations,
    imageFoldGutter,
    // 折叠 Widget 和 Gutter 样式
    EditorView.baseTheme({
      '.cm-img-fold-gutter': {
        width: '28px',
        background: '#fafafa',
        borderRight: '1px solid #e0e0e0'
      },
      '.cm-fold-gutter-btn': {
        width: '20px',
        height: '20px',
        padding: '0',
        border: '1px solid #ccc',
        borderRadius: '3px',
        background: '#fff',
        cursor: 'pointer',
        fontSize: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '2px auto'
      },
      '.cm-fold-gutter-btn:hover': {
        background: '#f0f0f0',
        borderColor: '#999'
      },
      '.cm-img-fold': {
        position: 'relative',
        display: 'inline-block',
        cursor: 'pointer'
      },
      '.cm-img-fold-tag': {
        display: 'inline-block',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        padding: '1px 8px',
        fontSize: '12px',
        color: '#856404',
        fontStyle: 'italic',
        userSelect: 'none'
      },
      '.cm-img-fold:hover .cm-img-fold-tag': {
        background: '#ffe083'
      },
      '.cm-img-fold-preview': {
        display: 'none',
        position: 'absolute',
        bottom: '24px',
        left: '0',
        maxWidth: '200px',
        maxHeight: '150px',
        objectFit: 'contain',
        border: '1px solid #ccc',
        borderRadius: '4px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: '100'
      },
      '.cm-img-fold:hover .cm-img-fold-preview': {
        display: 'block'
      }
    })
  ]
}

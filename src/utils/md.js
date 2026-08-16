// Markdown 渲染工具（markdown-it）
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true
})

export function renderMd(text = '') {
  return md.render(text)
}

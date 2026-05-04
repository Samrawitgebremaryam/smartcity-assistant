function normalizeContent(content) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\u2022/g, '- ')
    .replace(/\s+\*\s+/g, '\n- ')
    .replace(/:\s+- /g, ':\n- ')
    .replace(/(\d+\.)\s+\*\*(.*?)\*\*/g, '\n$1 $2')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/([^.:\n])\s+(\d+\.)\s+/g, '$1\n$2 ')
    .replace(/([a-z])\s+(These|This|They|It|For post-paid|Since May|Since|You can also)\b/g, '$1. $2')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseBlocks(content) {
  const normalized = normalizeContent(content)
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const blocks = []
  let currentList = null

  const flushList = () => {
    if (!currentList || currentList.items.length === 0) return
    blocks.push(currentList)
    currentList = null
  }

  for (const line of lines) {
    if (line.toLowerCase().startsWith('source:') || line.toLowerCase().startsWith('sources:')) {
      flushList()
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      const item = line.replace(/^\d+\.\s/, '').trim()
      if (!currentList || currentList.type !== 'ordered') {
        flushList()
        currentList = { type: 'ordered', items: [] }
      }
      currentList.items.push(item)
      continue
    }

    if (line.startsWith('- ')) {
      const item = line.slice(2).trim()
      if (!currentList || currentList.type !== 'unordered') {
        flushList()
        currentList = { type: 'unordered', items: [] }
      }
      currentList.items.push(item)
      continue
    }

    if (line.endsWith(':') && line.split(/\s+/).length <= 7) {
      flushList()
      blocks.push({ type: 'heading', text: line.slice(0, -1) })
      continue
    }

    flushList()
    blocks.push({ type: 'paragraph', text: line })
  }

  flushList()
  return blocks
}

export default function MarkdownContent({ content }) {
  const blocks = parseBlocks(content)

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h3 key={index} className="pt-2 text-[1.02rem] font-semibold text-white">
              {block.text}
            </h3>
          )
        }

        if (block.type === 'ordered') {
          return (
            <ol key={index} className="ml-6 list-decimal space-y-2 text-[15px] leading-7 text-zinc-200 marker:text-zinc-500">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ol>
          )
        }

        if (block.type === 'unordered') {
          return (
            <ul key={index} className="ml-6 list-disc space-y-2 text-[15px] leading-7 text-zinc-200 marker:text-zinc-500">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index} className="text-[15px] leading-7 text-zinc-200">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

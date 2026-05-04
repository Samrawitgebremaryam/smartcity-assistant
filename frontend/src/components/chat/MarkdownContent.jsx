function normalizeContent(content) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\u2022/g, '•')
    .replace(/\s*•\s*/g, '\n• ')
    .replace(/(\d+\.)\s+\*\*(.*?)\*\*/g, '\n$1 $2')
    .replace(/([a-z]):\s*(-)\s+/g, '$1:\n- ')
    .replace(/Key points:/gi, '\nKey points:')
    .replace(/Example:/gi, '\nExample:')
    .replace(/Steps:/gi, '\nSteps:')
    .replace(/Eligibility:/gi, '\nEligibility:')
    .replace(/Notes:/gi, '\nNotes:')
    .replace(/([a-z])\s+(Key points|Example|Steps|Eligibility|Notes|This|These|They|For more|Also|You can|TeleBirr|Post-paid|Pre-paid|Renewal|Fees|Processing time|Route|Network size|Passeng|Bus number|Origin|Destination|Distance)\b/gi, '$1\n$2')
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

    if (/^(key points|example|steps|eligibility|notes|renewal|processing time|fees|network size|passeng|route|bus number|origin|destination|distance|eligibility:|payment options|digital payment|water bill|tax payment|business licence|business license):/i.test(line)) {
      flushList()
      blocks.push({ type: 'heading', text: line.replace(/:$/, '').trim() })
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

    if (line.startsWith('- ') || line.startsWith('• ')) {
      const item = line.replace(/^[-•]\s*/, '').trim()
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
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h3 key={index} className="mt-6 first:mt-0 text-[1.05rem] font-bold text-white">
              {block.text}
            </h3>
          )
        }

        if (block.type === 'ordered') {
          return (
            <ol key={index} className="ml-5 list-decimal space-y-2 text-[15px] leading-7 text-zinc-200 marker:text-zinc-400">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ol>
          )
        }

        if (block.type === 'unordered') {
          return (
            <ul key={index} className="ml-5 list-disc space-y-2 text-[15px] leading-7 text-zinc-200 marker:text-zinc-400">
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
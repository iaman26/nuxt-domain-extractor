import { parse } from 'node-html-parser'

const blacklist = ['.uk.com', '.uk.net', '.us.com', '.jpn.com', '.in.net', '.co.com', '.eu.com', '.de.com', '.br.com', '.ru.com']

export default defineEventHandler(async (event) => {
  const { url, csv } = getQuery(event)
  if (!url || typeof url !== 'string') {
    return { error: 'Thiếu hoặc sai tham số url' }
  }
  try {
    const response = await fetch(url)
    const text = await response.text()
    const root = parse(text)
    const links = root.querySelectorAll('a')
    if (csv === '1') {
      // Parse HTML, lấy domain từ các thẻ a
      let domains = links.map(a => {
        try {
          const href = a.getAttribute('href')
          if (!href) return null
          const u = new URL(href)
          return u.hostname
        } catch { return null }
      }).filter(Boolean)
      // Lọc domain theo blacklist
      domains = domains.filter(domain => !blacklist.some(ext => domain.endsWith(ext)))
      // Tạo CSV
      const csvContent = 'domain\n' + domains.join('\n')
      setResponseHeader(event, 'Content-Type', 'text/csv')
      setResponseHeader(event, 'Content-Disposition', 'attachment; filename="domains.csv"')
      return csvContent
    }
    // Tìm next page url
    let nextPageUrl = null
    for (const a of links) {
      if (a.text.trim().toLowerCase().includes('next page')) {
        nextPageUrl = a.getAttribute('href')
        break
      }
    }
    return {
      html: text,
      nextPageUrl
    }
  } catch (err) {
    return { error: err.message }
  }
}) 
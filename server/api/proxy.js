import { parse } from 'node-html-parser'

const blacklist = ['.uk.com', '.uk.net', '.us.com', '.jpn.com', '.in.net', '.co.com', '.eu.com', '.de.com', '.br.com', '.ru.com']

export default defineEventHandler(async (event) => {
  // Set CORS headers
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })

  // Handle preflight requests
  if (event.method === 'OPTIONS') {
    return null
  }

  const { url, csv } = getQuery(event)
  if (!url || typeof url !== 'string') {
    return { error: 'Thiếu hoặc sai tham số url' }
  }

  try {
    // Add custom headers for the target domain
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.example3.com/',
        'Origin': 'https://www.example3.com'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

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
      setResponseHeaders(event, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="domains.csv"'
      })
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
    console.error('Proxy error:', err)
    return { error: err.message }
  }
}) 
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUrlStore = defineStore('url', () => {
  const url = ref('')
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchUrl(inputUrl) {
    url.value = inputUrl
    data.value = null
    error.value = null
    loading.value = true
    try {
      // Loại bỏ ký tự @ nếu có ở đầu
      const cleanUrl = inputUrl.startsWith('@') ? inputUrl.slice(1) : inputUrl
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(cleanUrl)}`)
      const text = await response.text()
      // Nếu trả về JSON lỗi
      try {
        const json = JSON.parse(text)
        if (json.error) throw new Error(json.error)
      } catch { /* Không phải JSON lỗi */ }
      data.value = text
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return { url, data, loading, error, fetchUrl }
}) 
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
      
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(cleanUrl)}`, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      let responseData

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
        if (responseData.error) {
          throw new Error(responseData.error)
        }
        data.value = responseData.html
      } else {
        responseData = await response.text()
        data.value = responseData
      }
    } catch (err) {
      console.error('Error fetching URL:', err)
      error.value = `Error: ${err.message}`
    } finally {
      loading.value = false
    }
  }

  return { url, data, loading, error, fetchUrl }
}) 
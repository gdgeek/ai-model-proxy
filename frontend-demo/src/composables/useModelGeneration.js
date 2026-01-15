import { ref, reactive } from 'vue'
import axios from 'axios'

// 配置 API 基础 URL
const API_BASE_URL = window.__API_BASE_URL__ || 'http://localhost:3000'
axios.defaults.baseURL = API_BASE_URL

export function useModelGeneration() {
  const loading = ref(false)
  const error = ref('')
  const currentJob = reactive({
    jobId: '',
    status: '',
    message: '',
    result: null,
    progress: 0
  })

  // 创建文本到3D模型任务
  const createTextModel = async (description, token, quality = 'high') => {
    try {
      loading.value = true
      error.value = ''
      
      const formData = new FormData()
      formData.append('type', 'text')
      formData.append('input', description)
      formData.append('token', token)
      formData.append('options[quality]', quality)

      const response = await axios.post('/api/v1/models', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      currentJob.jobId = response.data.jobId
      currentJob.status = response.data.status
      currentJob.message = response.data.message
      currentJob.progress = 10

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '创建任务失败'
      throw err
    }
  }

  // 创建图片到3D模型任务
  const createImageModel = async (imageFile, token, quality = 'high') => {
    try {
      loading.value = true
      error.value = ''
      
      const formData = new FormData()
      formData.append('type', 'image')
      formData.append('input', imageFile)
      formData.append('token', token)
      formData.append('options[quality]', quality)

      const response = await axios.post('/api/v1/models', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      currentJob.jobId = response.data.jobId
      currentJob.status = response.data.status
      currentJob.message = response.data.message
      currentJob.progress = 10

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '创建任务失败'
      throw err
    }
  }

  // 检查任务状态
  const checkJobStatus = async (jobId) => {
    try {
      const response = await axios.get(`/api/v1/models/${jobId}/status`)
      
      currentJob.status = response.data.status
      currentJob.message = response.data.message
      
      // 更新进度
      switch (response.data.status) {
        case 'pending':
          currentJob.progress = 20
          break
        case 'processing':
          currentJob.progress = 60
          break
        case 'completed':
          currentJob.progress = 100
          currentJob.result = response.data.result
          break
        case 'failed':
          currentJob.progress = 0
          break
      }

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '查询状态失败'
      throw err
    }
  }

  // 轮询任务状态直到完成
  const waitForCompletion = async (jobId, pollInterval = 5000, maxAttempts = 60) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await checkJobStatus(jobId)
      
      if (status.status === 'completed') {
        loading.value = false
        return status
      } else if (status.status === 'failed') {
        loading.value = false
        throw new Error(`任务失败: ${status.message}`)
      }
      
      // 等待指定时间后再次检查
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    
    loading.value = false
    throw new Error('任务超时')
  }

  // 检查服务健康状态
  const checkHealth = async () => {
    try {
      const response = await axios.get('/health')
      return response.data
    } catch (err) {
      error.value = '服务不可用'
      throw err
    }
  }

  // 重置状态
  const reset = () => {
    loading.value = false
    error.value = ''
    currentJob.jobId = ''
    currentJob.status = ''
    currentJob.message = ''
    currentJob.result = null
    currentJob.progress = 0
  }

  return {
    loading,
    error,
    currentJob,
    createTextModel,
    createImageModel,
    checkJobStatus,
    waitForCompletion,
    checkHealth,
    reset
  }
}
<template>
  <div class="container">
    <header style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: white; font-size: 2.5rem; margin-bottom: 10px;">
        🎨 AI 3D 模型生成器
      </h1>
      <p style="color: rgba(255,255,255,0.8); font-size: 1.1rem;">
        将文本描述或图片转换为精美的 3D 模型
      </p>
    </header>

    <!-- 服务状态 -->
    <div class="card">
      <h3 style="margin-bottom: 16px;">🔍 服务状态</h3>
      <div style="display: flex; align-items: center; gap: 12px;">
        <button @click="checkServiceHealth" :disabled="healthChecking" class="btn btn-primary">
          <span v-if="healthChecking" class="loading-spinner"></span>
          检查服务状态
        </button>
        <span v-if="serviceHealth" :class="serviceHealthClass">
          {{ serviceHealth.status === 'healthy' ? '✅ 服务正常' : '❌ 服务异常' }}
        </span>
      </div>
    </div>

    <div class="grid">
      <!-- 文本到3D模型 -->
      <div class="card">
        <h3 style="margin-bottom: 20px;">📝 文本到 3D 模型</h3>
        
        <div class="input-group">
          <label>API 密钥 (可选)</label>
          <input 
            v-model="textForm.apiKey" 
            type="password" 
            placeholder="输入后端 API 密钥 (如果后端启用了认证)"
          />
        </div>

        <div class="input-group">
          <label>Tripo AI Token</label>
          <input 
            v-model="textForm.tripoToken" 
            type="password" 
            placeholder="输入你的 Tripo AI Token"
          />
        </div>

        <div class="input-group">
          <label>模型描述</label>
          <textarea 
            v-model="textForm.description" 
            rows="4" 
            placeholder="描述你想要的 3D 模型，例如：一个可爱的红苹果"
          ></textarea>
        </div>

        <div class="input-group">
          <label>生成质量</label>
          <select v-model="textForm.quality">
            <option value="high">高质量</option>
            <option value="medium">中等质量</option>
            <option value="low">低质量</option>
          </select>
        </div>

        <button 
          @click="generateFromText" 
          :disabled="loading || !textForm.description.trim() || !textForm.tripoToken.trim()"
          class="btn btn-primary"
          style="width: 100%;"
        >
          <span v-if="loading && currentJob.jobId" class="loading-spinner"></span>
          {{ loading && currentJob.jobId ? '生成中...' : '生成 3D 模型' }}
        </button>
      </div>

      <!-- 图片到3D模型 -->
      <div class="card">
        <h3 style="margin-bottom: 20px;">🖼️ 图片到 3D 模型</h3>
        
        <div class="input-group">
          <label>API 密钥 (可选)</label>
          <input 
            v-model="imageForm.apiKey" 
            type="password" 
            placeholder="输入后端 API 密钥 (如果后端启用了认证)"
          />
        </div>

        <div class="input-group">
          <label>Tripo AI Token</label>
          <input 
            v-model="imageForm.tripoToken" 
            type="password" 
            placeholder="输入你的 Tripo AI Token"
          />
        </div>

        <div class="input-group">
          <label>上传图片</label>
          <div class="file-input">
            <input 
              type="file" 
              id="imageFile" 
              @change="handleFileSelect"
              accept="image/jpeg,image/png,image/webp"
            />
            <label for="imageFile" class="file-input-label">
              {{ imageForm.file ? imageForm.file.name : '点击选择图片文件 (JPEG, PNG, WebP)' }}
            </label>
          </div>
        </div>

        <div class="input-group">
          <label>生成质量</label>
          <select v-model="imageForm.quality">
            <option value="high">高质量</option>
            <option value="medium">中等质量</option>
            <option value="low">低质量</option>
          </select>
        </div>

        <button 
          @click="generateFromImage" 
          :disabled="loading || !imageForm.file || !imageForm.tripoToken.trim()"
          class="btn btn-primary"
          style="width: 100%;"
        >
          <span v-if="loading && currentJob.jobId" class="loading-spinner"></span>
          {{ loading && currentJob.jobId ? '生成中...' : '生成 3D 模型' }}
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="alert alert-error">
      ❌ {{ error }}
    </div>

    <!-- 任务进度 -->
    <div v-if="currentJob.jobId" class="card">
      <h3 style="margin-bottom: 16px;">📊 生成进度</h3>
      
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span>任务ID: {{ currentJob.jobId }}</span>
        <span :class="getStatusClass(currentJob.status)">
          {{ getStatusText(currentJob.status) }}
        </span>
      </div>

      <div class="progress-bar">
        <div 
          class="progress-bar-fill" 
          :style="{ width: currentJob.progress + '%' }"
        ></div>
      </div>

      <p style="color: #666; margin-top: 8px;">{{ currentJob.message }}</p>

      <!-- 生成结果 -->
      <div v-if="currentJob.result" class="model-result">
        <h4 style="margin-bottom: 16px;">🎉 生成成功！</h4>
        
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <p><strong>文件格式:</strong> {{ currentJob.result.metadata?.format || 'OBJ' }}</p>
          <p><strong>文件大小:</strong> {{ formatFileSize(currentJob.result.metadata?.fileSize) }}</p>
          <p><strong>生成时间:</strong> {{ formatTime(currentJob.result.metadata?.generationTime) }}</p>
        </div>

        <a 
          :href="currentJob.result.modelUrl" 
          target="_blank" 
          class="download-link"
        >
          📥 下载 3D 模型
        </a>

        <button 
          @click="reset" 
          class="btn btn-primary" 
          style="margin-left: 12px;"
        >
          🔄 重新生成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useModelGeneration } from './composables/useModelGeneration.js'

const {
  loading,
  error,
  currentJob,
  createTextModel,
  createImageModel,
  waitForCompletion,
  checkHealth,
  reset
} = useModelGeneration()

// 表单数据
const textForm = reactive({
  apiKey: '',
  tripoToken: '',
  description: '',
  quality: 'high'
})

const imageForm = reactive({
  apiKey: '',
  tripoToken: '',
  file: null,
  quality: 'high'
})

// 服务健康状态
const serviceHealth = ref(null)
const healthChecking = ref(false)

// 文件选择处理
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB')
      return
    }
    imageForm.file = file
  }
}

// 从文本生成3D模型
const generateFromText = async () => {
  try {
    await createTextModel(textForm.description, textForm.tripoToken, textForm.apiKey)
    await waitForCompletion(currentJob.jobId)
  } catch (err) {
    console.error('生成失败:', err)
  }
}

// 从图片生成3D模型
const generateFromImage = async () => {
  try {
    await createImageModel(imageForm.file, imageForm.tripoToken, imageForm.apiKey)
    await waitForCompletion(currentJob.jobId)
  } catch (err) {
    console.error('生成失败:', err)
  }
}

// 检查服务健康状态
const checkServiceHealth = async () => {
  try {
    healthChecking.value = true
    serviceHealth.value = await checkHealth()
  } catch (err) {
    serviceHealth.value = { status: 'unhealthy' }
  } finally {
    healthChecking.value = false
  }
}

// 获取状态样式类
const getStatusClass = (status) => {
  const classes = {
    'pending': 'status-badge status-pending',
    'processing': 'status-badge status-processing',
    'completed': 'status-badge status-completed',
    'failed': 'status-badge status-failed'
  }
  return classes[status] || 'status-badge'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    'pending': '等待处理',
    'processing': '正在生成',
    'completed': '生成完成',
    'failed': '生成失败'
  }
  return texts[status] || status
}

// 服务健康状态样式
const serviceHealthClass = computed(() => {
  if (!serviceHealth.value) return ''
  return serviceHealth.value.status === 'healthy' 
    ? 'status-badge status-completed' 
    : 'status-badge status-failed'
})

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '未知'
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化时间
const formatTime = (ms) => {
  if (!ms) return '未知'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0 ? `${minutes}分${remainingSeconds}秒` : `${remainingSeconds}秒`
}

// 页面加载时检查服务状态
checkServiceHealth()
</script>
// 核心状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface SearchResult {
  asin: string
  keyword: string
  page: number
  position: number
  isAd: boolean
}

export const useExtensionStore = defineStore('extension', () => {
    // 状态数据
    const asins = ref<string[]>([])
    const maxPages = ref(2) // 最大搜索页
    const keywords = ref<string[]>([]) // 关键词-数组

})

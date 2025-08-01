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
    const batchSearching = ref(false) //批量搜索
    const batchResults = ref<SearchResult[]>([]) // 批量搜索结果
    const statusMessage = ref('') //状态message
    const statusType = ref<'success' | 'warning' | 'error' | 'info'>('info') //状态类型
    const singleKeyword = ref<string>() // 单个搜索关键词

    // 计算属性
    const hasKeywords = computed(() => keywords.value.length > 0) // 关键词上传校验数值
    const hasResults = computed(() => batchResults.value.length > 0) // 是否有结果

    // tag删除asin
    const removeAsin = (index: number) => {
        asins.value.splice(index, 1)
        // saveToStorage()
    }
    // tag添加asin
    const addAsin = (asin: string) => {
        // 重复&数量校验
        if (!asins.value.includes(asin) && asins.value.length < 3) {
            asins.value.push(asin)
            // saveToStorage()
            return true
        }
        return false
    }

    // 设置最大搜索页
    const setMaxPages = (pages: number) => {
        maxPages.value = pages
        // saveToStorage()
    }

    // 清除缓存
    const clearStorage = async () => {
        await chrome.storage.local.clear()
    }

    // 设置批量搜索
    const setBatchSearching = (value: boolean) => {
        batchSearching.value = value
    }

    // message状态设置
    const setStatus = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
        statusMessage.value = message
        statusType.value = type
    }

    // 关键词设置
    const setKeywords = (newKeywords: string[]) => {
        keywords.value = newKeywords
        // saveToStorage()
    }

    return {
        // 状态
        asins,
        maxPages,
        keywords,
        batchSearching,
        statusMessage,
        statusType,
        singleKeyword,
        // 计算属性
        hasKeywords,
        hasResults,
        // 方法
        removeAsin,
        addAsin,
        setMaxPages,
        clearStorage,
        setBatchSearching,
        setStatus,
        setKeywords,
    }
})

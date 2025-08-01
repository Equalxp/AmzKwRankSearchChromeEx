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

    return {
        // 状态
        asins,
        maxPages,
        keywords,
        // 方法
        removeAsin,
        addAsin,
        setMaxPages,
        clearStorage,
    }
})

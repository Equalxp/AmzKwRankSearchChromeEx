<template>
    <el-card class="batch-section" shadow="hover">
        <template #header>
            <div class="card-header">
                <span>下载处理</span>
            </div>
        </template>

        <div>
            <!-- 第一行row -->
            <el-row :gutter="24" align="middle">
                <el-col :span="9">
                    <el-upload ref="uploadRef" :auto-upload="false" :show-file-list="false" accept=".xlsx,.xls,.csv"
                        :before-upload="handleBeforeUpload" @change="handleFileChange">
                        <el-button plain type="primary">
                            <el-icon>
                                <Upload />
                            </el-icon>
                            上传关键词Excel
                        </el-button>
                    </el-upload>
                </el-col>
                <el-col :span="3">
                    <el-button @click="showKeywordDialog" type="primary" :icon="Edit" plain />
                </el-col>
                <el-col :span="6">
                    <el-button type="primary" @click="handleBatchSearch" :loading="store.batchSearching"
                        :disabled="!store.hasKeywords">
                        <el-icon>
                            <Search />
                        </el-icon>
                        批量搜索
                    </el-button>
                </el-col>
                <el-col :span="1">
                    <el-button plain type="info" @click="handleDownloadResults" :disabled="!store.hasResults">
                        <el-icon>
                            <Download />
                        </el-icon>
                        下载
                    </el-button>
                </el-col>
            </el-row>
        </div>

        <!-- 关键词预览 -->
        <div v-if="store.keywords.length > 0" class="keywords-preview">
            <el-divider content-position="left">
                <span class="preview-title">已导入关键词 ({{ store.keywords.length }}个)</span>
            </el-divider>
            <div class="keywords-list">
                <el-tag v-for="(keyword, index) in displayKeywords" :key="index" size="small" class="keyword-tag">
                    {{ keyword }}
                </el-tag>
                <el-tag v-if="store.keywords.length > 10" size="small" type="info">
                    ...还有{{ store.keywords.length - 10 }}个
                </el-tag>
            </div>
        </div>
        <!-- 输入关键词对话框 -->
        <el-dialog v-model="keywordDialogVisible" class="keyword-dialog" title="输入关键词" width="400px"
            :before-close="handleDialogClose">
            <div class="keyword-input-section">
                <el-input v-model="keywordInput" type="textarea" :rows="12"
                    placeholder="请输入关键词，每行一个：&#10;例如：&#10;wireless headphones&#10;bluetooth speaker&#10;phone case&#10;..."
                    class="keyword-textarea" maxlength="10000" show-word-limit />
                <div class="input-stats">
                    <span class="stats-text">
                        预计导入关键词：{{ previewKeywords.length }} 个
                    </span>
                    <el-button v-if="keywordInput.trim()" type="text" size="small" @click="clearInput">
                        清空
                    </el-button>
                </div>

                <!-- 关键词预览 -->
                <div v-if="previewKeywords.length > 0" class="preview-section">
                    <el-divider content-position="left">
                        <span>关键词预览</span>
                    </el-divider>
                    <div class="preview-keywords">
                        <el-tag v-for="(keyword, index) in previewKeywords.slice(0, 20)" :key="index" size="small"
                            class="preview-tag">
                            {{ keyword }}
                        </el-tag>
                        <el-tag v-if="previewKeywords.length > 20" size="small" type="info">
                            ...还有{{ previewKeywords.length - 20 }}个
                        </el-tag>
                    </div>
                </div>
            </div>

            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="keywordDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="handleKeywordSubmit" :disabled="previewKeywords.length === 0">
                        导入关键词 ({{ previewKeywords.length }})
                    </el-button>
                </span>
            </template>
        </el-dialog>
    </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Search, Download } from '@element-plus/icons-vue'
import { useExtensionStore } from '@/stores/useExtensionStore'
import { parseExcelFile, validateExcelFile, generateResultsExcel } from '@/utils/excelUtils'
import { Edit } from '@element-plus/icons-vue'
const store = useExtensionStore()

// 对话框相关状态
const keywordDialogVisible = ref(false)
const keywordInput = ref('')

// 计算属性-tag关键词展示list
const displayKeywords = computed(() => {
    return store.keywords.slice(0, 10)
})

// 关键词预览
const previewKeywords = computed(() => {
    if (!keywordInput.value.trim()) return []

    return keywordInput.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter((keyword, index, array) => array.indexOf(keyword) === index) // 去重
})

// 方法 检验excel文件
const handleBeforeUpload = (file: File) => {
    const validation = validateExcelFile(file)
    if (!validation.valid) {
        ElMessage.error(validation.message)
        return false
    }
    return true
}

// 上传文件
const handleFileChange = async (file: any) => {
    try {
        store.setStatus('正在解析文件...', 'info')

        // 解析得到xlsx关键词列表
        const excelData = await parseExcelFile(file.raw)

        if (excelData.keywords.length === 0) {
            ElMessage.error('未在文件中找到有效的关键词')
            return
        }

        store.setKeywords(excelData.keywords)
        store.setStatus(`成功导入 ${excelData.keywords.length} 个关键词`, 'success')
        ElMessage.success(`成功导入 ${excelData.keywords.length} 个关键词`)

    } catch (error) {
        console.error('文件解析错误:', error)
        const errorMessage = error instanceof Error ? error.message : '文件解析失败'
        store.setStatus(errorMessage, 'error')
        ElMessage.error(errorMessage)
    }
}
// 关键词输入对话框
const showKeywordDialog = () => {
    keywordDialogVisible.value = true
    keywordInput.value = ''
}

// 对话框处理
const handleDialogClose = (done: () => void) => {
    if (keywordInput.value.trim()) {
        ElMessageBox.confirm(
            '您输入的关键词尚未保存，确定要关闭吗？',
            '确认关闭',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }
        ).then(() => {
            done()
        }).catch(() => {
            // 用户取消关闭
        })
    } else {
        done()
    }
}

// 提交关键词
const handleKeywordSubmit = () => {
    if (previewKeywords.value.length === 0) {
        ElMessage.error('请输入至少一个关键词')
        return
    }

    if (previewKeywords.value.length > 100) {
        ElMessage.warning('关键词数量较多，建议分批处理以确保搜索效率')
    }

    // 如果已有关键词，询问是否替换
    if (store.keywords.length > 0) {
        // 之前上传的关键词
        ElMessageBox.confirm(
            `当前已有 ${store.keywords.length} 个关键词，是否要替换为新输入的 ${previewKeywords.value.length} 个关键词？`,
            '确认替换',
            {
                confirmButtonText: '替换',
                cancelButtonText: '追加',
                distinguishCancelAndClose: true,
                type: 'warning',
            }
        ).then(() => {
            // 替换
            store.setKeywords(previewKeywords.value)
            ElMessage.success(`成功替换为 ${previewKeywords.value.length} 个关键词`)
        }).catch((action) => {
            if (action === 'cancel') {
                // 追加
                const newKeywords = [...store.keywords, ...previewKeywords.value]
                const uniqueKeywords = [...new Set(newKeywords)] // 去重
                store.setKeywords(uniqueKeywords)
                ElMessage.success(`成功追加关键词，当前共 ${uniqueKeywords.length} 个关键词`)
            }
        }).finally(() => {
            keywordDialogVisible.value = false
            keywordInput.value = ''
        })
    } else {
        // 直接设置
        store.setKeywords(previewKeywords.value)
        ElMessage.success(`成功导入 ${previewKeywords.value.length} 个关键词`)
        keywordDialogVisible.value = false
        keywordInput.value = ''
    }
}

const clearInput = () => {
    ElMessageBox.confirm(
        '确定要清空所有输入的关键词吗？',
        '确认清空',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        }
    ).then(() => {
        keywordInput.value = ''
    }).catch(() => {
        // 用户取消
    })
}

// 批量搜索
const handleBatchSearch = async () => {
    if (!store.hasKeywords) {
        ElMessage.error('请先上传关键词文件')
        return
    }

    if (store.asins.length === 0) {
        ElMessage.error('请先添加至少一个ASIN')
        return
    }

    store.setBatchSearching(true)
    store.setStatus('正在进行批量搜索...', 'info')

    try {
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

        if (!tab.id) {
            throw new Error('无法获取当前标签页')
        }

        // 检查是否在亚马逊网站
        if (!tab.url?.includes('amazon.')) {
            ElMessage.error('请在亚马逊网站上使用此功能')
            return
        }
    } catch (error) {
    } finally {
    }
}

// 下载搜索结果excel
const handleDownloadResults = () => {
    //   if (!store.hasResults) {
    //     ElMessage.error('没有可下载的结果')
    //     return
    //   }

    //   try {
    //     const success = generateResultsExcel(store.resultsTableData)
    //     if (success) {
    //       ElMessage.success('结果下载成功')
    //     } else {
    //       ElMessage.error('下载失败，请重试')
    //     }
    //   } catch (error) {
    //     console.error('下载错误:', error)
    //     ElMessage.error('下载过程中发生错误')
    //   }
}
</script>

<style scoped>
.el-card {
    border-radius: 12px;
}
.card-header {
    font-size: 16px;
    font-weight: bold
}
.keywords-preview {
    margin-top: 15px;
}

.preview-title {
    font-size: 14px;
    color: #606266;
}

.keywords-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

.keyword-tag {
    margin: 0;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.keyword-input-section {
    padding: 0;
}

.keyword-textarea {
    margin-top: 16px;
}

.input-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    padding: 0 4px;
}

.stats-text {
    font-size: 14px;
    color: #606266;
}

.preview-section {
    margin-top: 16px;
}

.preview-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-height: 120px;
    overflow-y: auto;
}

.preview-tag {
    margin: 0;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mb-4 {
    margin-bottom: 16px;
}

:deep(.el-divider__text) {
    background-color: #fff;
    padding: 0 10px;
}

:deep(.el-dialog__header) {
    padding-bottom: 5px;
}

:deep(.el-dialog__body) {
    padding: 8px;
}

.el-card :deep(.el-card__header) {
    padding: 12px;
}

:deep(.el-textarea__inner) {
    overflow: hidden;
}

/* :deep(.el-overlay-dialog) {
    overflow: hidden !important;
} */

:deep(.el-alert__content) {
    line-height: 1.5;
}

:deep(.el-alert__content p) {
    margin: 2px 0;
}
</style>

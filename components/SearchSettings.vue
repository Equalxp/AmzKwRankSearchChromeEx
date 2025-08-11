<template>
    <el-card class="search-section" shadow="hover">
        <template #header>
            <span>搜索设置</span>
        </template>

        <div>
            <el-form :model="dataForm" label-width="auto" label-position="left">
                <!-- 最大页数 -->
                <el-form-item class="el-form-item" label="最大页数">
                    <el-input-number v-model="store.maxPages" :min="1" :max="5" size="default"
                        @change="handleMaxPagesChange">
                        <template #suffix>
                            <span>页</span>
                        </template>
                    </el-input-number>
                </el-form-item>
                <!-- 超时时间 -->
                <el-form-item class="el-form-item" label="超时时间">
                    <el-input-number v-model="store.timeoutPeriod" :min="10" size="default"
                        @change="handleTimeoutPeriodChange">
                        <template #suffix>
                            <span>秒</span>
                        </template>
                    </el-input-number>
                </el-form-item>
                <!-- 关键词输入 -->
                <el-form-item label="关键词输入">
                    <el-input v-model="keywordInput" type="textarea" :rows="5"
                        placeholder="请输入关键词，每行一个：&#10;例如：&#10;wireless headphones&#10;bluetooth speaker&#10;..."
                        class="keyword-textarea" maxlength="10000" show-word-limit />
                </el-form-item>
                <!-- 关键词上传 -->
                <el-form-item label="关键词上传">
                    <el-upload drag multiple>
                        <el-icon class="el-icon--upload">
                            <upload-filled />
                        </el-icon>
                        <div class="el-upload__text">
                            Drop file here or <em>click to upload</em>
                        </div>
                        <template #tip>
                            <div class="el-upload__tip">
                                xlsx files with a size less than 500kb
                            </div>
                        </template>
                    </el-upload>
                </el-form-item>
                <!-- 批量搜索按钮 -->
                <el-form-item class="el-form-item">
                    <!-- 清除缓存、暂停搜索移动到下载处理 -->
                     <el-button size="default" type="primary" @click="handleBatchSearch">
                        <el-icon>
                            <Delete />
                        </el-icon>
                        批量搜索
                    </el-button>
                    <el-button size="default" type="danger" @click="handleClearCache">
                        <el-icon>
                            <Delete />
                        </el-icon>
                        暂停搜索
                    </el-button>
                    <el-button size="default" type="danger" @click="handleClearCache">
                        <el-icon>
                            <Delete />
                        </el-icon>
                        重置
                    </el-button>
                </el-form-item>
            </el-form>
        </div>
    </el-card>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Delete } from '@element-plus/icons-vue'
import { useExtensionStore } from '@/stores/useExtensionStore'

// 变量
const store = useExtensionStore()
const dataForm = reactive({
    maxPages: store.maxPages,       // 初始化时从 store 拿
    timeoutPeriod: store.timeoutPeriod
})
const keywordInput = ref('')


// 方法
const handleMaxPagesChange = (value: number) => {
    store.setMaxPages(value)
}

const handleTimeoutPeriodChange = (value: number) => {
    store.setTimeoutPeriod(value)
}

const handleBatchSearch = async () => { 
}

const handleClearCache = async () => {
    try {
        await ElMessageBox.confirm('确定要清除所有缓存数据吗？', '确认清除', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await store.clearStorage()
        ElMessage.success('缓存清除成功')
    } catch {
        // 用户取消操作
    }
}
</script>

<style scoped>
.el-card {
    border-radius: 12px;
}

.search-section {
    margin-bottom: 10px;
}

:deep(.el-form-item) {
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 540;
}

.el-card :deep(.el-card__header) {
    padding: 12px;
}

.el-card :deep(.el-card__body) {
    padding: 12px;
}

.el-card__header span {
    font-size: 16px;
    font-weight: bold;
}

.keyword-textarea {
    margin-top: 0px;
}

:deep(.el-upload) {
    --el-upload-dragger-padding-horizontal: 5px;
    --el-upload-dragger-padding-vertical: 10px
}

:deep(.el-icon--upload) {
    margin-bottom: 2px;
    font-size: 50px;
}

:deep(.el-upload__text) {
    line-height: 16px;
}

:deep(.el-upload__tip) {
    margin-top: 1px;
    color: #a0a4ac
}
</style>

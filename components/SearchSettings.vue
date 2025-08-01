<template>
    <el-card class="search-section" shadow="hover">
        <template #header>
            <span>搜索设置</span>
        </template>

        <el-row :gutter="24" align="middle">
            <el-col :span="14">
                <el-form-item class="el-form-item" label="最大页数(最多前5页):">
                    <el-input-number v-model="store.maxPages" :min="1" :max="5" size="small"
                        @change="handleMaxPagesChange" />
                </el-form-item>
            </el-col>
            <el-col :span="10">
                <el-button size="small" @click="handleClearCache">
                    <el-icon>
                        <Delete />
                    </el-icon>
                    清除缓存
                </el-button>
            </el-col>
        </el-row>
    </el-card>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Delete } from '@element-plus/icons-vue'
import { useExtensionStore } from '@/stores/useExtensionStore'

const store = useExtensionStore()

// 方法
const handleMaxPagesChange = (value: number) => {
    store.setMaxPages(value)
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
:deep(.el-form-item) {
    margin-bottom: 0;
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
.el-form-item {
    font-size: 14px;
}
</style>

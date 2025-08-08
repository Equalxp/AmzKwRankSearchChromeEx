<template>
    <el-card class="asin-section" shadow="hover">
        <template #header>
            <div class="card-header">
                <span>ASIN管理</span>
                <el-tag class="asin-tag-info" type="info" size="default">最多3个</el-tag>
            </div>
        </template>

        <div class="asin-tags">
            <el-tag v-for="(asin, index) in store.asins" :key="asin" closable @close="handleRemoveAsin(index)"
                class="asin-tag" size="large">
                {{ asin }}
            </el-tag>

            <el-input v-if="inputVisible" ref="inputRef" v-model="inputValue" class="asin-input" size="default"
                @keyup.enter="handleInputConfirm" @blur="handleInputConfirm" placeholder="输入ASIN (B0xxxxxxxx)"
                :class="{ 'input-error': inputError }" />

            <el-button v-else class="button-new-tag" size="default" @click="showInput" v-show="addAsinIsVisible"
                type="primary" plain>
                + 添加ASIN
            </el-button>
        </div>

        <div class="asin-input">
        </div>
    </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useExtensionStore } from '@/stores/useExtensionStore'

const store = useExtensionStore()

// 响应式数据
const inputVisible = ref(false)
const inputValue = ref('')
const inputRef = ref()
const inputError = ref(false)
const dynamicTags = ref(['Tag 1', 'Tag 2', 'Tag 3'])

// 计算属性 
const addAsinIsVisible = computed(() => store.asins.length < 3)

// ASIN格式验证
const asinRegex = /^B0[A-Z0-9]{8}$/

// 方法
const handleRemoveAsin = (index: number) => {
    store.removeAsin(index)
    ElMessage.success('ASIN删除成功')
}

const showInput = () => {
    inputVisible.value = true
    inputError.value = false
    nextTick(() => {
        inputRef.value?.focus()
    })
}

const handleInputConfirm = () => {
    const value = inputValue.value.trim().toUpperCase()

    if (value) {
        // 验证ASIN格式
        if (!asinRegex.test(value)) {
            inputError.value = true
            ElMessage.error('ASIN格式不正确！应为B0开头的10位字符')
            // 出现错误时，重新聚焦
            inputRef.value?.focus()
            return
        }

        // 重复asin校验
        if (store.asins.includes(value)) {
            inputError.value = true
            ElMessage.error('ASIN已存在！')
            inputRef.value?.focus()
            return
        }

        // 数量校验
        if (store.asins.length >= 3) {
            inputError.value = true
            ElMessage.error('最多只能添加3个ASIN！')
            inputRef.value?.focus()
            return
        }
        // 添加ASIN
        if (store.addAsin(value)) {
            ElMessage.success('ASIN添加成功')
        } else {
            ElMessage.error('添加ASIN失败')
        }
    }

    inputVisible.value = false
    inputValue.value = ''
    inputError.value = false
}
</script>

<style scoped>
.el-card {
    border-radius: 12px;
}

.asin-section {
    margin-bottom: 10px;
}

.el-card :deep(.el-card__header) {
    padding: 12px;
}

.el-card :deep(.el-card__body) {
    padding: 12px;
}

.card-header {
    font-size: 16px;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-header .asin-tag-info {
    font-size: 13px;
}

.asin-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.asin-tag {
    margin: 0;
}

.asin-input {
    width: 150px;
}

.button-new-tag {
    border: 1px dashed #d9d9d9;
    background: #fafafa;
}

.input-error {
    border-color: red !important;
    box-shadow: 0 0 5px red !important;
}

:deep(.el-input__wrapper) {
    transition: border-color 0.2s, box-shadow 0.2s;
}

:deep(.input-error .el-input__wrapper) {
    border-color: red !important;
    box-shadow: 0 0 5px red !important;
}

:deep(.el-tag__content) {
    font-size: 14px;
}
</style>

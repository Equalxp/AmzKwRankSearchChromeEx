<template>
    <div class="amazon-keyword-extension">
        <el-header class="header">
            <h2>亚马逊关键词排名查询</h2>
        </el-header>

        <el-main class="main-content">
            <!-- ASIN管理区域 -->
            <AsinManager />
            <!-- 搜索设置区域 -->
            <SearchSettings />
            <!-- 批量处理区域 -->
            <BatchProcessor />
            <!-- 状态显示 -->
            <el-alert class="status-alert" />
        </el-main>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useExtensionStore } from '@/stores/useExtensionStore'
import AsinManager from '@/components/AsinManager.vue'
const store = useExtensionStore()

// 初始化
onMounted(async () => {
})
</script>

<style scoped>
.amazon-keyword-extension {
    width: 500px;
    min-height: 600px;
}

.header {
    height: auto;
    text-align: center;
    background: linear-gradient(135deg, #a2ceff 0%, #409EFF 100%);
    color: #FFFFFF;
    padding: 10px 0px;
    border-radius: 12px;
}

.header h2 {
    margin: 0;
    font-size: 18px;
}

.main-content {
    padding: 15px;
}

.status-alert {
    margin-bottom: 15px;
}
</style>

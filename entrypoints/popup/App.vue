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
            <!-- 下载处理区域 -->
            <DownloadProcessor />
            <!-- 状态显示 -->
            <!-- <el-alert class="status-alert" /> -->
        </el-main>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useExtensionStore } from '@/stores/useExtensionStore'
import AsinManager from '@/components/AsinManager.vue'
import SearchSettings from '@/components/SearchSettings.vue'
import DownloadProcessor from '@/components/DownloadProcessor.vue'
const store = useExtensionStore()

// 初始化
onMounted(async () => {
})
</script>

<style scoped>
.amazon-keyword-extension {
    width: 460px;
    min-width: none;
}

.header {
    width: calc(100% - 10px);
    height: auto;
    text-align: center;
    background: linear-gradient(135deg, #a2ceff 0%, #409EFF 100%);
    color: #FFFFFF;
    padding: 10px 0px;
    border-radius: 12px;
    margin: 0 auto
}

.header h2 {
    margin: 0;
    font-size: 18px;
}

.main-content {
    padding: 8px;
}

.status-alert {
    margin-bottom: 15px;
}
</style>

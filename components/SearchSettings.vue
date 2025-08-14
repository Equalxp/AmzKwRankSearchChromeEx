<template>
    <el-card class="search-section" shadow="hover">
        <template #header>
            <span>搜索设置</span>
        </template>

        <div>
            <el-form :model="store.dataForm" label-width="auto" label-position="left">
                <!-- 最大页数 -->
                <el-form-item class="el-form-item" label="最大页数">
                    <el-input-number
                        v-model="store.dataForm.maxPages"
                        :min="1"
                        :max="5"
                        size="default"
                    >
                        <template #suffix>
                            <span>页</span>
                        </template>
                    </el-input-number>
                </el-form-item>
                <!-- 超时时间 -->
                <el-form-item class="el-form-item" label="超时时间">
                    <el-input-number
                        v-model="store.dataForm.timeoutPeriod"
                        :min="10"
                        size="default"
                    >
                        <template #suffix>
                            <span>秒</span>
                        </template>
                    </el-input-number>
                </el-form-item>
                <!-- 关键词输入 -->
                <el-form-item label="关键词输入">
                    <el-input
                        v-model="tempkeywordInput"
                        @blur="handleInputChange"
                        @focus="displayKeyword = false"
                        type="textarea"
                        :rows="6"
                        placeholder="输入关键词，每行一个：&#10;例如：&#10;wireless headphones&#10;bluetooth speaker&#10;..."
                        class="keyword-textarea"
                        maxlength="10000"
                        show-word-limit
                    />
                </el-form-item>
                <!-- 关键词上传 -->
                <el-form-item label="关键词上传">
                    <el-upload
                        drag
                        multiple
                        accept=".xlsx,.xls,.csv"
                        :show-file-list="false"
                        :before-upload="handleBeforeUpload"
                        @change="handleFileChange"
                    >
                        <el-icon class="el-icon--upload">
                            <upload-filled />
                        </el-icon>
                        <div class="el-upload__text">
                            Drop file here or <em>click to upload</em>
                        </div>
                        <template #tip>
                            <div class="el-upload__tip">xlsx files with a size less than 1MB</div>
                        </template>
                    </el-upload>
                </el-form-item>
                <!-- 关键词预览 -->
                <div v-if="displayKeyword" class="keywords-preview">
                    <el-divider content-position="left">
                        <span class="preview-title"
                            >已导入关键词 ({{ previewKeywords.length }}个)</span
                        >
                    </el-divider>
                    <div class="keywords-list">
                        <el-tag
                            v-for="(keyword, index) in previewKeywords.slice(0, 10)"
                            :key="index"
                            size="small"
                            class="preview-tag"
                        >
                            {{ keyword }}
                        </el-tag>
                        <el-tag v-if="previewKeywords.length > 10" size="small" type="info">
                            ...还有{{ previewKeywords.length - 10 }}个
                        </el-tag>
                    </div>
                </div>
                <!-- 批量搜索按钮 -->
                <el-form-item class="el-form-item">
                    <!-- 清除缓存、暂停搜索移动到下载处理 -->
                    <el-button
                        size="default"
                        type="primary"
                        @click="handleBatchSearch"
                        :loading="store.batchSearching"
                        :disabled="!store.hasKeywords"
                    >
                        <el-icon>
                            <Search />
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
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Delete } from "@element-plus/icons-vue";
import { useExtensionStore } from "@/stores/useExtensionStore";
import {
    parseExcelFile,
    validateExcelFile,
    generateResultsExcel,
    handleKeywordInput,
} from "@/utils/excelUtils";

// 变量
const store = useExtensionStore();
const tempkeywordInput = ref(""); // 关键词输入框
let validFileNames = new Set(); // 存储通过校验的文件名（避免 before-upload 和 change 重复触发处理）
let displayKeyword = ref(false); // input输入的预览关键词显示
// 计算属性 关键词预览
const previewKeywords = computed(() => {
    if (!tempkeywordInput.value.trim()) return [];

    return tempkeywordInput.value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((keyword, index, array) => array.indexOf(keyword) === index); // 去重
});

// Input框输入
const handleInputChange = () => {
    displayKeyword.value = true;
    console.log("arr arr ", previewKeywords);
    // 如果store中已经有值
    handleKeywordInput(previewKeywords.value, "manual");
};

// 上传之前文件校验
const handleBeforeUpload = (file: File) => {
    const validation = validateExcelFile(file);
    if (!validation.valid) {
        ElMessage.error(validation.message);
        return false;
    }
    validFileNames.add(file.name);
    return true;
};

// 上传文件
const handleFileChange = async (file: any) => {
    try {
        if (!validFileNames.has(file.name)) return;
        store.setStatus("正在解析文件...", "info");

        // 解析得到xlsx关键词列表
        const excelData = await parseExcelFile(file.raw);

        if (excelData.keywords.length === 0) {
            ElMessage.error("未在文件中找到有效的关键词");
            return;
        }

        // 关键词写入store.keywords
        // store.setKeywords(excelData.keywords);
        handleKeywordInput(excelData.keywords, "upload");
        store.setStatus(`成功导入 ${excelData.keywords.length} 个关键词`, "success");
        ElMessage.success(`成功导入 ${excelData.keywords.length} 个关键词`);
        // 处理完成后删除，避免重复处理
        validFileNames.delete(file.name);
    } catch (error) {
        console.error("文件解析错误:", error);
        const errorMessage = error instanceof Error ? error.message : "文件解析失败";
        store.setStatus(errorMessage, "error");
        ElMessage.error(errorMessage);
    }
};

// 批量搜索
const handleBatchSearch = async () => {
    if (!store.hasKeywords) {
        ElMessage.error("请先上传关键词文件");
        return;
    }

    if (store.asins.length === 0) {
        ElMessage.error("请先添加至少一个ASIN");
        return;
    }

    store.setBatchSearching(true);
    store.setStatus("正在进行批量搜索...", "info");

    try {
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });

        if (!tab.id) {
            throw new Error("无法获取当前标签页");
        }

        console.log("123112321321", tab.url);

        // 检查是否在亚马逊网站
        if (!tab.url?.includes("amazon.")) {
            ElMessage.error("请在亚马逊网站上使用此功能");
            return;
        }

        // 发送消息给content script 一次性消息
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: "batchSearch",
            keywords: store.dataForm.keywords,
            asins: store.asins,
            maxPages: store.dataForm.maxPages,
        });

        if (response.success) {
            store.setBatchResults(response.results);
            store.setStatus(`批量搜索完成，找到 ${response.results.length} 个结果`, "success");
            ElMessage.success(`批量搜索完成，找到 ${response.results.length} 个结果`);
        } else {
            store.setStatus(response.message || "批量搜索失败", "error");
            ElMessage.error(response.message || "批量搜索失败");
        }
    } catch (error) {
        console.error("批量搜索错误:", error);
        const errorMessage = error instanceof Error ? error.message : "批量搜索过程中发生错误";
        store.setStatus(errorMessage, "error");
        ElMessage.error(errorMessage);
    } finally {
        store.setBatchSearching(false);
    }
};

// 清除缓存
const handleClearCache = async () => {
    try {
        await ElMessageBox.confirm("确定要清除所有缓存数据吗？", "确认清除", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning",
        });

        await store.clearStorage();
        ElMessage.success("缓存清除成功");
    } catch {
        // 用户取消操作
    }
};
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
    --el-upload-dragger-padding-vertical: 10px;
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
    color: #a0a4ac;
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
    margin-top: 12px;
    margin-bottom: 6px;
}

.keyword-tag {
    margin: 0;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.keywords-preview {
    margin-top: 15px;
}

:deep(.el-divider--horizontal) {
    margin: 10px 0;
}

/* 清空按钮样式 */
.el-input__clear-btn {
    cursor: pointer;
    color: #409eff;
    margin-right: 8px;
    user-select: none;
    font-size: 14px;
}

.el-input__clear-btn:hover {
    color: #66b1ff;
    text-decoration: underline;
}
</style>

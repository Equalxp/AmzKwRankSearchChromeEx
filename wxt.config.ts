import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifest: {
        name: '亚马逊关键词排名查询',
        description: '在亚马逊搜索结果页上定位ASIN，获取排名，支持批量导入Excel关键词表',
        version: '1.0.0',
        permissions: [
            'storage',
            'activeTab'
        ],
    }
});
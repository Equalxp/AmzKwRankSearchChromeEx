import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifest: {
        name: 'Amz Keyword Ranking Search',
        description: '在亚马逊搜索结果页上定位ASIN，获取排名，支持批量导入Excel关键词表',
        version: '1.0.0',
        permissions: [
            'storage',
            'activeTab',
        ],
        host_permissions: [
            'https://www.amazon.com/*',
            'https://www.amazon.co.uk/*',
            'https://www.amazon.ca/*',
            'https://www.amazon.it/*',
            'https://www.amazon.de/*',
            'https://www.amazon.fr/*',
            'https://www.amazon.es/*',
            "https://www.amazon.co.jp/*"
        ],
        content_scripts: [
            {
                matches: [
                    'https://www.amazon.com/*',
                    'https://www.amazon.co.uk/*',
                    'https://www.amazon.ca/*',
                    'https://www.amazon.it/*',
                    'https://www.amazon.de/*',
                    'https://www.amazon.fr/*',
                    'https://www.amazon.es/*',
                    "https://www.amazon.co.jp/*"
                ],
                js: ['content-scripts/content.js']
            }
        ]
    }
});
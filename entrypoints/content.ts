export default defineContentScript({
    matches: [
        'https://www.amazon.com/*',
        'https://www.amazon.co.uk/*',
        'https://www.amazon.ca/*',
        'https://www.amazon.it/*',
        'https://www.amazon.de/*',
        'https://www.amazon.fr/*',
        'https://www.amazon.es/*'
    ],
    main() {
        console.log('Amazon Keyword Extension Content Script Loaded')

        // 配置限制性常量
        const DEFAULT_MAX_PAGES = 5
        const MAX_ASINS = 3

        // 状态管理
        let results: Record<string, any> = {}
        let maxPages = DEFAULT_MAX_PAGES
        let keywords: string[] = []
        let port: chrome.runtime.Port | null = null
        let isConnecting = false

        // 更新状态
        function updateStatus(text: string) {
            const statusEl = document.getElementById('tm-status')
            if (statusEl) {
                statusEl.textContent = text
            }
        }

        // 建立消息端口连接（增强错误处理）
        function connectToExtension() {
            // 简单防抖
            if (isConnecting) {
                console.log('正在连接中，跳过重复连接请求')
                return
            }

            isConnecting = true

            try {
                // 清理旧连接
                if (port) {
                    try {
                        port.disconnect()
                    } catch (e) {
                        console.log('清理旧端口时出错:', e)
                    }
                    port = null
                }

                // 创建长连接
                port = chrome.runtime.connect({ name: 'content-script-port' })

                // 监听 background 通过 port.postMessage(...) 发来的指令
                port.onMessage.addListener((message) => {
                    console.log('收到来自background的消息:', message)

                    // 处理ping消息
                    if (message.type === 'ping') {
                        return // 忽略ping消息
                    }

                    // 统一处理消息
                    handleMessage(message)
                        .then(result => {
                            // 如果需要回复，可以在这里发送
                            if (message.needResponse && port) {
                                try {
                                    port.postMessage({
                                        type: 'response',
                                        requestId: message.id,
                                        result
                                    })

                                    if (chrome.runtime.lastError) {
                                        console.warn('回复消息时出错:', chrome.runtime.lastError.message)
                                    }
                                } catch (error) {
                                    console.error('回复消息时发生异常:', error)
                                }
                            }
                        })
                        .catch(error => {
                            console.error('处理消息失败:', error)
                        })
                })

                // 监听断开 并清理状态  如页面刷新、BFCache
                port.onDisconnect.addListener(() => {
                    console.log('消息端口断开连接')

                    // 检查断开原因
                    if (chrome.runtime.lastError) {
                        console.log('端口断开原因:', chrome.runtime.lastError.message)
                    }

                    port = null
                    isConnecting = false

                    // 通知用户连接已断开
                    updateStatus('⚠️ 连接已断开')
                })

                // 通知background script连接已建立
                try {
                    port.postMessage({
                        type: 'contentScriptConnected',
                        url: window.location.href
                    })

                    if (chrome.runtime.lastError) {
                        console.warn('发送连接通知时出错:', chrome.runtime.lastError.message)
                        port = null
                        isConnecting = false
                        return
                    }
                } catch (error) {
                    console.error('发送连接通知时发生异常:', error)
                    port = null
                    isConnecting = false
                    return
                }

                console.log('消息端口连接已建立')
                updateStatus('✅ 扩展已连接')
                isConnecting = false

            } catch (error) {
                console.error('建立消息端口连接失败:', error)
                port = null
                isConnecting = false
                updateStatus('❌ 连接失败')
            }
        }

        // 处理页面生命周期事件 - 解决bfcache问题
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                // 页面从BFCache恢复，重新建立连接
                console.log('页面从BFCache恢复，重新建立消息连接')

                // 延迟一点时间再重连，确保页面完全恢复
                setTimeout(() => {
                    connectToExtension()
                    updateStatus('🔄 页面已从缓存恢复，连接已重新建立')
                }, 100)
            }
        })

        // 处理页面隐藏事件
        window.addEventListener('pagehide', (event) => {
            if (event.persisted) {
                console.log('页面进入BFCache')
                // 页面将进入BFCache，端口会被自动关闭
                updateStatus('💤 页面进入缓存')
            }
        })

        // 处理强制重连请求
        function handleForceReconnect() {
            console.log('收到强制重连请求')
            updateStatus('🔄 正在重新连接...')

            // 延迟一点时间再重连
            setTimeout(() => {
                connectToExtension()
            }, 500)
        }

        // 处理消息的统一函数（增强错误处理）
        function handleMessage(request: any): Promise<any> {
            return new Promise(async (resolve, reject) => {
                console.log('处理消息:', request)

                try {
                    switch (request.action) {
                        case 'searchRanking':
                            // 搜索排名 popup发来的消息
                            const searchResult = await searchRanking(request.asins, request.maxPages)
                            resolve(searchResult)
                            break

                        case 'batchSearch':
                            // 批量搜索
                            const batchResult = await batchSearch(request.keywords, request.asins, request.maxPages)
                            resolve(batchResult)
                            break

                        case 'jumpToResult':
                            jumpToResult(request.keyword, request.page)
                            resolve({ success: true })
                            break

                        // background发消息 port问题 重新连接
                        case 'forceReconnect':
                            handleForceReconnect()
                            resolve({ success: true, message: '重连已启动' })
                            break

                        default:
                            resolve({ success: false, message: '未知操作' })
                    }
                } catch (error) {
                    console.error('处理消息时发生错误:', error)
                    // reject({ success: false, message: '处理消息时发生错误', error: error.message })
                }
            })
        }

        // 样式注入
        const STYLE = `
        /* 容器 */
        #tm-asin-container {
            position: fixed;
            top: 60px;
            left: 0; right: 0;
            padding: 6px 12px;
            background: #fff;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
            font-family: "Helvetica Neue", Arial, sans-serif;
            z-index: 9999;
            display: flex;
            align-items: center;
            transition: top 0.4s ease;
        }

        /* 状态文字 */
        #tm-asin-container span#tm-status {
            margin-left: 12px;
            margin-right: 12px;
            font-size: 16px;
            color: rgb(110, 111, 111);
        }

        /* 结果面板 */
        #results-panel {
            position: fixed;
            top: 120px;
            right: 20px;
            width: 400px;
            max-height: 500px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9998;
            overflow: hidden;
        }

        #results-panel .panel-header {
            background: #f5f5f5;
            padding: 10px 15px;
            border-bottom: 1px solid #ddd;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #results-panel .panel-content {
            max-height: 400px;
            overflow-y: auto;
            padding: 10px;
        }

        #results-panel .result-item {
            padding: 8px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }

        #results-panel .result-item:last-child {
            border-bottom: none;
        }

        .close-btn {
            cursor: pointer;
            color: #999;
            font-size: 18px;
            line-height: 1;
        }

        .close-btn:hover {
            color: #333;
        }
        `
        // 注入样式
        function injectStyles() {
            if (document.getElementById('amazon-keyword-extension-styles')) return

            const styleEl = document.createElement('style')
            styleEl.id = 'amazon-keyword-extension-styles'
            styleEl.textContent = STYLE
            document.head.appendChild(styleEl)
        }

        // 创建容器
        // 创建状态容器
        function createStatusContainer() {
            if (document.getElementById('tm-asin-container')) return

            const container = document.createElement('div')
            container.id = 'tm-asin-container'

            const status = document.createElement('span')
            status.id = 'tm-status'
            status.textContent = '亚马逊关键词排名扩展已激活'

            container.appendChild(status)
            document.body.appendChild(container)

            // 滚动隐藏效果
            let ticking = false
            let lastScrollY = window.scrollY

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        container.style.top = window.scrollY > lastScrollY ? '0' : '55px'
                        lastScrollY = window.scrollY
                        ticking = false
                    })
                    ticking = true
                }
            }, { passive: true })
        }
        // 单个搜索排名
        async function searchRanking(asins: string[], maxPagesParam: number) {
            console.log('单个搜索排名');
        }

        // 批量搜索排名
        async function batchSearch(keywordList: string[], asins: string[], maxPagesParam: number) {
            console.log('批量搜索排名');
        }

        // 跳转到搜索结果
        function jumpToResult(keyword: string, page: number) {
            console.log('跳转到搜索结果');

        }
    },
});

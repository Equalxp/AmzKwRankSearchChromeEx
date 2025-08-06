export default defineBackground(() => {
    console.log('Amazon Keyword Extension Background Script Loaded')

    // 存储活动的端口连接
    const connectedPorts = new Map<number, chrome.runtime.Port>()

    // 监听来自content script的连接
    chrome.runtime.onConnect.addListener((port) => {
        console.log('收到新的端口连接:', port.name)

        // 监听content script的消息
        if (port.name === 'content-script-port') {
            const tabId = port.sender?.tab?.id

            if (tabId) {
                // 存储端口连接
                connectedPorts.set(tabId, port)
                console.log(`为标签页 ${tabId} 建立端口连接`)

                // 监听端口断开
                port.onDisconnect.addListener(() => {
                    console.log(`标签页 ${tabId} 的端口连接断开`)

                    // 检查断开原因
                    if (chrome.runtime.lastError) {
                        console.log('端口断开原因:', chrome.runtime.lastError.message)
                    }

                    // 立即从映射中移除失效端口
                    connectedPorts.delete(tabId)
                })

                // 监听来自content script的消息
                port.onMessage.addListener((message) => {
                    console.log(`收到来自标签页 ${tabId} 的消息:`, message)

                    switch (message.type) {
                        case 'contentScriptConnected':
                            console.log(`内容脚本已连接到标签页 ${tabId}，URL: ${message.url}`)
                            break

                        case 'pageRestored':
                            console.log(`标签页 ${tabId} 从BFCache恢复并重新连接`)
                            break

                        default:
                            console.log('未知消息类型:', message.type)
                    }
                })

                // 发送欢迎消息（带错误处理）
                try {
                    port.postMessage({
                        type: 'backgroundConnected',
                        message: '后台脚本已连接'
                    })

                    // 检查同步错误
                    if (chrome.runtime.lastError) {
                        console.warn('发送欢迎消息时出错:', chrome.runtime.lastError.message)
                        connectedPorts.delete(tabId)
                    }
                } catch (error) {
                    console.error('发送欢迎消息时发生异常:', error)
                    connectedPorts.delete(tabId)
                }
            }
        }
    })

    // 向特定标签页发送消息的辅助函数（增强错误处理）
    function sendMessageToTab(tabId: number, message: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const port = connectedPorts.get(tabId)

            if (port) {
                // 使用端口发送消息
                try {
                    port.postMessage(message)

                    // 检查同步错误
                    if (chrome.runtime.lastError) {
                        console.warn('端口发送消息时出错:', chrome.runtime.lastError.message)
                        // 移除失效端口
                        connectedPorts.delete(tabId)
                        // 回退到传统消息
                        fallbackToTraditionalMessage(tabId, message, resolve, reject)
                        return
                    }

                    resolve({ success: true, method: 'port' })
                } catch (error) {
                    console.error('端口发送消息时发生异常:', error)
                    // 移除失效端口
                    connectedPorts.delete(tabId)
                    // 回退到传统消息
                    fallbackToTraditionalMessage(tabId, message, resolve, reject)
                }
            } else {
                // 端口不存在，使用传统的消息传递方式
                fallbackToTraditionalMessage(tabId, message, resolve, reject)
            }
        })
    }

    // 备用的传统消息传递方式（增强错误处理）- 兜底
    function fallbackToTraditionalMessage(tabId: number, message: any, resolve: Function, reject: Function) {
        chrome.tabs.sendMessage(tabId, message)
            .then(response => {
                resolve({ ...response, method: 'traditional' })
            })
            .catch(error => {
                console.error('传统消息传递失败:', error)

                // 检查具体错误类型
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError.message)
                }

                // 返回友好的错误信息
                reject({
                    success: false,
                    message: '无法与内容脚本通信，请确保在亚马逊页面上使用扩展',
                    error: error.message || 'Unknown error'
                })
            })
    }

    // 检查端口连接状态的辅助函数
    function isPortConnected(tabId: number): boolean {
        const port = connectedPorts.get(tabId)
        if (!port) return false

        // 尝试发送一个测试消息来验证连接
        try {
            port.postMessage({ type: 'ping' })
            if (chrome.runtime.lastError) {
                console.warn('端口连接检查失败:', chrome.runtime.lastError.message)
                connectedPorts.delete(tabId)
                return false
            }
            return true
        } catch (error) {
            console.warn('端口连接检查异常:', error)
            connectedPorts.delete(tabId)
            return false
        }
    }

    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Background收到消息:', request)

        // 处理来自popup的请求
        if (request.action && request.tabId) {
            sendMessageToTab(request.tabId, request).then(response => {
                console.log('消息发送成功:', response)
                // 传到content.js执行真正的逻辑
                sendResponse(response)
            }).catch(error => {
                console.error('消息发送失败:', error)
                sendResponse(error)
            })
            return true
        }

        // 处理其他类型的消息
        switch (request.action) {
            case 'getActiveTab':
                chrome.tabs.query({ active: true, currentWindow: true })
                    .then(tabs => {
                        if (tabs[0]) {
                            const tabId = tabs[0].id || 0
                            sendResponse({
                                success: true,
                                tab: tabs[0],
                                hasConnection: connectedPorts.has(tabId),
                                isConnected: isPortConnected(tabId)
                            })
                        } else {
                            sendResponse({ success: false, message: '无法获取当前标签页' })
                        }
                    })
                    .catch(error => {
                        console.error('获取标签页失败:', error)
                        sendResponse({ success: false, message: '获取标签页失败' })
                    })
                return true

            case 'checkConnection':
                const tabId = request.tabId
                const hasConnection = connectedPorts.has(tabId)
                const isConnected = isPortConnected(tabId)
                sendResponse({
                    success: true,
                    connected: hasConnection && isConnected,
                    hasPort: hasConnection,
                    isActive: isConnected,
                    message: (hasConnection && isConnected) ? '连接正常' : '未连接到内容脚本'
                })
                break

            case 'reconnectTab':
                // 强制重新连接指定标签页
                const targetTabId = request.tabId
                if (connectedPorts.has(targetTabId)) {
                    connectedPorts.delete(targetTabId)
                }

                // 向内容脚本发送重连请求
                chrome.tabs.sendMessage(targetTabId, { action: 'forceReconnect' })
                    .then(() => {
                        sendResponse({ success: true, message: '重连请求已发送' })
                    })
                    .catch(error => {
                        console.error('发送重连请求失败:', error)
                        sendResponse({ success: false, message: '发送重连请求失败' })
                    })
                return true

            default:
                sendResponse({ success: false, message: '未知操作' })
        }
    })

    // 监听标签页更新事件
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url?.includes('amazon.')) {
            console.log(`标签页 ${tabId} 加载完成:`, tab.url)

            // 检查是否有现有连接
            if (!connectedPorts.has(tabId)) {
                console.log(`标签页 ${tabId} 没有活动连接，等待内容脚本连接`)
            }
        }

        // 如果页面URL发生变化，清理可能失效的连接
        if (changeInfo.url) {
            if (connectedPorts.has(tabId)) {
                console.log(`标签页 ${tabId} URL变化，清理旧连接`)
                connectedPorts.delete(tabId)
            }
        }
    })

    // 监听标签页关闭事件 立即清理池
    chrome.tabs.onRemoved.addListener((tabId) => {
        if (connectedPorts.has(tabId)) {
            console.log(`标签页 ${tabId} 已关闭，清理端口连接`)
            connectedPorts.delete(tabId)
        }
    })

    // 定期清理失效连接（可选）
    setInterval(() => {
        const connectedTabIds = Array.from(connectedPorts.keys())
        console.log(`当前活动连接数: ${connectedTabIds.length}`)

        // 验证每个连接的有效性
        connectedTabIds.forEach(tabId => {
            if (!isPortConnected(tabId)) {
                console.log(`清理失效连接: 标签页 ${tabId}`)
            }
        })
    }, 60000) // 每分钟检查一次

    // 扩展启动时的初始化
    console.log('Amazon Keyword Extension Background Script 初始化完成')

    // 清理可能存在的旧连接
    connectedPorts.clear()

});
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

    // 备用的传统消息传递方式（增强错误处理）
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
     

});
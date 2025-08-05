export default defineBackground(() => {
    console.log('Amazon Keyword Extension Background Script Loaded')

    // 存储活动的端口连接
    const connectedPorts = new Map<number, chrome.runtime.Port>()

    // 监听来自content script的连接
    chrome.runtime.onConnect.addListener((port) => {
        console.log('收到新的端口连接:', port.name)

        if (port.name === 'content-script-port') {
            
        }
    })

});
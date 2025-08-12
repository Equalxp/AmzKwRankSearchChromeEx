export default defineContentScript({
    matches: [
        "https://www.amazon.com/*",
        "https://www.amazon.co.uk/*",
        "https://www.amazon.ca/*",
        "https://www.amazon.it/*",
        "https://www.amazon.de/*",
        "https://www.amazon.fr/*",
        "https://www.amazon.es/*",
    ],
    main() {
        console.log("Amazon Keyword Extension Content Script Loaded");

        // 配置限制性常量
        const DEFAULT_MAX_PAGES = 5;
        const MAX_ASINS = 3;

        // 状态管理
        let results: Record<string, any> = {};
        let maxPages = DEFAULT_MAX_PAGES;
        let keywords: string[] = [];

        // 更新状态
        function updateStatus(text: string) {
            const statusEl = document.getElementById("tm-status");
            if (statusEl) {
                statusEl.textContent = text;
            }
        }

        // 只处理batchSearch
        chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
            if (req.action !== "batchSearch") return; // 只接这一个动作

            (async () => {
                try {
                    const res = await batchSearch(req.keywords, req.asins, req.maxPages);
                    sendResponse({ success: true, results: res });
                } catch (e: any) {
                    sendResponse({
                        success: false,
                        message: e?.message || "批量搜索错误",
                    });
                }
            })();

            return true; // 异步回应，保持通道
        });

        // 辅助函数：生成随机数
        function randomBetween(min: number, max: number): number {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        // 辅助函数：延迟
        function sleep(ms: number): Promise<void> {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        // 包装后的 fetch 函数，包含随机延迟 & 错误退避
        async function fetchAsinWithDelay(keyword: string, asin: string, maxPages: number) {
            // 在真正请求之前，先等待 1-3 秒（随机）
            await sleep(randomBetween(3000, 5000));

            try {
                return await fetchAsinPosition(keyword, asin, maxPages);
            } catch (err: any) {
                console.warn(`Request failed for ${keyword} / ${asin}:`, err);
                // 碰到错误（网络、429等），退避 30–60 秒再重试一次
                await sleep(randomBetween(30000, 60000));
                return fetchAsinPosition(keyword, asin, maxPages);
            }
        }

        // 批量搜索fetch函数
        async function fetchAsinPosition(keyword: string, asin: string, maxPages: number) {
            const base = new URL(window.location.origin + "/s");
            base.searchParams.set("k", keyword);
            base.searchParams.delete("page");
            console.log("base base base", base);

            for (let page = 1; page <= maxPages; page++) {
                base.searchParams.set("page", page.toString());
                const html = await fetch(base.href, {
                    credentials: "include",
                }).then((r) => r.text());
                const doc = new DOMParser().parseFromString(html, "text/html");
                let nat = 0;
                for (const node of doc.querySelectorAll("div[data-asin]")) {
                    if (!node.querySelector("button.a-button-text, a.a-button-text")) continue;
                    if (node.querySelector(".puis-sponsored-label-text")) continue;
                    // 只加自然位
                    nat++;
                    if (node.getAttribute("data-asin") === asin) {
                        return { page, position: nat };
                    }
                }
                // 确保不返回undefined
                return { page: null, position: null };
            }
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
                border: 1px solid #ddd;
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
        `;
        // 注入样式
        function injectStyles() {
            if (document.getElementById("amazon-keyword-extension-styles")) return;

            const styleEl = document.createElement("style");
            styleEl.id = "amazon-keyword-extension-styles";
            styleEl.textContent = STYLE;
            document.head.appendChild(styleEl);
        }

        // 创建状态容器
        function createStatusContainer() {
            if (document.getElementById("tm-asin-container")) return;

            const container = document.createElement("div");
            container.id = "tm-asin-container";

            const status = document.createElement("span");
            status.id = "tm-status";
            status.textContent = "亚马逊关键词排名扩展已激活";

            container.appendChild(status);
            document.body.appendChild(container);

            // 滚动隐藏效果
            let ticking = false;
            let lastScrollY = window.scrollY;

            window.addEventListener(
                "scroll",
                () => {
                    if (!ticking) {
                        window.requestAnimationFrame(() => {
                            container.style.top = window.scrollY > lastScrollY ? "0" : "55px";
                            lastScrollY = window.scrollY;
                            ticking = false;
                        });
                        ticking = true;
                    }
                },
                { passive: true }
            );
        }

        // 批量搜索排名
        async function batchSearch(keywordList: string[], asins: string[], maxPagesParam: number) {
            try {
                updateStatus("🔎 开始批量搜索...");
                const batchResults: any[] = [];

                const tasks: { keyword: string; asin: string }[] = [];
                for (const keyword of keywordList) {
                    for (const asin of asins) {
                        tasks.push({ keyword, asin });
                    }
                }

                for (let i = 0; i < tasks.length; i++) {
                    const { keyword, asin } = tasks[i];
                    updateStatus(
                        `🔎 查询关键词 ${i + 1}/${tasks.length}: "${keyword}" 下 ASIN-${asin}`
                    );
                    console.log("keyword, asin, maxPagesParam", keyword, asin, maxPagesParam);

                    const result = await fetchAsinWithDelay(keyword, asin, maxPagesParam);
                    if (result) {
                        const { page, position } = result;
                        if (page !== null && position !== null) {
                            const totalRank = (page - 1) * 48 + position;
                            // 将找到的结果添加到批量结果中
                            batchResults.push({
                                asin,
                                keyword,
                                page,
                                position,
                                totalRank,
                                isAd: false,
                            });
                        }
                    }
                }

                updateStatus(`✅ 批量搜索完成，找到 ${batchResults.length} 个结果`);

                console.log("搜索结果batchResults:", batchResults);

                return {
                    success: true,
                    results: batchResults,
                    message: "批量搜索完成",
                };
            } catch (error) {
                console.error("批量搜索错误:", error);
                return {
                    success: false,
                    message: "批量搜索过程中发生错误",
                    error: (error as Error).message,
                };
            }
        }

        // 渲染结果面板
        function renderResultsPanel(results: Record<string, any>) {
            // 移除现有面板
            const existingPanel = document.getElementById("results-panel");
            if (existingPanel) {
                existingPanel.remove();
            }

            const panel = document.createElement("div");
            panel.id = "results-panel";

            const header = document.createElement("div");
            header.className = "panel-header";
            header.innerHTML = `
            <span>搜索结果</span>
            <span class="close-btn" onclick="this.parentElement.parentElement.remove()">×</span>
            `;

            const content = document.createElement("div");
            content.className = "panel-content";

            // 生成结果内容
            Object.entries(results).forEach(([asin, result]: [string, any]) => {
                const item = document.createElement("div");
                item.className = "result-item";

                if (result.found) {
                    item.innerHTML = `
                    <strong>${asin}</strong><br>
                    页数: ${result.page} | 位置: ${result.position} | 
                    ${
                        result.isAd
                            ? '<span style="color: orange;">广告</span>'
                            : '<span style="color: green;">自然</span>'
                    }
                `;
                } else {
                    item.innerHTML = `
                    <strong>${asin}</strong><br>
                    <span style="color: red;">未找到</span>
                `;
                }

                content.appendChild(item);
            });

            panel.appendChild(header);
            panel.appendChild(content);
            document.body.appendChild(panel);
        }

        // 初始化
        function init() {
            // 检查是否在亚马逊网站
            if (
                typeof window !== "undefined" &&
                window.location &&
                !window.location.hostname.includes("amazon.")
            ) {
                return;
            }

            injectStyles();
            createStatusContainer();
        }

        // 页面加载完成后初始化
        if (typeof document !== "undefined") {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", init);
            } else {
                init();
            }
        }
    },
});

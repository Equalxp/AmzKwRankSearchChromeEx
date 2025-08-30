# 亚马逊关键词排名 Chrome 扩展

> 原来只是一个油猴脚本, 先重构发布为chrome Extension

This template should help get you started developing with Vue 3 in WXT.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

Amazon Keywords Positioning Chrome Extension V3

## 功能特性

1. **ASIN 排名搜索**: 在亚马逊搜索结果页上定位指定的 ASIN，获取其排名位置
2. **批量关键词分析**: 支持上传 Excel/CSV 文件，批量分析关键词排名
3. **结果导出**: 将排名结果导出为 CSV 文件
4. **多站点支持**: 支持亚马逊各国站点（美国、英国、加拿大、意大利、德国、法国、西班牙）
5. **缓存功能**: 自动保存搜索结果，避免重复搜索

## 待优化
1. 自然位识别更稳: 结果项选择器与去广告条件
  1.1 自然位置的判定
  1.2 美加英、德法意西、日本
  1.3 if (!node.querySelector("button.a-button-text, a.a-button-text")) continue;在用“是否含按钮”来判断这 是不是一个有效的商品卡，会有误差。
2. 排名计算更准确: 不要假设“每页 48 个”
  2.1 可能在 不同站点/分辨率/布局 下自然位一页不是48个
  而代码totalRank = (page - 1) * 48 + position假定了48个
3. 翻页稳定性：携带 qid / sprefix / ref
  3.1 只改 page 可能导致不同请求之间重排，尤其跨几页后“结果跳动”  
4. 反爬/异常兜底：更聪明的退避与识别
  4.1 失败后固定等待 30–60s 再试，但未识别 503/Robot Check/CAPTCHA 页面；也没有设置 fetch 超时

[[优化点汇总](https://chatgpt.com/share/68b2a26a-88f8-8009-be1a-ddc634c79b5a)]
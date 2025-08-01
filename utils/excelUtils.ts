// 处理Excel文件的导入和导出功能
import * as XLSX from 'xlsx'

// 表头-列 数据
export interface ExcelData {
    keywords: string[]
    headers: string[]
    data: any[][]
}

// 解析Excel文件并提取关键词
export function parseExcelFile(file: File): Promise<ExcelData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })

                // 获取第一个工作表
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]

                // 转换为JSON数组
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                if (jsonData.length === 0) {
                    reject(new Error('Excel文件为空'))
                    return
                }

                // 提取表头和数据
                const headers = jsonData[0] || []
                const dataRows = jsonData.slice(1)

                // 提取关键词（假设第一列是关键词）
                const keywords = dataRows
                    .map(row => row[0])
                    .filter(keyword => keyword && typeof keyword === 'string' && keyword.trim())
                    .map(keyword => keyword.trim())

                resolve({
                    keywords,
                    headers,
                    data: dataRows
                })
            } catch (error) {
                reject(new Error('Excel文件解析失败: ' + (error as Error).message))
            }
        }

        reader.onerror = () => {
            reject(new Error('文件读取失败'))
        }

        reader.readAsArrayBuffer(file)
    })
}
// 生成结果Excel文件
export function generateResultsExcel(results: any[], filename: string = 'amazon_keyword_results') {
    try {
        // 准备数据
        const headers = ['ASIN', '关键词', '页数', '位置', '是否广告', '搜索时间']
        const data = results.map(result => [
            result.asin,
            result.keyword,
            result.page,
            result.position,
            result.isAd ? '是' : '否',
            new Date().toLocaleString('zh-CN')
        ])

        // 创建工作表
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data])

        // 设置列宽
        const colWidths = [
            { wch: 15 }, // ASIN
            { wch: 30 }, // 关键词
            { wch: 8 },  // 页数
            { wch: 8 },  // 位置
            { wch: 10 }, // 是否广告
            { wch: 20 }  // 搜索时间
        ]
        worksheet['!cols'] = colWidths

        // 创建工作簿
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, '搜索结果')

        // 生成文件并下载
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${filename}_${new Date().getTime()}.xlsx`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        return true
    } catch (error) {
        console.error('生成Excel文件失败:', error)
        return false
    }
}
// 生成CSV文件（备用方案）
export function generateResultsCSV(results: any[], filename: string = 'amazon_keyword_results') {
    try {
        const headers = ['ASIN', '关键词', '页数', '位置', '是否广告', '搜索时间']
        const csvContent = [
            headers.join(','),
            ...results.map(result => [
                result.asin,
                `"${result.keyword}"`, // 关键词可能包含逗号，用引号包围
                result.page,
                result.position,
                result.isAd ? '是' : '否',
                `"${new Date().toLocaleString('zh-CN')}"`
            ].join(','))
        ].join('\n')

        // 添加BOM以支持中文
        const BOM = '\uFEFF'
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${filename}_${new Date().getTime()}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        return true
    } catch (error) {
        console.error('生成CSV文件失败:', error)
        return false
    }
}
// 验证Excel文件格式
export function validateExcelFile(file: File): { valid: boolean; message: string } {
    // 检查文件类型
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
    ]

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            message: '请选择有效的Excel文件（.xlsx, .xls）或CSV文件'
        }
    }

    // 检查文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
        return {
            valid: false,
            message: '文件大小不能超过10MB'
        }
    }

    return {
        valid: true,
        message: '文件格式有效'
    }
}
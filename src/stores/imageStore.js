// Base64图片存储管理
// 使用localStorage模拟文件系统存储

const IMAGE_STORAGE_PREFIX = 'base64_image_'
const IMAGE_INDEX_KEY = 'base64_image_index'

/**
 * 获取所有已存储的图片ID列表
 */
export const getImageIndex = () => {
  try {
    const index = localStorage.getItem(IMAGE_INDEX_KEY)
    return index ? JSON.parse(index) : []
  } catch (error) {
    console.error('读取图片索引失败:', error)
    return []
  }
}

/**
 * 更新图片索引
 */
const updateImageIndex = (imageIds) => {
  try {
    localStorage.setItem(IMAGE_INDEX_KEY, JSON.stringify(imageIds))
  } catch (error) {
    console.error('更新图片索引失败:', error)
  }
}

/**
 * 保存Base64图片数据
 * @param {string} id - 图片ID
 * @param {string} base64Data - Base64数据
 * @returns {boolean} 是否保存成功
 */
export const saveImage = (id, base64Data) => {
  try {
    const key = `${IMAGE_STORAGE_PREFIX}${id}`
    localStorage.setItem(key, base64Data)

    // 更新索引
    const index = getImageIndex()
    if (!index.includes(id)) {
      index.push(id)
      updateImageIndex(index)
    }

    return true
  } catch (error) {
    console.error('保存图片失败:', error)
    // 如果是配额超限错误，尝试清理旧图片
    if (error.name === 'QuotaExceededError') {
      console.warn('存储空间不足，请考虑清理旧图片')
    }
    return false
  }
}

/**
 * 读取Base64图片数据
 * @param {string} id - 图片ID
 * @returns {string|null} Base64数据或null
 */
export const loadImage = (id) => {
  try {
    const key = `${IMAGE_STORAGE_PREFIX}${id}`
    return localStorage.getItem(key)
  } catch (error) {
    console.error('读取图片失败:', error)
    return null
  }
}

/**
 * 删除Base64图片数据
 * @param {string} id - 图片ID
 */
export const deleteImage = (id) => {
  try {
    const key = `${IMAGE_STORAGE_PREFIX}${id}`
    localStorage.removeItem(key)

    // 更新索引
    const index = getImageIndex()
    const newIndex = index.filter(imgId => imgId !== id)
    updateImageIndex(newIndex)
  } catch (error) {
    console.error('删除图片失败:', error)
  }
}

/**
 * 清理所有未使用的图片
 * @param {string[]} usedIds - 当前使用中的图片ID列表
 */
export const cleanupUnusedImages = (usedIds) => {
  try {
    const allIds = getImageIndex()
    const unusedIds = allIds.filter(id => !usedIds.includes(id))

    unusedIds.forEach(id => {
      deleteImage(id)
    })

    console.log(`清理了 ${unusedIds.length} 个未使用的图片`)
  } catch (error) {
    console.error('清理图片失败:', error)
  }
}

/**
 * 获取存储使用情况
 */
export const getStorageInfo = () => {
  try {
    const index = getImageIndex()
    let totalSize = 0

    index.forEach(id => {
      const key = `${IMAGE_STORAGE_PREFIX}${id}`
      const data = localStorage.getItem(key)
      if (data) {
        totalSize += data.length
      }
    })

    return {
      imageCount: index.length,
      totalSize: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    }
  } catch (error) {
    console.error('获取存储信息失败:', error)
    return { imageCount: 0, totalSize: 0, totalSizeMB: '0.00' }
  }
}

import { supabase } from '../lib/supabase'

export const postImageBucketName = 'post-images'

const maxSourceSize = 12 * 1024 * 1024
const maxImageSide = 1400
function getImageFormat(file) {
  if (file.type === 'image/gif') {
    return { blob: file, mime: 'image/gif', extension: 'gif' }
  }

  if (file.type === 'image/png') {
    return { mime: 'image/png', extension: 'png' }
  }

  if (file.type === 'image/webp') {
    return { mime: 'image/webp', extension: 'webp' }
  }

  return { mime: 'image/jpeg', extension: 'jpg' }
}

function createImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 불러오지 못했습니다.'))
    }
    image.src = url
  })
}

async function resizeImageFile(file) {
  const format = getImageFormat(file)
  if (format.blob) return format

  const image = await createImageFromFile(file)
  const scale = Math.min(1, maxImageSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('이미지를 변환하지 못했습니다.'))
        return
      }
      resolve({ blob, mime: format.mime, extension: format.extension })
    }, format.mime, format.mime === 'image/png' ? undefined : 0.84)
  })
}

function normalizeFileName(name, extension = 'jpg') {
  const safeName = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'image'
  return `${Date.now()}-${safeName}.${extension}`
}

export function validatePostImageFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 첨부할 수 있습니다.')
  if (file.size > maxSourceSize) throw new Error('첨부 이미지는 12MB 이하만 가능합니다.')
}

export async function uploadPostImage({ file, folder }) {
  validatePostImageFile(file)

  const resizedImage = await resizeImageFile(file)
  const imagePath = `${folder}/${normalizeFileName(file.name, resizedImage.extension)}`
  const { error } = await supabase.storage
    .from(postImageBucketName)
    .upload(imagePath, resizedImage.blob, {
      cacheControl: '31536000',
      contentType: resizedImage.mime,
      upsert: false,
    })

  if (error) throw error

  return {
    image_path: imagePath,
    image_name: file.name,
    image_mime: resizedImage.mime,
  }
}

export async function removePostImage(imagePath) {
  if (!imagePath) return
  await supabase.storage.from(postImageBucketName).remove([imagePath])
}

export function getPostImageUrl(imagePath) {
  if (!imagePath) return ''
  const { data } = supabase.storage.from(postImageBucketName).getPublicUrl(imagePath)
  return data?.publicUrl || ''
}

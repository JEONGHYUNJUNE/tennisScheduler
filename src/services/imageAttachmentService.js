import { supabase } from '../lib/supabase'

export const postImageBucketName = 'post-images'

const maxSourceSize = 12 * 1024 * 1024
const maxImageSide = 1400

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
      resolve(blob)
    }, 'image/jpeg', 0.84)
  })
}

function normalizeFileName(name) {
  const safeName = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'image'
  return `${Date.now()}-${safeName}.jpg`
}

export function validatePostImageFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 첨부할 수 있습니다.')
  if (file.size > maxSourceSize) throw new Error('첨부 이미지는 12MB 이하만 가능합니다.')
}

export async function uploadPostImage({ file, folder }) {
  validatePostImageFile(file)

  const resizedImage = await resizeImageFile(file)
  const imagePath = `${folder}/${normalizeFileName(file.name)}`
  const { error } = await supabase.storage
    .from(postImageBucketName)
    .upload(imagePath, resizedImage, {
      cacheControl: '31536000',
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) throw error

  return {
    image_path: imagePath,
    image_name: file.name,
    image_mime: 'image/jpeg',
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

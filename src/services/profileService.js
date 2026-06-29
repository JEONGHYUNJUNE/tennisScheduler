import { supabase } from '../lib/supabase'

const avatarBucketName = 'member-avatars'
const maxAvatarSourceSize = 12 * 1024 * 1024
const maxAvatarPixelSize = 900

function createImageBitmapFromFile(file) {
  if ('createImageBitmap' in window) return window.createImageBitmap(file)

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

async function resizeAvatarImage(file) {
  const image = await createImageBitmapFromFile(file)
  const scale = Math.min(1, maxAvatarPixelSize / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)

  if ('close' in image) image.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('프로필 이미지를 변환하지 못했습니다.'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', 0.86)
  })
}

export async function updateProfileAvatar({ memberId, imageFile, currentAvatarPath = '' }) {
  if (!memberId) throw new Error('회원 정보를 확인할 수 없습니다.')
  if (!imageFile) throw new Error('프로필 이미지를 선택해 주세요.')
  if (!imageFile.type.startsWith('image/')) throw new Error('이미지 파일만 선택할 수 있습니다.')
  if (imageFile.size > maxAvatarSourceSize) throw new Error('프로필 이미지는 12MB 이하만 가능합니다.')

  const resizedImage = await resizeAvatarImage(imageFile)
  const avatarPath = `${memberId}/${Date.now()}-avatar.jpg`

  const { error: uploadError } = await supabase.storage
    .from(avatarBucketName)
    .upload(avatarPath, resizedImage, {
      cacheControl: '31536000',
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabase.storage
    .from(avatarBucketName)
    .getPublicUrl(avatarPath)

  const { data, error } = await supabase
    .from('otmember')
    .update({
      avatar_url: publicUrlData.publicUrl,
      avatar_path: avatarPath,
    })
    .eq('id', memberId)
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(avatarBucketName).remove([avatarPath])
    throw error
  }

  if (currentAvatarPath && currentAvatarPath !== avatarPath) {
    await supabase.storage.from(avatarBucketName).remove([currentAvatarPath])
  }

  return data
}

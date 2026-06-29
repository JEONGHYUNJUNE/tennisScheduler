import { supabase } from '../lib/supabase'

const avatarBucketName = 'member-avatars'
const maxAvatarSourceSize = 12 * 1024 * 1024
export async function updateProfileAvatar({ memberId, imageFile, avatarBlob, currentAvatarPath = '' }) {
  if (!memberId) throw new Error('회원 정보를 확인할 수 없습니다.')
  if (!imageFile && !avatarBlob) throw new Error('프로필 이미지를 선택해 주세요.')

  if (imageFile) {
    if (!imageFile.type.startsWith('image/')) throw new Error('이미지 파일만 선택할 수 있습니다.')
    if (imageFile.size > maxAvatarSourceSize) throw new Error('프로필 이미지는 12MB 이하만 가능합니다.')
  }

  const uploadImage = avatarBlob || imageFile
  const avatarPath = `${memberId}/${Date.now()}-avatar.jpg`

  const { error: uploadError } = await supabase.storage
    .from(avatarBucketName)
    .upload(avatarPath, uploadImage, {
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

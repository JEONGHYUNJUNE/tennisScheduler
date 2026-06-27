import { supabase } from '../lib/supabase'

const bucketName = 'inquiry-attachments'
const signedUrlTtlSeconds = 60 * 60
const missingInquiryCodes = new Set(['42P01', '42703', 'PGRST204'])

function normalizeFileName(name) {
  const extension = name.includes('.') ? name.split('.').pop() : 'jpg'
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'}`
}

async function attachImageUrls(inquiries) {
  const withUrls = await Promise.all((inquiries || []).map(async (inquiry) => {
    if (!inquiry.image_path) return { ...inquiry, image_url: '' }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(inquiry.image_path, signedUrlTtlSeconds)

    return {
      ...inquiry,
      image_url: error ? '' : data?.signedUrl || '',
    }
  }))

  return withUrls.map((inquiry) => ({
    ...inquiry,
    replies: [...(inquiry.replies || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }))
}

function handleMissingInquiryTable(error) {
  if (missingInquiryCodes.has(error?.code)) {
    throw new Error('문의 기능 테이블이 아직 준비되지 않았습니다. Supabase 마이그레이션을 먼저 적용해 주세요.')
  }
  throw error
}

export async function createInquiry({ memberId, message, imageFile }) {
  const trimmedMessage = message.trim()
  if (!trimmedMessage) throw new Error('문의 내용을 입력해 주세요.')

  let imagePayload = {}

  if (imageFile) {
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('이미지 파일만 첨부할 수 있습니다.')
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error('첨부 이미지는 5MB 이하만 가능합니다.')
    }

    const imagePath = `${memberId}/${normalizeFileName(imageFile.name)}`
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(imagePath, imageFile, {
        cacheControl: '3600',
        contentType: imageFile.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    imagePayload = {
      image_path: imagePath,
      image_name: imageFile.name,
      image_mime: imageFile.type,
    }
  }

  const { data, error } = await supabase
    .from('member_inquiries')
    .insert({
      member_id: memberId,
      message: trimmedMessage,
      ...imagePayload,
    })
    .select('id, member_id, message, image_path, image_name, image_mime, status, created_at')
    .single()

  if (error) handleMissingInquiryTable(error)
  return data
}

export async function getMyInquiries(memberId) {
  const { data, error } = await supabase
    .from('member_inquiries')
    .select('id, member_id, message, image_path, image_name, image_mime, status, created_at, replies:member_inquiry_replies(id, inquiry_id, admin_member_id, sender_member_id, sender_role, message, created_at)')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) {
    if (missingInquiryCodes.has(error.code)) return []
    throw error
  }

  return attachImageUrls(data || [])
}

export async function getAdminInquiries() {
  const { data, error } = await supabase
    .from('member_inquiries')
    .select('id, member_id, message, image_path, image_name, image_mime, status, created_at, member:otmember(display_name, username), replies:member_inquiry_replies(id, inquiry_id, admin_member_id, sender_member_id, sender_role, message, created_at)')
    .order('created_at', { ascending: false })

  if (error) {
    if (missingInquiryCodes.has(error.code)) return []
    throw error
  }

  return attachImageUrls(data || [])
}

export async function replyToInquiry({ inquiryId, senderMemberId, senderRole = 'admin', message }) {
  const trimmedMessage = message.trim()
  if (!trimmedMessage) throw new Error('내용을 입력해 주세요.')

  const { error: insertError } = await supabase
    .from('member_inquiry_replies')
    .insert({
      inquiry_id: inquiryId,
      admin_member_id: senderRole === 'admin' ? senderMemberId : null,
      sender_member_id: senderMemberId,
      sender_role: senderRole,
      message: trimmedMessage,
    })

  if (insertError) handleMissingInquiryTable(insertError)

  if (senderRole !== 'admin') return

  const { error: updateError } = await supabase
    .from('member_inquiries')
    .update({ status: 'answered' })
    .eq('id', inquiryId)

  if (updateError) handleMissingInquiryTable(updateError)
}

export async function deleteInquiry(inquiry) {
  const { error } = await supabase
    .from('member_inquiries')
    .delete()
    .eq('id', inquiry.id)

  if (error) handleMissingInquiryTable(error)

  if (inquiry.image_path) {
    await supabase.storage
      .from(bucketName)
      .remove([inquiry.image_path])
  }
}

export async function deleteInquiryReply(replyId) {
  const { error } = await supabase
    .from('member_inquiry_replies')
    .delete()
    .eq('id', replyId)

  if (error) handleMissingInquiryTable(error)
}

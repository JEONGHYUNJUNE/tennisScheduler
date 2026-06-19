export function formatTennisExperience(startDate) {
  if (!startDate) return '-'

  const start = new Date(`${startDate}T00:00:00`)
  const today = new Date()
  if (Number.isNaN(start.getTime()) || start > today) return '-'

  let months = (today.getFullYear() - start.getFullYear()) * 12
  months += today.getMonth() - start.getMonth()
  if (today.getDate() < start.getDate()) months -= 1
  months = Math.max(months, 0)

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) return `${remainingMonths}개월`
  if (remainingMonths === 0) return `${years}년`
  return `${years}년 ${remainingMonths}개월`
}

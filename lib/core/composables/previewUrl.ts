/**
 * @param previewUrl url that server returns but does not return the corresponding image if the project is private
 * @param token auth token to get proper image over url
 */
export async function usePreviewUrl(
  token: string,
  previewUrl?: string
): Promise<string | undefined> {
  if (!previewUrl) return previewUrl
  const res = await fetch(previewUrl, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!res.ok) return previewUrl //
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

import type { ClassifiedModel } from './classify.js'
import { DOCS_URL } from './config.js'

/** Docs page with the request contract of a media model. */
export function modelDocsUrl(model: ClassifiedModel, locale: 'en' | 'zh' = 'en'): string {
  const slug = model.id.toLowerCase().replaceAll('.', '-')
  const kind = model.kind === 'video' ? 'video' : 'image'
  return `${DOCS_URL}${locale === 'zh' ? '/zh' : ''}/models/${kind}/${slug}/`
}

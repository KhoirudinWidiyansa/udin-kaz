import { NextRequest, NextResponse } from 'next/server'
import { createReceiptDraft, parseReceiptText } from '@/lib/receiptParser'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const manualText = String(formData.get('ocrText') || '').trim()

    if (manualText) {
      const parsed = parseReceiptText(manualText)
      return NextResponse.json({
        success: true,
        provider: 'manual-text',
        parsed,
        draft: createReceiptDraft(parsed),
      })
    }

    const image = formData.get('image')
    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: 'Upload gambar struk atau isi hasil OCR manual.', code: 'MISSING_RECEIPT_INPUT' },
        { status: 400 }
      )
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Ukuran gambar maksimal 5MB.', code: 'IMAGE_TOO_LARGE' },
        { status: 413 }
      )
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'OCR provider belum dikonfigurasi. Isi GOOGLE_GENERATIVE_AI_API_KEY di .env.local atau gunakan input teks OCR manual.',
          code: 'OCR_PROVIDER_NOT_CONFIGURED',
        },
        { status: 501 }
      )
    }

    const extractedText = await extractReceiptTextWithGemini(image)
    const parsed = parseReceiptText(extractedText)

    return NextResponse.json({
      success: true,
      provider: 'gemini',
      parsed: {
        ...parsed,
        rawText: extractedText,
      },
      draft: createReceiptDraft(parsed),
    })
  } catch (error: any) {
    console.error('[POST /api/ocr/receipt] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memproses OCR struk menggunakan Gemini. ' + (error?.message || ''), code: 'OCR_PROCESSING_FAILED' },
      { status: 500 }
    )
  }
}

async function extractReceiptTextWithGemini(image: File): Promise<string> {
  const bytes = Buffer.from(await image.arrayBuffer())
  const imageUrl = `data:${image.type || 'image/jpeg'};base64,${bytes.toString('base64')}`

  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'Extract visible receipt text from this image.',
              'Return plain receipt text only. Do not add markdown backticks, explanations, or JSON formatting.',
              'Keep item names, prices, total, merchant name, and dates if visible.',
            ].join(' '),
          },
          {
            type: 'image',
            image: imageUrl,
          },
        ],
      },
    ],
  })

  if (!text || !text.trim()) {
    throw new Error('Gemini OCR returned empty text')
  }

  return text.trim()
}

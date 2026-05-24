import { NextRequest, NextResponse } from 'next/server'
import { calculateMonthlyPrediction } from '@/lib/budget'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bulan = searchParams.get('bulan') || new Date().toISOString().substring(0, 7)
    const target = Number(searchParams.get('target') || 0)

    const prediction = await calculateMonthlyPrediction(bulan)
    
    // Add target comparison
    const result = {
      ...prediction,
      target,
      isOverBudget: target > 0 && prediction.projectedTotal > target,
    }

    return NextResponse.json({ success: true, prediction: result })
  } catch (error) {
    console.error('[GET /api/prediction] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menghitung prediksi.' },
      { status: 500 }
    )
  }
}

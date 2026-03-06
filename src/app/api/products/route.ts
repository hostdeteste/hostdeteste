import { NextResponse } from "next/server"
import {
  loadProductsFromCloud,
  saveProductsToCloud,
  addProduct,
  getProducts,
  type Product,
} from "@/app/lib/storage-optimized"

export const dynamic = "force-dynamic"

// GET - Carregar produtos
export async function GET() {
  try {
    console.log("🔄 [PRODUCTS] === CARREGANDO PRODUTOS ===")

    const products = await loadProductsFromCloud()

    console.log(`✅ [PRODUCTS] ${products.length} produtos carregados`)

    return NextResponse.json({
      products,
      success: true,
      count: products.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("💥 [PRODUCTS] Erro geral:", error)

    return NextResponse.json(
      {
        products: [],
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 200 }, // Retorna 200 para não quebrar o frontend
    )
  }
}

// POST - Salvar produtos
export async function POST(request: Request) {
  try {
    console.log("💾 [PRODUCTS] === SALVANDO PRODUTOS ===")

    const body = await request.json()
    console.log("📋 [PRODUCTS] Body recebido:", JSON.stringify(body, null, 2))

    const { products } = body

    if (!products) {
      console.error("❌ [PRODUCTS] Campo 'products' não encontrado no body")
      return NextResponse.json({ error: "Campo 'products' é obrigatório", success: false }, { status: 400 })
    }

    if (!Array.isArray(products)) {
      console.error("❌ [PRODUCTS] Dados inválidos - não é array:", typeof products)
      return NextResponse.json(
        { error: "Dados inválidos - products deve ser um array", success: false },
        { status: 400 },
      )
    }

    console.log(`📊 [PRODUCTS] Salvando ${products.length} produtos`)

    await saveProductsToCloud(products)

    console.log("✅ [PRODUCTS] Produtos salvos com sucesso")

    return NextResponse.json({
      success: true,
      count: products.length,
      timestamp: new Date().toISOString(),
      message: `${products.length} produtos processados com sucesso`,
    })
  } catch (error) {
    console.error("💥 [PRODUCTS] Erro geral:", error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      },
      { status: 500 },
    )
  }
}

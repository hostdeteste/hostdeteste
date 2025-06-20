import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Tipos
interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  featured: boolean
  order: number
  created_at?: string
  updated_at?: string
}

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cache local
let productsCache: Product[] | null = null
let productsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Função para transformar dados do Supabase
function transformSupabaseProduct(data: any): Product {
  return {
    id: data.id,
    name: data.name || "",
    description: data.description || "",
    price: data.price || 0,
    image: data.image || "",
    category: data.category || "",
    featured: data.featured || false,
    order: data.order || 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function transformProductToSupabase(product: Product): any {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    image: product.image,
    category: product.category,
    featured: product.featured,
    order: product.order,
    created_at: product.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// Função para carregar produtos
async function loadProductsFromSupabase(): Promise<Product[]> {
  try {
    console.log("🔄 [PRODUCTS] Carregando produtos do Supabase...")

    // Verificar cache primeiro
    if (productsCache && Date.now() - productsCacheTime < CACHE_DURATION) {
      console.log("✅ [PRODUCTS] Usando cache de produtos")
      return productsCache
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis Supabase não configuradas")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("❌ [PRODUCTS] Erro no Supabase:", error)
      throw new Error(`Erro no Supabase: ${error.message}`)
    }

    const products = (data || []).map(transformSupabaseProduct)

    // Atualizar cache
    productsCache = products
    productsCacheTime = Date.now()

    console.log(`✅ [PRODUCTS] ${products.length} produtos carregados do Supabase`)
    return products
  } catch (error) {
    console.error("💥 [PRODUCTS] Erro ao carregar produtos:", error)

    // Retornar cache antigo se disponível
    if (productsCache) {
      console.log("⚠️ [PRODUCTS] Usando cache antigo de produtos")
      return productsCache
    }

    throw error
  }
}

// Função para salvar produtos
async function saveProductsToSupabase(products: Product[]): Promise<void> {
  try {
    console.log(`💾 [PRODUCTS] Salvando ${products.length} produtos no Supabase...`)

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis Supabase não configuradas")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Limpar tabela e inserir novos dados
    const { error: deleteError } = await supabase.from("products").delete().neq("id", "impossible-id")

    if (deleteError) {
      console.error("❌ [PRODUCTS] Erro ao limpar produtos:", deleteError)
      throw new Error(`Erro ao limpar produtos: ${deleteError.message}`)
    }

    if (products.length > 0) {
      const supabaseProducts = products.map(transformProductToSupabase)

      const { error: insertError } = await supabase.from("products").insert(supabaseProducts)

      if (insertError) {
        console.error("❌ [PRODUCTS] Erro ao inserir produtos:", insertError)
        throw new Error(`Erro ao inserir produtos: ${insertError.message}`)
      }
    }

    // Limpar cache
    productsCache = null
    productsCacheTime = 0

    console.log("✅ [PRODUCTS] Produtos salvos com sucesso no Supabase")
  } catch (error) {
    console.error("💥 [PRODUCTS] Erro ao salvar produtos:", error)
    throw error
  }
}

// GET - Carregar produtos com cache otimizado
export async function GET() {
  try {
    console.log("🔄 [PRODUCTS] === CARREGANDO PRODUTOS ===")

    // Verificar variáveis de ambiente primeiro
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ [PRODUCTS] Variáveis Supabase não configuradas")
      console.error("NEXT_PUBLIC_SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.error("SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

      return NextResponse.json(
        {
          products: [],
          success: false,
          error: "Configuração Supabase incompleta - verifique as variáveis de ambiente",
          details: {
            supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          },
        },
        { status: 500 },
      )
    }

    console.log("✅ [PRODUCTS] Variáveis Supabase configuradas")

    try {
      const products = await loadProductsFromSupabase()

      console.log(`✅ [PRODUCTS] ${products.length} produtos carregados`)

      return NextResponse.json({
        products,
        success: true,
        count: products.length,
        timestamp: new Date().toISOString(),
        cached: true,
      })
    } catch (storageError) {
      console.error("💥 [PRODUCTS] Erro no storage:", storageError)

      return NextResponse.json(
        {
          products: [],
          success: false,
          error: "Erro ao carregar produtos",
          details: storageError instanceof Error ? storageError.message : String(storageError),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("💥 [PRODUCTS] Erro geral:", error)

    return NextResponse.json(
      {
        products: [],
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
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

    // Verificar se temos variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ [PRODUCTS] Variáveis Supabase não configuradas")
      return NextResponse.json({ error: "Configuração Supabase incompleta", success: false }, { status: 500 })
    }

    try {
      await saveProductsToSupabase(products)

      console.log("✅ [PRODUCTS] Produtos salvos com sucesso")

      return NextResponse.json({
        success: true,
        count: products.length,
        timestamp: new Date().toISOString(),
      })
    } catch (storageError) {
      console.error("💥 [PRODUCTS] Erro no storage:", storageError)

      return NextResponse.json(
        {
          error: "Erro ao salvar produtos no storage",
          details: storageError instanceof Error ? storageError.message : String(storageError),
          success: false,
        },
        { status: 500 },
      )
    }
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

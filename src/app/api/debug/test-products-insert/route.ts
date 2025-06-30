import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🔍 [ADMIN-DEBUG] === DIAGNOSTICANDO PROBLEMA DO ADMIN ===")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis Supabase não configuradas",
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Testar a mesma query que o admin usa
    console.log("📊 [ADMIN-DEBUG] Testando query do admin...")

    const { data: adminData, error: adminError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (adminError) {
      console.error("❌ [ADMIN-DEBUG] Erro na query do admin:", adminError)
      return NextResponse.json({
        success: false,
        error: "Erro na query do admin",
        details: adminError,
        step: "admin_query",
      })
    }

    console.log("✅ [ADMIN-DEBUG] Query do admin OK:", adminData?.length, "produtos")

    // 2. Testar transformação dos dados
    const transformedProducts = (adminData || []).map((data: any) => ({
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
    }))

    // 3. Verificar produtos em destaque
    const featuredProducts = transformedProducts.filter((p) => p.featured)
    const nonFeaturedProducts = transformedProducts.filter((p) => !p.featured)

    // 4. Simular a API /api/products
    console.log("🔄 [ADMIN-DEBUG] Simulando resposta da API...")

    const apiResponse = {
      products: transformedProducts,
      success: true,
      count: transformedProducts.length,
      timestamp: new Date().toISOString(),
      cached: false,
    }

    // 5. Verificar se há problemas de cache
    const cacheInfo = {
      localStorage: typeof window !== "undefined" ? "available" : "server-side",
      timestamp: Date.now(),
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        rawData: {
          count: adminData?.length || 0,
          sample: adminData?.slice(0, 2) || [],
          error: adminError?.message,
        },
        transformedData: {
          count: transformedProducts.length,
          sample: transformedProducts.slice(0, 2),
          featured: featuredProducts.length,
          nonFeatured: nonFeaturedProducts.length,
        },
        apiSimulation: apiResponse,
        cache: cacheInfo,
      },
      recommendations: [
        "1. Verificar se o hook useProducts está funcionando",
        "2. Verificar se há erros no console do navegador",
        "3. Verificar se o loading está travado",
        "4. Limpar cache do localStorage",
        "5. Verificar se a API /api/products está respondendo",
      ],
    })
  } catch (error) {
    console.error("💥 [ADMIN-DEBUG] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro no diagnóstico",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
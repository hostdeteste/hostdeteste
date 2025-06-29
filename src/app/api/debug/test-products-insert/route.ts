import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🧪 [SIMPLE-TEST] === TESTE SIMPLES DE PRODUTOS ===")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis Supabase não configuradas",
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey,
        },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Testar leitura simples
    console.log("📖 [SIMPLE-TEST] Testando leitura...")
    const { data: readData, error: readError } = await supabase.from("products").select("*").limit(5)

    if (readError) {
      console.error("❌ [SIMPLE-TEST] Erro na leitura:", readError)
      return NextResponse.json({
        success: false,
        error: "Erro ao ler produtos",
        details: readError.message,
        step: "read",
      })
    }

    console.log("✅ [SIMPLE-TEST] Leitura OK:", readData?.length, "produtos")

    // 2. Testar inserção simples
    console.log("➕ [SIMPLE-TEST] Testando inserção...")
    const testProduct = {
      id: `test_simple_${Date.now()}`,
      name: "Produto Teste Simples",
      description: "Descrição do produto teste",
      category: "Teste",
      price: 0,
      image: "/test.jpg",
      featured: false,
      order: 0,
    }

    const { data: insertData, error: insertError } = await supabase.from("products").insert([testProduct]).select()

    if (insertError) {
      console.error("❌ [SIMPLE-TEST] Erro na inserção:", insertError)
      return NextResponse.json({
        success: false,
        error: "Erro ao inserir produto",
        details: {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        },
        step: "insert",
        testProduct,
      })
    }

    console.log("✅ [SIMPLE-TEST] Inserção OK:", insertData)

    // 3. Testar atualização
    console.log("✏️ [SIMPLE-TEST] Testando atualização...")
    const { data: updateData, error: updateError } = await supabase
      .from("products")
      .update({ name: "Produto Teste Atualizado" })
      .eq("id", testProduct.id)
      .select()

    if (updateError) {
      console.error("❌ [SIMPLE-TEST] Erro na atualização:", updateError)
    } else {
      console.log("✅ [SIMPLE-TEST] Atualização OK:", updateData)
    }

    // 4. Testar deleção
    console.log("🗑️ [SIMPLE-TEST] Testando deleção...")
    const { error: deleteError } = await supabase.from("products").delete().eq("id", testProduct.id)

    if (deleteError) {
      console.error("❌ [SIMPLE-TEST] Erro na deleção:", deleteError)
    } else {
      console.log("✅ [SIMPLE-TEST] Deleção OK")
    }

    // 5. Contar produtos finais
    const { count: finalCount, error: countError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        read: {
          success: !readError,
          count: readData?.length || 0,
          data: readData?.slice(0, 2), // Apenas os primeiros 2 para não sobrecarregar
          error: readError?.message,
        },
        insert: {
          success: !insertError,
          testProduct,
          result: insertData,
          error: insertError?.message,
        },
        update: {
          success: !updateError,
          result: updateData,
          error: updateError?.message,
        },
        delete: {
          success: !deleteError,
          error: deleteError?.message,
        },
        finalCount: {
          count: finalCount || 0,
          error: countError?.message,
        },
      },
      environment: {
        supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        serviceKeyLength: supabaseServiceKey?.length || 0,
      },
    })
  } catch (error) {
    console.error("💥 [SIMPLE-TEST] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro geral no teste",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

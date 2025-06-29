import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("🧪 [TEST] === TESTANDO INSERÇÃO DE PRODUTOS ===")

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

    // 1. Verificar se a tabela existe e tem a estrutura correta
    console.log("📋 [TEST] Verificando estrutura da tabela...")

    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable, column_default")
      .eq("table_name", "products")
      .order("ordinal_position")

    if (columnsError) {
      console.error("❌ [TEST] Erro ao verificar colunas:", columnsError)
      return NextResponse.json({
        success: false,
        error: "Erro ao verificar estrutura da tabela",
        details: columnsError.message,
      })
    }

    // 2. Contar produtos existentes
    const { count: existingCount, error: countError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("❌ [TEST] Erro ao contar produtos:", countError)
    }

    // 3. Testar inserção de produto
    console.log("🧪 [TEST] Testando inserção de produto...")

    const testProduct = {
      id: `test_api_${Date.now()}`,
      name: "Produto Teste API",
      description: "Produto criado via API para teste de inserção",
      category: "Teste",
      price: 0,
      image: "/placeholder.svg?height=300&width=300",
      featured: false,
      order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: insertData, error: insertError } = await supabase.from("products").insert([testProduct]).select()

    let insertSuccess = false
    let insertDetails = null

    if (insertError) {
      console.error("❌ [TEST] Erro na inserção:", insertError)
      insertDetails = {
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      }
    } else {
      console.log("✅ [TEST] Inserção bem-sucedida:", insertData)
      insertSuccess = true
      insertDetails = insertData
    }

    // 4. Se inseriu com sucesso, tentar deletar
    if (insertSuccess && insertData && insertData.length > 0) {
      console.log("🗑️ [TEST] Removendo produto de teste...")
      const { error: deleteError } = await supabase.from("products").delete().eq("id", testProduct.id)

      if (deleteError) {
        console.error("⚠️ [TEST] Erro ao deletar produto de teste:", deleteError)
      } else {
        console.log("✅ [TEST] Produto de teste removido com sucesso")
      }
    }

    // 5. Verificar políticas RLS
    console.log("🔒 [TEST] Verificando políticas RLS...")

    const { data: policies, error: policiesError } = await supabase
      .from("pg_policies")
      .select("policyname, permissive, roles, cmd, qual")
      .eq("tablename", "products")

    // 6. Testar leitura pública (sem service role)
    console.log("👁️ [TEST] Testando leitura pública...")

    const publicSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "")
    const { data: publicData, error: publicError } = await publicSupabase.from("products").select("id, name").limit(1)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        tableStructure: {
          columns: columns || [],
          columnsCount: columns?.length || 0,
          error: columnsError?.message,
        },
        existingData: {
          count: existingCount || 0,
          error: countError?.message,
        },
        insertion: {
          success: insertSuccess,
          testProduct,
          result: insertDetails,
          error: insertError?.message,
        },
        policies: {
          data: policies || [],
          count: policies?.length || 0,
          error: policiesError?.message,
        },
        publicRead: {
          success: !publicError,
          data: publicData || [],
          error: publicError?.message,
        },
      },
      recommendations: [
        "1. Execute o script SQL para recriar a tabela",
        "2. Verifique se as políticas RLS estão corretas",
        "3. Confirme que o service role key está configurado",
        "4. Teste a inserção via painel admin",
      ],
    })
  } catch (error) {
    console.error("💥 [TEST] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao testar produtos",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

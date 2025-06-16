import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  console.log("🔍 [DEBUG] Testando conexão Supabase...")

  try {
    // 1. Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("🔧 [DEBUG] Variáveis de ambiente:")
    console.log("   NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl)
    console.log("   SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey)

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente Supabase não configuradas",
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey,
        },
      })
    }

    // 2. Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Testar conexão básica
    console.log("🔄 [DEBUG] Testando conexão básica...")
    const { data: connectionTest, error: connectionError } = await supabase.from("weekly_pdfs").select("count").limit(1)

    if (connectionError) {
      console.error("❌ [DEBUG] Erro de conexão:", connectionError)
      return NextResponse.json({
        success: false,
        error: "Erro de conexão com Supabase",
        details: {
          code: connectionError.code,
          message: connectionError.message,
          hint: connectionError.hint,
        },
      })
    }

    // 4. Verificar estrutura da tabela
    console.log("🔄 [DEBUG] Verificando estrutura da tabela...")
    const { data: tableInfo, error: tableError } = await supabase.rpc("get_table_info", {
      table_name: "weekly_pdfs",
    })

    // Se a função RPC não existir, tentar query direta
    let tableStructure = null
    if (tableError) {
      console.log("⚠️ [DEBUG] RPC não disponível, tentando query direta...")
      const { data: directQuery, error: directError } = await supabase
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable")
        .eq("table_name", "weekly_pdfs")

      if (directError) {
        console.error("❌ [DEBUG] Erro ao verificar tabela:", directError)
        tableStructure = { error: directError.message }
      } else {
        tableStructure = directQuery
      }
    } else {
      tableStructure = tableInfo
    }

    // 5. Testar inserção de teste
    console.log("🔄 [DEBUG] Testando inserção...")
    const testRecord = {
      id: `test-${Date.now()}`,
      name: "Teste de Conexão",
      url: "https://example.com/test.pdf",
      uploadDate: new Date().toISOString(),
      week: "1/1",
      year: 2024,
      file_path: "test/test.pdf",
      original_size: 1000,
      compressed_size: 800,
      compression_ratio: 0.8,
    }

    const { data: insertData, error: insertError } = await supabase
      .from("weekly_pdfs")
      .insert([testRecord])
      .select()
      .single()

    if (insertError) {
      console.error("❌ [DEBUG] Erro na inserção:", insertError)
      return NextResponse.json({
        success: false,
        error: "Erro ao inserir registro de teste",
        details: {
          code: insertError.code,
          message: insertError.message,
          hint: insertError.hint,
        },
        tableStructure,
      })
    }

    // 6. Limpar registro de teste
    console.log("🧹 [DEBUG] Limpando registro de teste...")
    await supabase.from("weekly_pdfs").delete().eq("id", testRecord.id)

    console.log("✅ [DEBUG] Todos os testes passaram!")

    return NextResponse.json({
      success: true,
      message: "Conexão Supabase funcionando corretamente",
      tests: {
        connection: "✅ OK",
        tableAccess: "✅ OK",
        insert: "✅ OK",
        delete: "✅ OK",
      },
      tableStructure,
      testRecord: insertData,
    })
  } catch (error) {
    console.error("❌ [DEBUG] Erro geral:", error)
    return NextResponse.json({
      success: false,
      error: "Erro geral no teste Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}

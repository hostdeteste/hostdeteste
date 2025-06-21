import { NextResponse } from "next/server"
import { readdirSync, existsSync } from "fs"
import { join } from "path"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const apiPath = join(process.cwd(), "src", "app", "api")

    // Função recursiva para listar todas as rotas
    function listRoutes(dir: string, basePath = ""): string[] {
      const routes: string[] = []

      try {
        const items = readdirSync(dir, { withFileTypes: true })

        for (const item of items) {
          if (item.isDirectory()) {
            const subRoutes = listRoutes(join(dir, item.name), `${basePath}/${item.name}`)
            routes.push(...subRoutes)
          } else if (item.name === "route.ts" || item.name === "route.js") {
            routes.push(`${basePath}/`)
          }
        }
      } catch (error) {
        // Ignorar erros de leitura de diretório
      }

      return routes
    }

    const routes = listRoutes(apiPath)

    // Verificações específicas
    const checks = {
      "pdf-proxy": existsSync(join(apiPath, "pdf-proxy", "route.ts")),
      "weekly-pdfs": existsSync(join(apiPath, "weekly-pdfs", "route.ts")),
      products: existsSync(join(apiPath, "products", "route.ts")),
      upload: existsSync(join(apiPath, "upload", "route.ts")),
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      apiPath,
      allRoutes: routes.sort(),
      specificChecks: checks,
      pdfProxyExists: checks["pdf-proxy"],
      recommendation: checks["pdf-proxy"]
        ? "✅ Arquivo pdf-proxy/route.ts existe - problema pode ser de cache do deploy"
        : "❌ Arquivo pdf-proxy/route.ts NÃO existe - precisa ser criado",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao verificar rotas",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

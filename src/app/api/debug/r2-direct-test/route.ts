import { NextResponse } from "next/server"
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3"

export const dynamic = "force-dynamic"

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"
const R2_PUBLIC_URL = "https://pub-92501dd4f797413a9775e615967d81ba.r2.dev"

export async function GET() {
  try {
    console.log("🔍 [R2-TEST] === TESTANDO R2 DIRETAMENTE ===")

    // 1. Listar arquivos no bucket
    console.log("📂 [R2-TEST] Listando arquivos no bucket...")

    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: "weekly-pdfs/",
      MaxKeys: 10,
    })

    const listResult = await r2Client.send(listCommand)
    const files = listResult.Contents || []

    console.log(`📊 [R2-TEST] Encontrados ${files.length} arquivos`)

    // 2. Testar cada arquivo
    const fileTests = []

    for (const file of files) {
      if (!file.Key) continue

      try {
        // Verificar metadados do arquivo
        const headCommand = new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.Key,
        })

        const headResult = await r2Client.send(headCommand)

        // Testar URL pública
        const publicUrl = `${R2_PUBLIC_URL}/${file.Key}`

        let publicTest
        try {
          const response = await fetch(publicUrl, { method: "HEAD" })
          publicTest = {
            url: publicUrl,
            status: response.status,
            accessible: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
          }
        } catch (fetchError) {
          publicTest = {
            url: publicUrl,
            status: "ERROR",
            accessible: false,
            error: fetchError instanceof Error ? fetchError.message : String(fetchError),
          }
        }

        fileTests.push({
          key: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          contentType: headResult.ContentType,
          contentLength: headResult.ContentLength,
          publicTest,
        })
      } catch (error) {
        fileTests.push({
          key: file.Key,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 3. Verificar configuração do bucket
    console.log("⚙️ [R2-TEST] Verificando configuração...")

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      bucket: BUCKET_NAME,
      publicUrl: R2_PUBLIC_URL,
      totalFiles: files.length,
      files: fileTests,
      environment: {
        accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
        hasAccessKey: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        bucketName: BUCKET_NAME,
      },
      recommendations: [
        "1. Verificar se os arquivos existem no bucket",
        "2. Confirmar se a URL pública está correta",
        "3. Verificar permissões dos arquivos",
        "4. Testar acesso direto aos arquivos",
      ],
    })
  } catch (error) {
    console.error("💥 [R2-TEST] Erro:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao testar R2",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

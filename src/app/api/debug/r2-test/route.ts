import { NextResponse } from "next/server"
import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3"

export const dynamic = "force-dynamic"

export async function GET() {
  console.log("🔍 [DEBUG] Testando conexão Cloudflare R2...")

  try {
    // 1. Verificar variáveis de ambiente
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "coutyfil-assets"

    console.log("🔧 [DEBUG] Variáveis R2:")
    console.log("   CLOUDFLARE_R2_ACCOUNT_ID:", !!accountId)
    console.log("   CLOUDFLARE_R2_ACCESS_KEY_ID:", !!accessKeyId)
    console.log("   CLOUDFLARE_R2_SECRET_ACCESS_KEY:", !!secretAccessKey)
    console.log("   CLOUDFLARE_R2_BUCKET_NAME:", bucketName)

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente R2 não configuradas",
        details: {
          hasAccountId: !!accountId,
          hasAccessKeyId: !!accessKeyId,
          hasSecretAccessKey: !!secretAccessKey,
        },
      })
    }

    // 2. Criar cliente R2
    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // 3. Testar listagem de objetos
    console.log("🔄 [DEBUG] Testando listagem de objetos...")
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 5,
    })

    const listResult = await r2Client.send(listCommand)
    console.log("✅ [DEBUG] Listagem OK:", listResult.KeyCount, "objetos encontrados")

    // 4. Testar upload de arquivo pequeno
    console.log("🔄 [DEBUG] Testando upload...")
    const testFileName = `test/debug-${Date.now()}.txt`
    const testContent = "Teste de conexão R2"

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testFileName,
      Body: Buffer.from(testContent),
      ContentType: "text/plain",
    })

    await r2Client.send(uploadCommand)
    console.log("✅ [DEBUG] Upload OK:", testFileName)

    return NextResponse.json({
      success: true,
      message: "Conexão R2 funcionando corretamente",
      tests: {
        connection: "✅ OK",
        listObjects: "✅ OK",
        upload: "✅ OK",
      },
      bucket: bucketName,
      objectCount: listResult.KeyCount || 0,
      testFile: testFileName,
    })
  } catch (error) {
    console.error("❌ [DEBUG] Erro R2:", error)
    return NextResponse.json({
      success: false,
      error: "Erro na conexão R2",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}

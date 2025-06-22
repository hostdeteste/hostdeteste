// Execute estes comandos no console do navegador para testar as APIs

// 1. Testar se a API de produtos existe (GET)
console.log('🔍 Testando GET /api/products...')
fetch('/api/products')
  .then(response => {
    console.log('GET Status:', response.status)
    return response.json()
  })
  .then(data => console.log('GET Data:', data))
  .catch(error => console.error('GET Error:', error))

// 2. Testar POST para adicionar produto
console.log('🔍 Testando POST /api/products...')
const testProduct = {
  products: [{
    id: 'test-' + Date.now(),
    name: 'Produto Teste',
    description: 'Descrição teste',
    category: 'Outros',
    price: 0,
    featured: false,
    order: 0,
    image: '/placeholder.svg'
  }]
}

fetch('/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testProduct)
})
  .then(response => {
    console.log('POST Status:', response.status)
    return response.json()
  })
  .then(data => console.log('POST Data:', data))
  .catch(error => console.error('POST Error:', error))

// 3. Verificar se existe rota de última modificação
console.log('🔍 Testando GET /api/products/last-modified...')
fetch('/api/products/last-modified')
  .then(response => {
    console.log('LastMod Status:', response.status)
    return response.json()
  })
  .then(data => console.log('LastMod Data:', data))
  .catch(error => console.error('LastMod Error:', error))
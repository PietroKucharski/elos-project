import ky, { type KyInstance } from 'ky'

export const api: KyInstance = ky.create({
  // ky 2.x renomeou `prefixUrl` para `prefix`. Com `prefix`, a barra inicial do
  // input é ignorada na junção — então tanto `api.get('v1/...')` quanto
  // `api.get('/v1/...')` resolvem corretamente contra o host da API.
  prefix: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  hooks: {
    // ky 2.x entrega um único objeto de estado ({ request, options, response })
    // ao hook afterResponse — diferente da assinatura posicional do ky 1.x.
    afterResponse: [
      async ({ response }) => {
        if (response.status === 401 && typeof window !== 'undefined') {
          window.location.href = '/sign-in'
        }
      },
    ],
  },
  retry: {
    limit: 1,
    statusCodes: [408, 502, 503, 504],
  },
})

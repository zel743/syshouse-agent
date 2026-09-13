/**
 * Especificación OpenAPI 3.0 del REST de `backend/`, escrita a mano (el
 * API surface es chico: 3 endpoints). Servida como página interactiva en
 * `/api-docs` vía swagger-ui-express — no documenta el WebSocket (`/ws`)
 * ni las tools de MCP, que tienen su propio protocolo (ver
 * `.context/documentacion-tecnica.md`).
 */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Agente de Educación Financiera — API',
    version: '1.0.0',
    description:
      'API REST de `backend/`. El canal del agente (streaming de render_ui) va por WebSocket en `/ws`, no aparece aquí — ver la documentación técnica del proyecto.',
  },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [
    { name: 'auth', description: 'Autenticación de usuarios' },
    { name: 'education', description: 'Datos de perfil financiero' },
    { name: 'health', description: 'Estado del servicio' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'El servicio está corriendo',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { status: { type: 'string' } } },
                example: { status: 'API funcionando correctamente' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Iniciar sesión',
        description:
          'Busca al usuario por `nombre` (tolerante a mayúsculas/espacios) y compara la contraseña con bcrypt. Devuelve un JWT de 2h.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['usuario', 'password'],
                properties: {
                  usuario: { type: 'string', example: 'Luis' },
                  password: { type: 'string', format: 'password', example: 'banorte2026' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login correcto',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    usuario_id: { type: 'integer' },
                    auth_uid: { type: 'string' },
                    nombre: { type: 'string' },
                    perfil: { type: 'string', enum: ['Deudor', 'Inversor', 'Ahorrativo', 'Novato'] },
                    racha_inversion: { type: 'integer' },
                  },
                },
                example: {
                  token: 'eyJhbGciOi...',
                  usuario_id: 1,
                  auth_uid: 'uid_1',
                  nombre: 'Luis',
                  perfil: 'Novato',
                  racha_inversion: 0,
                },
              },
            },
          },
          '400': {
            description: 'Falta `usuario` o `password`',
            content: { 'application/json': { example: { error: 'Usuario y contraseña son requeridos' } } },
          },
          '401': {
            description: 'Usuario o contraseña incorrectos',
            content: { 'application/json': { example: { error: 'Usuario o contraseña incorrectos' } } },
          },
        },
      },
    },
    '/api/education/perfil/{auth_uid}': {
      get: {
        tags: ['education'],
        summary: 'Obtener perfil financiero de un usuario',
        parameters: [
          {
            name: 'auth_uid',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'uid_1',
          },
        ],
        responses: {
          '200': {
            description: 'Perfil encontrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nombre: { type: 'string' },
                    perfil: { type: 'string' },
                    racha_inversion: { type: 'integer' },
                  },
                },
                example: { nombre: 'Luis', perfil: 'Novato', racha_inversion: 0 },
              },
            },
          },
          '404': {
            description: 'Usuario no encontrado',
            content: { 'application/json': { example: { error: 'Usuario no encontrado' } } },
          },
        },
      },
    },
  },
};

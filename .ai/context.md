# Contexto Arquitectónico: syshouse-agent

Este documento explica la reestructuración del proyecto hacia un entorno Monorepo de tres capas, diseñado específicamente para cumplir con los lineamientos del **Reto UI Generativa Banorte - Tec** integrando un flujo completo de A2UI (Agent-to-User Interface) y MCP (Model Context Protocol).

## ¿Qué cambió?

El proyecto pasó de ser una aplicación móvil monolítica a una estructura dividida en tres servicios independientes dentro del mismo repositorio.

**Estructura actual:**
\`\`\`text
syshouse-agent/
├── app-mobil/   (Frontend - React Native / Expo)
├── backend/     (Orquestador - Node.js / Express)
└── mcp/         (Servidor de Datos - Model Context Protocol)
\`\`\`

## Justificación de las Capas

### 1. app-mobil/ (Capa de Presentación / A2UI)
*   **Qué es:** La aplicación móvil construida con React Native y Expo.
*   **Por qué se separó:** Por seguridad y arquitectura. Una aplicación móvil jamás debe conectarse directamente a una base de datos (PostgreSQL en Azure) porque expondría las credenciales al compilarse.
*   **Responsabilidad:** Su único trabajo es enviar los prompts del usuario al `backend` y actuar como la **A2UI**. Escucha los *tool calls* (invocación de herramientas) que envía el agente y dibuja componentes nativos interactivos (simuladores, tarjetas de deuda, botones de planes) en lugar de un muro de texto.

### 2. backend/ (Capa de Orquestación)
*   **Qué es:** Una API intermediaria ligera construida con Node.js y Express.
*   **Por qué se creó:** Para mediar entre el cliente y los modelos de lenguaje, garantizando que el entorno móvil no procese la carga pesada del SDK de IA.
*   **Responsabilidad:** Oculta las API Keys (OpenAI, Anthropic). Actúa como el cerebro del sistema: recibe la intención del usuario, consulta al LLM, se comunica con la capa `mcp` para obtener contexto financiero y transmite en tiempo real (*stream*) la respuesta hacia `app-mobil` ordenando qué interfaz renderizar.

### 3. mcp/ (Capa de Datos y Herramientas)
*   **Qué es:** El servidor que implementa el estándar Model Context Protocol.
*   **Por qué se separó:** Para mantener el principio de responsabilidad única. Aislar la lógica de extracción de datos permite que el LLM entienda qué herramientas tiene a su disposición sin mezclar reglas de base de datos con la lógica de la API HTTP.
*   **Responsabilidad:** Se conecta de forma segura a Azure PostgreSQL. Expone consultas específicas (ej. `obtener_resumen_mensual`, `obtener_recomendaciones_perfil`) como herramientas estandarizadas que el LLM utiliza para nutrir su contexto antes de responder al usuario.

## Flujo de Ejecución (Desarrollo Local)

Debido al desacoplamiento, el entorno de desarrollo requiere ejecutar los tres servicios en paralelo usando terminales independientes:

1.  **Terminal 1 (Datos):** `cd mcp && npm start`
2.  **Terminal 2 (Cerebro):** `cd backend && npm run dev`
3.  **Terminal 3 (UI):** `cd app-mobil && npx expo start`
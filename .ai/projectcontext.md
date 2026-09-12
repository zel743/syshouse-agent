# BANORTE X TEC DE MONTERREY: Interfaces que la IA construye en tiempo real[cite: 2]

El reto principal es lograr que el modelo no solo conteste, sino que arme la pantalla que resuelve el problema financiero de quien pregunta[cite: 2]. La arquitectura cuenta con el LLM al centro, el protocolo MCP para datos y acciones, y A2UI para la interfaz[cite: 2].

## El Reto y Objetivo[cite: 2]
El caso de uso es libre, siempre dentro de servicios o productos financieros, y cada equipo elige el problema[cite: 2].
*   El agente construye la UI[cite: 2].
*   La pantalla se arma según la intención detectada[cite: 2].
*   Se deben usar componentes propios como simuladores, tablas o formularios[cite: 2].
*   Lo que la persona toca regresa al modelo como contexto[cite: 2].

El objetivo es crear una experiencia que se rediseña a sí misma a través de tres pasos[cite: 2]:
1.  **Interpretar la intención:** El agente entiende qué quiere lograr la persona y con qué contexto llega[cite: 2].
2.  **Generar la interfaz:** Decide qué componentes mostrar y los transmite mediante A2UI o un protocolo equivalente[cite: 2].
3.  **Ejecutar la acción:** La interacción con la UI dispara nuevas acciones y vuelve a cambiar la experiencia[cite: 2].

## Dominio[cite: 2]
El territorio abarca servicios y productos financieros en las siguientes áreas[cite: 2]:
*   Banca personal[cite: 2].
*   Inversiones[cite: 2].
*   Crédito[cite: 2].
*   Pagos[cite: 2].
*   Seguros[cite: 2].
*   Educación financiera[cite: 2].

## Base Técnica Común[cite: 2]
Existen tres piezas que no son negociables en la arquitectura de referencia[cite: 2]:
*   **LLM:** El modelo debe ser la parte central de la experiencia que interpreta, decide y orquesta[cite: 2].
*   **MCP:** Model Context Protocol sirve para exponer al modelo los datos, las herramientas y las acciones que el equipo construyó[cite: 2].
*   **A2UI:** Agent-to-UI, o un protocolo equivalente, se utiliza para representar y transmitir la interfaz que genera el agente[cite: 2].
*   El ciclo de conexión fluye del Usuario al Agente/LLM, pasa por MCP, luego por A2UI hacia los Componentes, y la interacción de estos regresa al agente como contexto[cite: 2].

## Reglas de Construcción[cite: 2]
Cada equipo construye su solución bajo las siguientes reglas[cite: 2]:
*   Diseñan y programan sus propios componentes, ya que no se entrega biblioteca de UI[cite: 2].
*   Crean o integran sus propios datos y APIs (sintéticos, simulados o de fuentes públicas)[cite: 2].
*   Deben tener al menos un flujo accionable donde la persona interactúe con la UI generada y produzca un cambio real[cite: 2].
*   Existe total libertad de stack para elegir cualquier lenguaje, framework, modelo o proveedor de infraestructura[cite: 2].

## Evaluación[cite: 2]
Los puntos del reto se reparten de la siguiente manera[cite: 2]:
*   Cumplimiento y utilidad para el usuario vale el 25%[cite: 2].
*   Calidad y adaptabilidad de la UI generada representa el 20%[cite: 2].
*   Calidad de la solución de IA suma un 15%[cite: 2].
*   Arquitectura e ingeniería aporta otro 15%[cite: 2].
*   UX y diseño equivale al 10%[cite: 2].
*   Innovación contribuye con el 10%[cite: 2].
*   La presentación representa el 5%[cite: 2].

## Entregables[cite: 2]
Los equipos deben presentarse con cuatro elementos[cite: 2]:
*   **Demo:** Una corrida en vivo del flujo completo mostrando la intención, UI generada, interacción y la acción que dispara[cite: 2].
*   **Código:** El repositorio con los componentes, servidor MCP y capa A2UI, incluyendo instrucciones para correrlo[cite: 2].
*   **Datos:** Las APIs y datasets, es decir, los servicios creados por el equipo[cite: 2].
*   **Técnico:** Un diagrama de arquitectura y las decisiones o trade-offs sobre el modelo, protocolo e infraestructura[cite: 2].
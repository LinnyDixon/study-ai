# STUDY AI

Aplicación de estudio en español, creada con Next.js. Incluye una interfaz adaptable a móvil y escritorio, cuentas opcionales con Supabase y herramientas de organización y estudio asistidas por Ollama.

## Funciones

- **Agenda, calendario y libreta:** tareas, fechas de estudio y apuntes guardados por cuenta con Supabase o localmente en el dispositivo.
- **Exámenes:** genera preguntas basadas en el material, con clave de respuestas separada.
- **Resúmenes:** convierte el material en apuntes de estudio organizados y desarrollados.
- **Investigar:** organiza una consulta y ofrece enlaces a Google y Google Académico. Ollama local no consulta la web en vivo.
- **Lector:** lectura en voz alta usando las voces disponibles en el navegador.
- **IA libre:** chat con Ollama; historial local o sincronizado con Supabase cuando está configurado.
- **Autenticación:** email y Google OAuth mediante Supabase; configuración de cuenta y panel privado de administración.

## Desarrollo local

Requiere Node.js 20.9 o posterior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). En Windows puedes copiar `.env.example` como `.env.local` desde el Explorador. Completa las variables necesarias en `.env.local`; nunca subas ese archivo.

## Ollama

La aplicación llama a Ollama desde el servidor Next.js. Para desarrollo local, instala Ollama, descarga un modelo y deja `OLLAMA_BASE_URL` y `OLLAMA_MODEL` en `.env.local`. El valor predeterminado usa `http://127.0.0.1:11434` y `llama3.2`.

Para un despliegue, el servidor alojado necesita acceder a Ollama. Puedes configurar Ollama Cloud mediante `OLLAMA_BASE_URL`, `OLLAMA_MODEL` y `OLLAMA_API_KEY` como variables privadas del servidor. No expongas la clave con una variable `NEXT_PUBLIC_*` ni publiques directamente el puerto local de Ollama.

## Supabase y autenticación

Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`. Aplica en Supabase las migraciones que están en `supabase/migrations/`, habilita Google OAuth si corresponde y registra las URL de retorno permitidas.

La publishable key está pensada para el navegador y se usa junto con políticas RLS. Nunca pongas una clave `service_role` o `secret` en una variable pública.

## Generador de imágenes

La generación usa la API de imágenes de OpenAI desde una ruta privada del servidor. Para activarla:

1. Agrega `OPENAI_API_KEY` como variable de entorno privada en `.env.local` para desarrollo o en la configuración del servidor de producción. No uses el prefijo `NEXT_PUBLIC_`.
2. En Supabase → SQL Editor, ejecuta `supabase/migrations/202611130004_image_generator.sql`. Crea la biblioteca privada, sus políticas de acceso y la cuota diaria basada en el plan.
3. Reinicia el servidor local o redespliega la aplicación.

`OPENAI_IMAGE_MODEL` es opcional; por defecto usa `gpt-image-2`. La interfaz ofrece calidad baja, media y alta; la API admite dimensiones cuadradas, apaisadas y verticales con estas calidades. La generación queda bloqueada hasta que existan la clave y la migración.

## Verificaciones

```bash
npm run lint
npx tsc --noEmit
npm run build
```

La aplicación todavía requiere una dirección HTTPS y un hosting configurado para que cualquier persona pueda abrirla en Internet. Este repositorio guarda el código; por sí solo no publica el sitio.

# OpenAI Speech Demo

Minimal Next.js App Router demo for:

`Question → Text-to-Speech → microphone recording → Speech-to-Text → Transcript`

## Requirements

- Node.js 20+
- An OpenAI API key with access to `gpt-4o-mini-tts` and `gpt-4o-mini-transcribe`
- A browser supporting `MediaRecorder`

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local`, then run:

```powershell
npm run dev
```

Open <http://localhost:3000/demo/speech>.

Microphone access works on `localhost` or an HTTPS deployment. The API key is read only by
the server-side route and is never exposed through a `NEXT_PUBLIC_` variable.

## Verify

```powershell
npm run check
npm run build
```

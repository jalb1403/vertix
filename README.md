# VERTIX — Trail Running AI

Entrenador de trail running con inteligencia artificial (Gemini).

## Instalación local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Deploy en Vercel

1. Sube esta carpeta a GitHub
2. Entra en vercel.com → New Project → importa el repo
3. Vercel detecta Vite automáticamente → Deploy

## Estructura

```
vertix/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    └── App.jsx   ← aquí está la API key (línea 4)
```

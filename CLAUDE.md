# ProdeTelco - Estado Actual (2026-04-22)

Documento de referencia tecnica del proyecto, actualizado con el estado real del codigo.

## Resumen
- App web de pronosticos del Mundial 2026 (48 equipos, 12 grupos A-L).
- Login/registro con Google.
- Predicciones de fase de grupos y eliminatorias.
- Ranking global, actividad reciente, perfil editable.
- Chat global flotante para usuarios autenticados.
- Banderas de selecciones en tablas, fixtures y actividad.
- Sección "DT" donde cada usuario arma un equipo de 11 jugadores y acumula puntajes según el rendimiento real (datos en `puntajes.json`).

## Stack
- Frontend: React 18, React Router 6, Tailwind CSS 3.
- Build: Vite 5.
- Backend: Firebase (Auth, Firestore, Hosting, Analytics en cliente).
- Scripts de datos: Node + firebase-admin.

## Comandos
```bash
npm run dev
npm run build
npm run preview

# Carga de datos
node initData.js
node checkData.js

# Deploy
firebase deploy --only hosting
```

## Estructura (real)
```text
src/
  App.jsx
  main.jsx
  firebase.js
  index.css
  contexts/
    AuthContext.jsx
  components/
    ChatWidget.jsx        # Chat en produccion (flotante)
    ChatButton.jsx        # Legacy, no usado por App
    CountryFlag.jsx       # Componente de bandera con fallbacks (hoy no usado)
    GroupStandings.jsx
    GroupsFixture.jsx
    KnockoutBracket.jsx
    Navbar.jsx
    PrivateRoute.jsx
    UserAvatar.jsx
    UserProfileModal.jsx
  pages/
    Home.jsx
    Login.jsx
    Register.jsx
    Groups.jsx
    Knockout.jsx
    Ranking.jsx
    Results.jsx
    Admins.jsx
    Logs.jsx
    Profile.jsx
  utils/
    flags.js
```

## Ruteo
Definido en `src/App.jsx`.

Publicas:
- `/`
- `/login`
- `/register`

Privadas (`PrivateRoute`):
- `/groups`
- `/knockout`
- `/ranking`
- `/results`
- `/admins`
- `/profile`
- `/logs`

Componente global activo:
- `ChatWidget` se renderiza junto al `Navbar` en toda la app.

## Chat (estado actual)
Fuente de verdad:
- UI: `src/components/ChatWidget.jsx`
- Coleccion Firestore: `comments`
- Reglas: `firestore.rules` permite `read/create/delete` en `comments` para usuarios autenticados.

Comportamiento:
- Boton flotante fijo abajo a la derecha.
- Panel modal grande (responsive).
- Contador de no leidos mientras esta cerrado.
- Mensajes en tiempo real (`onSnapshot`).
- Menciones con `@`:
  - Filtrado de usuarios.
  - Navegacion con teclado (arriba/abajo, enter/tab, escape).
- Click en avatar/nickname abre `UserProfileModal`.

Notas:
- `ChatButton.jsx` usa `chat_messages` y no esta conectado en `App.jsx`.
- Mantener `ChatWidget` como implementacion principal.

## Banderas (estado actual)
Hay 3 mecanismos en el repo:

1) `src/utils/flags.js` (en uso principal)
- Mapa `FIFA -> URL` (FlagCDN `w40`).
- Funciona por codigo FIFA (ARG, BRA, etc).
- Usado en:
  - `GroupStandings.jsx`
  - `GroupsFixture.jsx`
  - `Logs.jsx`

2) `src/components/CountryFlag.jsx` (no usado hoy)
- Render por ISO2 con fallback:
  - Twemoji PNG
  - Flag Icons SVG
  - Unicode emoji

3) `UserProfileModal.jsx`
- Tiene su propio mapa local de banderas en emoji para predicciones recientes.

## Sección DT (El DT sos vos)
Estado actual:
- UI principal en `src/pages/DT.jsx`.
- El usuario arma su formación y escuadra, guardándose en la colección `dtSquads`.
- Incluye una pestaña "Puntajes de Partidos" que muestra el análisis táctico y el rendimiento de los jugadores.
- **Datos de Puntajes:** La fuente de verdad actual es el JSON estático `src/data/puntajes.json`.
- **Vista de Puntajes:** Cuenta con un selector paginado para navegar entre los distintos partidos (uno por vez) y un diseño de doble columna (grid) para comparar los equipos local y visitante.
- **Mapeo de Jugadores:** Al renderizar los puntajes, el código busca automáticamente cada jugador en la colección oficial `players` de Firestore (cruzando por `player_id` o `name` ignorando mayúsculas), asegurando que siempre se muestre la información oficial del jugador (nombre y posición).

## Autenticacion y perfil
- AuthContext:
  - Escucha `onAuthStateChanged`.
  - Crea/mergea documento `users/{uid}` al iniciar sesion.
  - Expone `currentUser`, `userData`, `loading`.
- Login y registro:
  - Google Sign-In (`signInWithPopup`).
- Perfil:
  - Edita nickname y avatar (emoji + color).
  - Muestra a la derecha las predicciones ya hechas, con edicion inline de marcador y guardado por partido.
  - La edicion de pais/codigo ISO2 fue retirada de la UI de Perfil.
  - Esos datos impactan en ranking, chat y actividad.

## Firestore - colecciones relevantes
- `users`
  - Perfil publico + rol admin + puntos.
- `teams`
  - Equipos por grupo.
- `matches`
  - Fixture y resultados oficiales.
- `predictions`
  - Predicciones de usuarios (grupos y knockout).
- `comments`
  - Mensajes del chat global.

## Reglas (firestore.rules)
- `teams`, `matches`: lectura autenticada.
- `predictions`: lectura autenticada; escritura si el ID coincide con `uid_*`.
- `comments`: lectura y creacion autenticada; delete del propio autor.
- `users`:
  - cada usuario escribe su perfil con validacion de `country` ISO2.
  - hay regla para admin update de `isAdmin` (ver riesgos abajo).

## Datos y seeds
- `initData.js` carga:
  - 48 equipos.
  - 72 partidos de fase de grupos.
- IDs:
  - Equipo: `{fifaCode}_{group}` (ej: `ARG_J`)
  - Partido: `{homeTeamId}_vs_{awayTeamId}`
  - Prediccion: `{userId}_{matchId}`

## Deploy
- Hosting configurado para SPA en `firebase.json`:
  - `public: dist`
  - rewrite `** -> /index.html`
- URL de hosting:
  - `https://prodetelco.web.app`

## Riesgos y pendientes reales
1. Codificacion de texto
- Hay mojibake en varios archivos (`Ã`, `â`, etc).
- Conviene normalizar todo el repo a UTF-8.

2. Regla admin en `users`
- La condicion actual usa `request.resource.data.keys().hasOnly(['isAdmin'])`.
- Puede bloquear updates esperados si el documento ya tiene mas campos.
- Sugerido: usar diff de campos cambiados.

3. Knockout incompleto
- `KnockoutBracket` hoy renderiza/pronostica principalmente octavos.
- Cuartos, semis y final estan como placeholders en estructura.

4. Duplicacion de sistema de chat
- Existe `ChatButton` legacy + `ChatWidget` activo.
- Mantener uno solo para evitar confusiones futuras.

5. Banderas duplicadas
- `flags.js` + `CountryFlag` + mapa local en `UserProfileModal`.
- Unificar en una sola fuente cuando se haga refactor.

## Convenciones utiles
- Priorizar `ChatWidget` + coleccion `comments`.
- Para banderas de selecciones, usar `getFlag(fifaCode)` de `src/utils/flags.js`.
- Mantener IDs de documentos con los formatos usados por seed y UI.

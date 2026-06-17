# PRODE Mundial 2026

Una aplicación web para participar en un PRODE (pronósticos deportivos) del Mundial de Fútbol 2026, que contará con 48 equipos.

## Características

- Autenticación de usuarios (email/password y Google)
- Fase de grupos: predicción de resultados exactos y obtención de puntos
- Eliminatorias: predicción de ganadores y resultados
- Sistema de puntos detallado
- Ranking global de usuarios
- Actualización en tiempo real de tablas de posiciones
- Diseño responsive y moderno
- Soporte para modo oscuro (por implementar)
- Ligas privadas (por implementar)

## Tecnologías utilizadas

- Frontend: React + Tailwind CSS
- Backend: Firebase (Firestore, Auth, Hosting)
- Estado local: React Hooks

## Estructura del proyecto

```
src/
├── components/         # Componentes reutilizables
│   ├── GroupStandings.js   # Tabla de posiciones de grupos
│   ├── GroupsFixture.js    # Formulario para cargar predicciones de grupos
│   ├── KnockoutBracket.js  # Visualización de eliminatorias
│   └── PrivateRoute.js     # Protección de rutas
├── contexts/           # Contextos de React
│   └── AuthContext.js  # Manejo de autenticación
├── pages/              # Páginas de la aplicación
│   ├── Groups.js       # Vista de fase de grupos
│   ├── Home.js         # Página de inicio
│   ├── Knockout.js     # Vista de eliminatorias
│   ├── Login.js        # Página de login
│   ├── Ranking.js      # Vista de ranking
│   └── Register.js     # Página de registro
├── firebase.js         # Configuración de Firebase
├── App.js              # Componente principal de rutas
├── index.css           # Estilos globales de Tailwind
└── main.js             # Punto de entrada de React
```

## Base de datos (Firestore)

La aplicación utiliza las siguientes colecciones en Firestore:

- `teams`: Información de los equipos participantes
- `matches`: Partidos del torneo (fase de grupos y eliminatorias)
- `users`: Información de los usuarios registrados
- `predictions`: Predicciones realizadas por los usuarios
  - Cada documento tiene el ID: `{userId}_{matchId}`
  - Campos: `userId`, `matchId`, `homeScore`, `awayScore`, `winnerId` (para eliminatorias), `updatedAt`

## Cómo ejecutar el proyecto

1. Clonar el repositorio
2. Instalar dependencias:
   ```
   npm install
   ```
3. Configurar Firebase:
   - Crear un proyecto en Firebase Console
   - Habilitar Auth (Email/Password y Google)
   - Habilitar Firestore
   - Reemplazar la configuración en `src/firebase.js` con la de tu proyecto
4. Inicializar datos (opcional pero recomendado):
   ```
   node initData.js
   ```
5. Iniciar la aplicación de desarrollo:
   ```
   npm run dev
   ```

## Sistema de puntos

### Fase de grupos
- Resultado exacto: 3 puntos
- Ganador o empate correcto: 1 punto
- Diferencia de gol correcta (opcional): +1 punto

### Eliminatorias
- Ganador correcto: 3 puntos
- Resultado exacto: +2 puntos (adicional)
- Bonus por acertar campeón: +10 puntos

## Próximos pasos / Mejoras

- Implementar ligas privadas con invitación por enlace
- Añadir notificaciones (recordatorios de carga de predicciones)
- Implementar modo oscuro
- Mejorar la visualización del bracket de eliminatorias
- Añadir desempates avanzados (fair play, etc.)
- Optimizar consultas a Firestore para mejor rendimiento
- Implementar actualización en tiempo real de predicciones de otros usuarios (opcional)
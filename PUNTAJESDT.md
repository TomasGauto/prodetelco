# Sistema de Puntajes Generales - Sección DT (ProdeTelco)

Este documento establece los criterios y la estructura para evaluar a los jugadores de cualquier partido en la aplicación, otorgándoles un puntaje del 1 al 10. Estos puntajes alimentarán la sección "DT" y servirán para calcular las bonificaciones de los usuarios.

## 1. Reglas de Puntuación (Escala 1 al 10)

Todos los jugadores que disputen al menos 15 minutos en el partido parten de un **puntaje base de 5.0**. Sobre esa base, se suman o restan puntos según su rendimiento estadístico.

### Suma de Puntos (Bonificaciones)
* **Gol anotado:** +2.0 puntos (Delanteros/Mediocampistas), +3.0 puntos (Defensores/Arqueros).
* **Asistencia:** +1.0 punto.
* **Valla Invicta (Arqueros y Defensores):** +1.5 puntos (si juegan más de 60 minutos).
* **Atajada clave / Penal atajado (Arqueros):** +1.0 punto / +2.0 puntos.
* **Figura del partido (MVP Oficial):** +1.5 puntos extra.

### Resta de Puntos (Penalizaciones)
* **Tarjeta Amarilla:** -0.5 puntos.
* **Tarjeta Roja:** -2.0 puntos.
* **Gol en contra:** -1.5 puntos.
* **Penal fallado:** -1.0 punto.
* **Por cada gol recibido (Arqueros y Defensores):** -0.5 puntos.

*(Nota: El puntaje máximo es 10.0 y el mínimo es 1.0. Los valores se redondean a 1 decimal).*

---

## 2. Estructura de Datos (JSON)
Para almacenar y consumir esta información en la base de datos (Firebase) y renderizarla en el frontend (React/AppSheet), se debe utilizar la siguiente estructura por partido:

```json
{
  "match_id": "CODIGO_DEL_PARTIDO",
  "dt_stats": {
    "tactical_analysis": "Análisis general de la posesión y estrategia del partido.",
    "players_performance": [
      {
        "player_id": "ID_JUGADOR",
        "name": "Nombre del Jugador",
        "team": "Código del Equipo (Ej: ARG, KOR, CZE)",
        "position": "ARQ | DEF | MED | DEL",
        "rating": 8.5,
        "is_mvp": true,
        "stats_summary": {
          "goals": 1,
          "assists": 0,
          "yellow_cards": 0,
          "red_cards": 0
        },
        "highlight": "Comentario breve justificando su puntaje (Ej: Marcó el gol de la victoria)."
      }
    ]
  }
}
```

## 3. Implementación en la Sección "DT"
En la interfaz de usuario, la sección "DT" mostrará:
1. **El Mejor Jugador (MVP):** Tarjeta destacada con su puntaje (ej: 8.5) y foto.
2. **El "Peor" Jugador:** (Opcional) Tarjeta con el jugador de menor rendimiento.
3. **Lista de Rendimientos:** Una tabla o lista colapsable separada por equipos, mostrando a los titulares y suplentes clave con sus calificaciones del 1 al 10 y el resumen de sus estadísticas.

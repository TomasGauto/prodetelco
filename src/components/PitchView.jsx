import { getFlag } from '../utils/flags';

const PlayerSlot = ({ player, isCaptain, onToggleCaptain, onRemove, locked }) => {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 text-2xl">
          +
        </div>
        <span className="text-[10px] text-white/60 uppercase tracking-wide">vacío</span>
      </div>
    );
  }

  const lastName = player.name.split(' ').slice(-1)[0];
  const flag = getFlag(player.country);

  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className="relative">
        <div
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white shadow-md overflow-hidden border-2 border-white"
          style={{
            backgroundImage: flag ? `url(${flag})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {isCaptain && (
          <span
            className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow"
            title="Capitán (x2 puntos)"
          >
            C
          </span>
        )}
      </div>
      <span className="text-[10px] sm:text-xs text-white font-medium max-w-[80px] truncate drop-shadow text-center">
        {lastName}
      </span>
      {!locked && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onToggleCaptain}
            className={`text-[9px] px-1.5 py-0.5 rounded ${
              isCaptain
                ? 'bg-yellow-400 text-gray-900'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title="Marcar como capitán"
          >
            C
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white hover:bg-red-500/80"
            title="Quitar"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

const Row = ({ children }) => (
  <div className="flex justify-around items-start w-full px-2">{children}</div>
);

const PitchView = ({
  formation,
  gk,
  defenders,
  midfielders,
  forwards,
  captainId,
  playersMap,
  onRemove,
  onToggleCaptain,
  locked,
}) => {
  const resolve = (id) => (id ? playersMap[id] : null);

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg w-full aspect-[3/4] sm:aspect-[4/5] flex flex-col justify-between py-4 sm:py-5"
      style={{
        background:
          'linear-gradient(180deg, #166534 0%, #15803d 50%, #166534 100%)',
      }}
    >
      {/* Líneas del campo */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 6px, transparent 6px 60px)',
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/30 pointer-events-none" />
      <div className="absolute top-1/2 left-0 right-0 border-t border-white/30 pointer-events-none" />

      {/* Forwards arriba */}
      <Row>
        {forwards.map((id, i) => (
          <PlayerSlot
            key={`fwd-${i}`}
            player={resolve(id)}
            isCaptain={!!id && id === captainId}
            onRemove={() => onRemove('forwards', i)}
            onToggleCaptain={() => onToggleCaptain(id)}
            locked={locked}
          />
        ))}
      </Row>

      {/* Mids */}
      <Row>
        {midfielders.map((id, i) => (
          <PlayerSlot
            key={`mid-${i}`}
            player={resolve(id)}
            isCaptain={!!id && id === captainId}
            onRemove={() => onRemove('midfielders', i)}
            onToggleCaptain={() => onToggleCaptain(id)}
            locked={locked}
          />
        ))}
      </Row>

      {/* Defenders */}
      <Row>
        {defenders.map((id, i) => (
          <PlayerSlot
            key={`def-${i}`}
            player={resolve(id)}
            isCaptain={!!id && id === captainId}
            onRemove={() => onRemove('defenders', i)}
            onToggleCaptain={() => onToggleCaptain(id)}
            locked={locked}
          />
        ))}
      </Row>

      {/* GK abajo */}
      <Row>
        <PlayerSlot
          player={resolve(gk)}
          isCaptain={!!gk && gk === captainId}
          onRemove={() => onRemove('gk', 0)}
          onToggleCaptain={() => onToggleCaptain(gk)}
          locked={locked}
        />
      </Row>

      {/* Etiqueta formación */}
      <div className="absolute top-2 right-3 bg-black/40 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
        {formation}
      </div>
    </div>
  );
};

export default PitchView;

export function Rules() {
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Reglas</h2>
          <p className="section-copy">
            Es importante tener en cuenta las siguientes reglas para participar en la quiniela:
          </p>
        </div>
      </div>
      <h3>General</h3>
      <div className="rules-grid">
        <div className="rule-card">
          <strong>24 h</strong>
          <p>Antes del partido se bloquea el registro y la edición.</p>
        </div>
      </div>

      <h3>Puntuación - FASE DE GRUPOS</h3>
      <div className="rules-grid">
        <div className="rule-card">
          <strong>+1 pt</strong>
          <p>Por acertar el resultado: ganador, perdedor o empate.</p>
        </div>
        <div className="rule-card">
          <strong>+2 pts</strong>
          <p>Extra por acertar el marcador exacto del partido.</p>
        </div>
      </div>

      <h3>
        Puntuación - FASE DE ELIMINACIÓN DIRECTA (dieciseisavos, octavos, cuartos, semifinales y
        final)
      </h3>
      <div className="rules-grid">
        <div className="rule-card">
          <strong>+1 pt</strong>
          <p>Por acertar el resultado: ganador, perdedor o empate.</p>
        </div>
        <div className="rule-card">
          <strong>+2 pts</strong>
          <p>Extra por acertar el marcador exacto del partido.</p>
        </div>
        <div className="rule-card">
          <strong>+1 pt</strong>
          <p>Por acertar ganador en caso de penales.</p>
        </div>
      </div>
      <h3>Importante sobre la fase de eliminación directa</h3>
      <ul>
        <li>
          En la fase de eliminación directa, si el usuario predice un empate (por ejemplo 2-2) para
          un partido que termina empatado en el tiempo regular, entonces su predicción avanzará a la
          ronda de penales.
        </li>
        <li>
          Si el usuario predice un ganador directo (por ejemplo 2-1) para un partido que termina
          empatado en el tiempo regular, entonces su predicción no avanzará a la ronda de penales y
          no podrá ganar puntos por esa fase.
        </li>
      </ul>
    </section>
  );
}

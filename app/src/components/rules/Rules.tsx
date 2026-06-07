export function Rules() {
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Reglas</h2>
          <p className="section-copy">
            Es importante tener en cuenta las siguientes reglas para participar en la quiniela:
          </p>
          <ul>
            <li className="section-copy">La quiniela se juega durante 24 horas antes del inicio del partido.Es importante registrar o actualizar tus pronósticos antes de que se cierre el registro para cada partido, ya que una vez cerrado no podrás hacer cambios ni registrar pronósticos para ese partido.</li>
            <li className="section-copy">Los puntos se asignan según el resultado final del partido y la fase del torneo, con reglas específicas para la fase de eliminación directa.</li>
            <li className="section-copy">En caso de empate en puntos, el desempate se realizará considerando el número total de aciertos de resultado (ganador, perdedor o empate) y luego el número total de aciertos de marcador exacto.</li>
            <li className="section-copy">Es responsabilidad de cada participante asegurarse de que sus pronósticos estén registrados correctamente antes del cierre para cada partido.</li>
          </ul>        
          <p className="section-copy">Recuerda que el objetivo principal es divertirse y disfrutar del torneo, así que ¡a jugar y que gane el mejor!</p>
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

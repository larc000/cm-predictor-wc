export function Rules() {
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Rules</h2>
          <p className="section-copy">
            Keep these rules in mind while playing:
          </p>
          <ul>
            <li className="section-copy">Submit or update your predictions before each match closes, 1 hour before kickoff. Once closed, you cannot edit or submit predictions for that match.</li>
            <li className="section-copy">Points are awarded based on the final match result and knockout-stage scoring rules.</li>
            <li className="section-copy">Each participant is responsible for making sure their predictions are saved before the deadline.</li>
            <li className="section-copy">If participants are tied after the tournament, the tiebreaker will be decided by a draw.</li>
          </ul>        
          <p className="section-copy">The main goal is to have fun and enjoy the tournament. Good luck!</p>
        </div>
      </div>
      <h3>General</h3>
      <div className="rules-grid">
        <div className="rule-card">
          <strong>1 h</strong>
          <p>Submissions and edits close before kickoff.</p>
        </div>
      </div>

      <h3>
        Scoring - Knockout Stage (round of 32, round of 16, quarterfinals, semifinals, third place,
        and final)
      </h3>
      <div className="rules-grid">
        <div className="rule-card">
          <strong>+1 pt</strong>
          <p>For predicting the match result: winner, loser, or draw.</p>
        </div>
        <div className="rule-card">
          <strong>+2 pts</strong>
          <p>Extra points for predicting the exact score.</p>
        </div>
        <div className="rule-card">
          <strong>+1 pt</strong>
          <p>For predicting the penalty winner when applicable.</p>
        </div>
      </div>
      <h3>Important knockout-stage details</h3>
      <ul>
        <li>
          If you predict a draw, for example 1-1, and the match ends tied in regulation time,
          your prediction moves to the penalty-winner pick.
        </li>
        <li>
          If you predict a direct winner, for example 2-1, for a match that ends tied in regulation
          time, your prediction does not move to penalties and cannot earn the penalty point.
        </li>
      </ul>
    </section>
  );
}

export function Rules() {
  return (
    <section className="rules-section">

      <div className="rules-section-title">
        <span aria-hidden="true" />
        <h3>General</h3>
      </div>

      <div className="section-heading rules-hero">
        <div>          
          <h4>Keep these rules in mind while playing:</h4>
          <ul className="rules-intro-list">
            <li>
              Submit or update your predictions before each match closes, 1 hour before kickoff.
              Once closed, you cannot edit or submit predictions for that match.
            </li>
            <li>
              Points are awarded based on the final match result and knockout-stage scoring rules.
            </li>
            <li>
              Each participant is responsible for making sure their predictions are saved before the
              deadline.
            </li>
            <li>
              If participants are tied after the tournament, the tiebreaker will be decided by a draw.
            </li>
          </ul>
          <h4>
            The main goal is to have fun and enjoy the tournament. Good luck!
          </h4>
        </div>
      </div>

     <div className="rules-section-title">
        <span aria-hidden="true" />
        <h3>TIME LIMITS</h3>
      </div>

      <div className="rules-grid">
        <div className="rule-card rule-card-orange">
          <div>
            <strong>1 hour</strong>
            <p>Submissions and edits close before kickoff.</p>
          </div>
          <span className="rule-points-badge">1 h</span>
        </div>
      </div>

      <div className="rules-section-title">
        <span aria-hidden="true" />
        <h3>
          Scoring - Knockout-Stage
        </h3>
      </div>
      <div className="rules-grid">
        <div className="rule-card rule-card-orange">
          <div>
            <strong>+1 point</strong>
            <p>For predicting the match result: winner, loser, or draw.</p>
          </div>
          <span className="rule-points-badge">1 pt</span>
        </div>
        <div className="rule-card rule-card-blue">
          <div>
            <strong>+2 points</strong>
            <p>Extra points for predicting the exact score.</p>
          </div>
          <span className="rule-points-badge">2 pts</span>
        </div>
        <div className="rule-card rule-card-gray">
          <div>
            <strong>+1 point</strong>
            <p>For predicting the penalty winner when applicable.</p>
          </div>
          <span className="rule-points-badge">1 pt</span>
        </div>
      </div>

      <div className="rules-section-title">
        <span aria-hidden="true" />
        <h3>Important details</h3>
      </div>
      <div className="rules-faq-list">
        <div className="rules-faq-item is-open">
          <h4>What happens in extra time or penalties?</h4>
          <p>
            If you predict a draw, for example 1-1, and the match ends tied in regulation time,
            your prediction moves to the penalty-winner pick.
          </p>
        </div>
        <div className="rules-faq-item">
          <h4>What if I predict a direct winner and the match ends tied?</h4>
          <p>
            If you predict a direct winner, for example 2-1, for a match that ends tied in regulation
            time, your prediction does not move to penalties and cannot earn the penalty point.
          </p>
        </div>
      </div>
    </section>
  );
}

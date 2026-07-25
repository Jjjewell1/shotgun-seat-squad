export default function GameWrapper({ children, title, icon, onBack }) {
  return (
    <div className="game-wrapper">
      <div className="game-header">
        <button className="game-back-btn" onClick={onBack}>← Back</button>
        <h2 className="game-title">{icon} {title}</h2>
      </div>
      <div className="game-content">
        {children}
      </div>
    </div>
  )
}

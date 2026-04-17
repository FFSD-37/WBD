import { useState, useMemo } from "react";
import "./../styles/games.css";
import games from "../Constants/games.js";

const BASE_REFERRER = "http://localhost:5173/games";

export default function Games() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGame, setActiveGame] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const filteredGames = useMemo(() =>
    games.filter((g) =>
      g.title.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [searchTerm]
  );

  const startGame = (game) => {
    setActiveGame(game);
    setStartTime(Date.now());
  };

  const updateGameTime = async (gameId, timeSpent) => {
    try {
      await fetch(`${import.meta.env.VITE_SERVER_URL}/games/updateTime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, timeSpent }),
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to update game time", err);
    }
  };

  const handleClose = async () => {
    if (startTime && activeGame) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      await updateGameTime(activeGame.gameId, timeSpent);
    }
    setActiveGame(null);
    setStartTime(null);
    window.history.replaceState(null, "", BASE_REFERRER);
  };

  return (
    <div className="gp-root">
      {/* ── Header ── */}
      <header className="gp-header">
        <a href="/home" className="gp-logo" aria-label="Home">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z" />
          </svg>
        </a>

        <div className="gp-search-wrap">
          <svg className="gp-search-icon" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor">
            <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
          </svg>
          <input
            type="text"
            className="gp-search"
            placeholder="Search games…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search games"
          />
          {searchTerm && (
            <button className="gp-search-clear" onClick={() => setSearchTerm("")} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        <span className="gp-count">{filteredGames.length} game{filteredGames.length !== 1 ? "s" : ""}</span>
      </header>

      {/* ── Grid ── */}
      <main className="gp-grid-wrap">
        {filteredGames.length === 0 ? (
          <div className="gp-empty">
            <span className="gp-empty-icon">🎮</span>
            <p>No games found{searchTerm ? ` for "${searchTerm}"` : ""}</p>
            <button className="gp-empty-reset" onClick={() => setSearchTerm("")}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="gp-grid">
            {filteredGames.map((game, i) => (
              <button
                key={game.gameId}
                className="gp-card"
                onClick={() => startGame(game)}
                style={{ animationDelay: `${i * 30}ms` }}
                aria-label={`Play ${game.title}`}
              >
                <div className="gp-card-img-wrap">
                  <img
                    src={game.img}
                    alt={game.title}
                    className="gp-card-img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.classList.add("gp-card-img-wrap--fallback");
                    }}
                  />
                  <div className="gp-card-overlay">
                    <span className="gp-card-play">
                      <svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 -960 960 960" width="28" fill="currentColor">
                        <path d="M320-200v-560l440 280-440 280Z"/>
                      </svg>
                    </span>
                    <span className="gp-card-title">{game.title}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ── Modal ── */}
      {activeGame && (
        <div className="gp-modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-label={activeGame.title}>
          <div className="gp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gp-modal-bar">
              <span className="gp-modal-name">{activeGame.title}</span>
              <button className="gp-modal-close" onClick={handleClose} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                  <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                </svg>
              </button>
            </div>
            <div className="gp-modal-frame">
              <iframe
                src={`https://html5.gamedistribution.com/${activeGame.gameId}/?gd_sdk_referrer_url=${BASE_REFERRER}`}
                width={activeGame.width}
                height={activeGame.height}
                title={activeGame.title}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
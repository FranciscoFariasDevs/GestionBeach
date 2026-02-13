import React, { useState } from 'react';

const games = [
  {
    id: 1,
    name: 'Super Mario World',
    console: 'SNES',
    year: '1990',
    color: '#E52521',
    url: 'https://www.retrogames.cz/play_245-SNES.php',
    cover: 'https://static.wikia.nocookie.net/ssbb/images/2/25/Car%C3%A1tula_Super_Mario_World.png/revision/latest?cb=20130727232019&path-prefix=es'
  },
  {
    id: 2,
    name: 'Donkey Kong Country',
    console: 'SNES',
    year: '1994',
    color: '#8B4513',
    url: 'https://www.retrogames.cz/play_289-SNES.php',
    cover: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQeBt4QwnxxIGHJ29OCyX5M5XW2I9r7DlDNPBBstGZsPMqVEdTnoDV_uKnV9hcPI--XRf4XLeMx0AnE6DXulCE61FcRunejJB7WCZFkyg&s=10'
  },
  {
    id: 3,
    name: 'Killer Instinct',
    console: 'SNES',
    year: '1995',
    color: '#4B0082',
    url: 'https://www.retrogames.cz/play_875-SNES.php',
    cover: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHPTmotwO7hF7Evr7E-5FNDZVngrz9ePeCYw&s'
  }
];

const GamesPage = () => {
  const [selectedGame, setSelectedGame] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .games-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%);
          font-family: 'Press Start 2P', cursive;
          padding: 20px;
        }

        .content {
          max-width: 1000px;
          margin: 0 auto;
        }

        .back-btn {
          font-family: 'Press Start 2P', cursive;
          font-size: 0.6rem;
          padding: 12px 20px;
          background: #00ffff;
          color: #000;
          border: 3px solid #008888;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 30px;
        }

        .back-btn:hover {
          background: #00cccc;
        }

        .header {
          text-align: center;
          margin-bottom: 50px;
        }

        .title {
          font-size: 2rem;
          color: #fff;
          text-shadow: 0 0 20px #ff00ff;
          margin-bottom: 15px;
        }

        .subtitle {
          font-size: 0.6rem;
          color: #ffd700;
        }

        .heart {
          color: #ff0066;
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        @media (max-width: 800px) {
          .games-grid { grid-template-columns: 1fr; }
          .title { font-size: 1.2rem; }
        }

        .game-card {
          background: #111;
          border: 4px solid #333;
          cursor: pointer;
          transition: all 0.3s;
        }

        .game-card:hover {
          transform: translateY(-10px);
          border-color: #fff;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }

        .game-cover {
          width: 100%;
          height: 300px;
          object-fit: cover;
          display: block;
        }

        .game-info {
          padding: 15px;
          background: #000;
        }

        .game-name {
          color: #fff;
          font-size: 0.65rem;
          margin-bottom: 10px;
        }

        .game-console {
          color: #00ffff;
          font-size: 0.5rem;
        }

        .footer {
          text-align: center;
          margin-top: 50px;
          color: #666;
          font-size: 0.5rem;
        }

        /* Modal */
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 900px;
          background: #000;
          border: 4px solid #fff;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 2px solid #333;
        }

        .modal-title {
          color: #fff;
          font-size: 0.7rem;
        }

        .close-btn {
          background: #ff0040;
          color: #fff;
          border: none;
          padding: 10px 15px;
          font-family: 'Press Start 2P', cursive;
          font-size: 0.5rem;
          cursor: pointer;
        }

        .game-frame {
          width: 100%;
          height: 500px;
          border: none;
        }

        .controls {
          padding: 15px;
          color: #888;
          font-size: 0.45rem;
          text-align: center;
          border-top: 2px solid #333;
        }
      `}</style>

      <div className="games-page">
        <div className="content">
          <a href="/dashboard" className="back-btn">← VOLVER</a>

          <header className="header">
            <h1 className="title">RINCON DE RELAJO</h1>
            <p className="subtitle">
              Porque sabemos que el trabajo agota... <span className="heart">♥</span>
            </p>
          </header>

          <div className="games-grid">
            {games.map((game) => (
              <div
                key={game.id}
                className="game-card"
                onClick={() => setSelectedGame(game)}
              >
                <img
                  src={game.cover}
                  alt={game.name}
                  className="game-cover"
                />
                <div className="game-info">
                  <h3 className="game-name">{game.name}</h3>
                  <span className="game-console">{game.console} - {game.year}</span>
                </div>
              </div>
            ))}
          </div>

          <footer className="footer">
            Controles: Flechas = Mover | Z = A | X = B | Enter = Start
          </footer>
        </div>

        {selectedGame && (
          <div className="modal" onClick={() => setSelectedGame(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{selectedGame.name}</h2>
                <button className="close-btn" onClick={() => setSelectedGame(null)}>
                  CERRAR
                </button>
              </div>
              <iframe
                src={selectedGame.url}
                className="game-frame"
                title={selectedGame.name}
                allowFullScreen
              />
              <div className="controls">
                Flechas = Mover | Z = A | X = B | Enter = Start | Shift = Select
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GamesPage;

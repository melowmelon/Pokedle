import React, { useState, useEffect } from "react";
import "./styles.css";

const MAX_ATTEMPTS = 6;

// Keyboard layout matching the image
const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"]
];

const Wordle = () => {
  const [secretWord, setSecretWord] = useState("");
  const [loading, setLoading] = useState(true);
  const [guesses, setGuesses] = useState(Array(MAX_ATTEMPTS).fill(""));
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");
  const [revealingRow, setRevealingRow] = useState(-1);
  const [pokemonGuesses, setPokemonGuesses] = useState([]);
  const [validPokemon, setValidPokemon] = useState({});
  const [pokemonInfo, setPokemonInfo] = useState(null); // Added for storing type and generation
  const [winningGuess, setWinningGuess] = useState(null); // Track the winning guess
  
  // Fetch a random Pokemon on component mount
  useEffect(() => {
    fetchRandomPokemon();
  }, []);
  
  // Fetch a list of valid Pokemon names
  const fetchValidPokemon = async () => {
    try {
      // We'll fetch a list of the first 1000 Pokémon
      const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1000");
      const data = await response.json();
      
      // Create a map for quick lookups of all Pokemon
      const pokemonMap = {};
      data.results.forEach(pokemon => {
        const name = pokemon.name.toUpperCase();
        pokemonMap[name] = pokemon.url;
      });
      
      setValidPokemon(pokemonMap);
      return pokemonMap;
    } catch (error) {
      console.error("Error fetching Pokémon list:", error);
      return {};
    }
  };
  
  // Fetch detailed Pokemon information including type and generation
  const fetchPokemonDetails = async (pokemonName) => {
    const originalName = pokemonName.toUpperCase(); // Store the original uppercase name
    try {
      // First fetch basic Pokémon data
      const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`);
      const pokemonData = await pokemonResponse.json();
      
      // Then fetch species data to get generation
      const speciesResponse = await fetch(pokemonData.species.url);
      const speciesData = await speciesResponse.json();
      
      return {
        name: originalName, // Use the original uppercase name
        types: pokemonData.types.map(t => t.type.name),
        generation: speciesData.generation.name.replace('-', ' ').toUpperCase(),
        sprite: pokemonData.sprites.front_default,
        officialArt: pokemonData.sprites.other['official-artwork'].front_default
      };
    } catch (error) {
      console.error(`Error fetching details for ${pokemonName}:`, error);
      return {
        name: originalName, // Use the original uppercase name
        types: ["unknown"],
        generation: "unknown",
        sprite: null,
        officialArt: null
      };
    }
  };
  
  // Fetch a random Pokemon name
  const fetchRandomPokemon = async () => {
    setLoading(true);
    try {
      const pokemonMap = Object.keys(validPokemon).length > 0 ? 
        validPokemon : await fetchValidPokemon();
      
      // Get all Pokemon names
      const allPokemon = Object.keys(pokemonMap);
      
      if (allPokemon.length === 0) {
        setMessage("No Pokémon found!");
        setLoading(false);
        return;
      }
      
      // Select a random Pokémon
      const randomPokemon = allPokemon[Math.floor(Math.random() * allPokemon.length)];
      setSecretWord(randomPokemon);
      
      // Fetch and store additional info about the secret Pokémon
      const details = await fetchPokemonDetails(randomPokemon);
      setPokemonInfo(details);
      
      console.log("Secret Pokémon:", randomPokemon, details); // For debugging
      setLoading(false);
    } catch (error) {
      console.error("Error fetching random Pokémon:", error);
      setMessage("Error loading Pokémon!");
      setLoading(false);
    }
  };
  
  // Fetch Pokémon sprite by name
  const fetchPokemonSprite = async (pokemonName) => {
    try {
      // Reuse our detailed fetch function
      return await fetchPokemonDetails(pokemonName);
    } catch (error) {
      console.error(`Error fetching sprite for ${pokemonName}:`, error);
      return {
        name: pokemonName, // Ensure we keep the original name
        types: ["unknown"],
        generation: "unknown",
        sprite: null,
        officialArt: null
      };
    }
  };
  
  // Check if a Pokémon name is valid
  const isPokemonValid = (name) => {
    return Object.keys(validPokemon).includes(name.toUpperCase());
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    if (gameOver || revealingRow >= 0 || loading) return;
    setCurrentGuess(e.target.value.toUpperCase());
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (gameOver || revealingRow >= 0 || loading) return;
    submitGuess();
  };
  
  const submitGuess = async () => {
    if (currentGuess.trim() === "") {
      setMessage("Please enter a Pokemon name");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    
    // Check if the guess is a valid Pokémon
    if (!isPokemonValid(currentGuess)) {
      setMessage("Not a valid Pokémon!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    
    // Update guesses array
    const newGuesses = [...guesses];
    newGuesses[currentAttempt] = currentGuess;
    setGuesses(newGuesses);
    
    // Fetch Pokémon sprite and add to guesses
    const pokemonData = await fetchPokemonSprite(currentGuess);
    setPokemonGuesses(prev => [...prev, pokemonData]);
    
    // Set revealing state to trigger animations
    setRevealingRow(currentAttempt);
    
    // Delayed check for win/loss after animation completes
    setTimeout(() => {
      if (currentGuess === secretWord) {
        setWinningGuess(currentGuess); // Store the winning guess
        setGameOver(true);
        setMessage("You won!");
      } else if (currentAttempt === MAX_ATTEMPTS - 1) {
        setGameOver(true);
        setMessage(`Game over! The Pokémon was ${secretWord}`);
      } else {
        setCurrentAttempt(currentAttempt + 1);
      }
      
      setCurrentGuess("");
      setRevealingRow(-1);
    }, 1500); // Time for all animations to complete
  };

  // Get the appropriate class for keyboard keys
  const getKeyClass = (key) => {
    // Skip for special keys
    if (key === "ENTER" || key === "DELETE") return "key-special";
    
    // Check if key is in any submitted guesses
    for (let i = 0; i < currentAttempt; i++) {
      const guess = guesses[i];
      for (let j = 0; j < guess.length; j++) {
        if (guess[j] === key) {
          if (secretWord[j] === key) return "key-correct";
          if (secretWord.includes(key)) return "key-present";
          return "key-absent";
        }
      }
    }
    return "key";
  };

  // Get class for a specific tile
  const getTileClass = (guess, index, isCurrentGuess = false) => {
    // Base classes
    let classes = "tile";
    
    // If this index is beyond the guess length, it's an empty tile
    if (index >= guess.length) {
      return "tile tile-empty";
    }
    
    if (isCurrentGuess) {
      classes += " tile-filled";
      return classes;
    }
    
    const letter = guess[index];
    
    // For submitted guesses
    if (secretWord[index] === letter) {
      classes += " tile-correct";
    } else if (secretWord.includes(letter)) {
      classes += " tile-present";
    } else {
      classes += " tile-absent";
    }
    
    // Currently revealing row animation
    if (revealingRow >= 0 && guess === guesses[revealingRow]) {
      classes += " tile-reveal";
      classes += ` tile-reveal-${index}`; // Use index for staggered reveal
      
      // Add transition classes for gradual color transformation
      classes += " tile-transition";
    }
    
    return classes;
  };

  // Render the fixed number of tiles based on secret word length
  const renderTiles = (guess, isCurrentGuess = false) => {
    const tiles = [];
    const wordLength = secretWord.length;
    
    for (let i = 0; i < wordLength; i++) {
      tiles.push(
        <div 
          key={i} 
          className={getTileClass(guess, i, isCurrentGuess)}
          style={{ 
            transitionDelay: `${i * 50}ms`,
            animationDelay: `${i * 50}ms` 
          }}
        >
          {i < guess.length ? guess[i] : ""}
        </div>
      );
    }
    
    return tiles;
  };

  if (loading) {
    return <div className="loading">Loading Pokémon...</div>;
  }

  return (
    <div className="game-container">
      <div className="pokemon-sidebar">
        <h2>Guessed Pokémon</h2>
        <div className="pokemon-list">
          {pokemonGuesses.map((pokemon, index) => (
            <div key={index} className="pokemon-card">
              {pokemon.sprite && (
                <img 
                  src={pokemon.sprite} 
                  alt={pokemon.name} 
                  className="pokemon-sprite" 
                />
              )}
              <div className="pokemon-name">{pokemon.name}</div>
              <div className="pokemon-types">
                {pokemon.types.map((type, i) => (
                  <span key={i} className={`type-badge ${type}`}>{type}</span>
                ))}
              </div>
              <div className="pokemon-generation">{pokemon.generation}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="wordle-container">
        <div className="wordle">
          <div className="header">
            <h1>POKEDLE</h1>
          </div>
          
          {message && <div className="message">{message}</div>}
          
          {/* Pokémon Hint Section */}
          {pokemonInfo && !gameOver && currentAttempt > 0 && (
            <div className="pokemon-hints">
              <div className="hint-box">
                <div className="hint-title">TYPE HINT</div>
                <div className="hint-content">
                  {pokemonInfo.types.map((type, i) => (
                    <span key={i} className={`type-badge ${type}`}>{type}</span>
                  ))}
                </div>
              </div>
              <div className="hint-box">
                <div className="hint-title">GENERATION</div>
                <div className="hint-content">{pokemonInfo.generation}</div>
              </div>
              {/* Name Length Hint */}
              <div className="hint-box">
                <div className="hint-title">NAME LENGTH</div>
                <div className="hint-content">{secretWord.length} letters</div>
              </div>
            </div>
          )}
          
          {/* Input form */}
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={currentGuess}
              onChange={handleInputChange}
              placeholder="Enter Pokemon name"
              disabled={gameOver || revealingRow >= 0 || loading}
              className="pokemon-input"
              autoFocus
            />
            <button 
              type="submit" 
              className="submit-btn"
              disabled={gameOver || revealingRow >= 0 || loading || !currentGuess.trim()}
            >
              Guess
            </button>
          </form>
          
          {/* Current guess visualization - Only show if not game over */}
          {currentGuess && !gameOver && (
            <div className="current-guess-container">
              <div className="row">
                {renderTiles(currentGuess, true)}
              </div>
            </div>
          )}
          
          {/* Previous guesses */}
          <div className="guesses-container">
            {guesses.slice(0, currentAttempt).map((guess, rowIndex) => (
              <div key={rowIndex} className="row">
                {renderTiles(guess)}
              </div>
            ))}
          </div>
          
          {/* Display winning guess if game is over due to winning */}
          {gameOver && winningGuess && (
            <div className="winning-guess-container">
              <div className="row winning-row">
                {renderTiles(winningGuess)}
              </div>
            </div>
          )}
          
          <div className="keyboard">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="keyboard-row">
                {row.map((key) => (
                  <button
                    key={key}
                    className={getKeyClass(key)}
                    onClick={() => {
                      if (key === "DELETE") {
                        setCurrentGuess(prev => prev.slice(0, -1));
                      } else if (key === "ENTER") {
                        submitGuess();
                      } else {
                        setCurrentGuess(prev => prev + key);
                      }
                    }}
                    disabled={revealingRow >= 0 || gameOver || loading}
                  >
                    {key === "DELETE" ? "⌫" : key}
                  </button>
                ))}
              </div>
            ))}
          </div>
          
          {gameOver && (
            <div className="game-over-container">
              <div className="pokemon-result">
                {pokemonInfo && (
                  <>
                    <img 
                      src={pokemonInfo.officialArt || pokemonInfo.sprite} 
                      alt={secretWord} 
                      className="result-pokemon-image" 
                    />
                    <div className="result-pokemon-info">
                      <h3>{secretWord}</h3>
                      <div className="pokemon-types">
                        {pokemonInfo.types.map((type, i) => (
                          <span key={i} className={`type-badge ${type}`}>{type}</span>
                        ))}
                      </div>
                      <div className="pokemon-generation">{pokemonInfo.generation}</div>
                    </div>
                  </>
                )}
              </div>
              <button className="new-game-btn" onClick={() => {
                setGameOver(false);
                setCurrentAttempt(0);
                setGuesses(Array(MAX_ATTEMPTS).fill(""));
                setPokemonGuesses([]);
                setWinningGuess(null);
                fetchRandomPokemon();
              }}>
                New Game
              </button>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default Wordle;


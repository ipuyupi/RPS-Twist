# RPS Twist by B11109013 黃詩雅

A Rock-Paper-Scissors game with fun twists.

## Prompt

I want to make a rock paper scissor game with a little twist
- Each round can deal damage, if you win you get streaks
- After 2 win streaks you get a shield card that you can use, after you use it the card resets and you need to win again to get it back
- The bot slightly biases against user's most common recent move
- If user pick move within 5 seconds gain 10% more score pts
- Make levels : easy, medium, and hard mode
- Play until health bar reaches 0 and the game resets

## Quick Start

Requirements: Node 18+

1. Install
```
npm install
```
2. Develop
```
npm run dev
```
Open the URL shown (usually `http://localhost:5173`).

3. Build (optional)
```
npm run build && npm run preview
```

## How to Play

- Pick one of three cards: Rock, Paper, or Scissor.
- Each win deals damage to the opponent. Reduce the opponent's HP to 0 to win.
- Draws deal no damage.
- Win streaks: After 2 consecutive wins you earn a Shield.
  - Click Shield to arm it. The next damage you take is halved, then it resets.
- AI bias: The AI slightly favors the counter to your most common recent move.
- Time bonus: Pick within 5 seconds to earn +10% score (see the timer bar).
- Difficulty: Easy / Medium / Hard affect damage and AI bias.

## UI Notes

- Your HP (green) and AI HP (red) are shown above the cards.
- Last moves for you and the AI appear under the cards.
- A big banner will appear when you win/lose; the match auto-restarts shortly after.
- High Score and the number of rounds are saved locally in your browser.

## Controls

- Click or tap a card to play.
- Click Shield (after 2-win streak) to arm it.
- Click Replay to reset the match.

## Tech

- Vite + React + Tailwind CSS
- react-icons for icons

## Deploy (optional)

- Netlify/Vercel: build `npm run build`, output `client/dist`.
- GitHub Pages or any static host: serve the `client/dist` folder.

## License

MIT

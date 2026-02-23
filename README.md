# pi-slot-machine 🎰

A [pi](https://github.com/badlogic/pi) extension that spins a slot machine overlay every time you send a prompt. If all 3 reels match, you hit the **JACKPOT** with a flashy explosion! 💥

## Install

```bash
pi install npm:pi-slot-machine
```

Reload pi with `/reload` or restart it. That's it — every prompt now comes with a spin!

## What it does

- **3 spinning reels** with emoji symbols (🍒🍋🔥⭐💎🎲🍀💰) that slow down and stop one by one
- **~18% chance of JACKPOT** — all 3 reels match
- **On win:** Flashing borders, sparkle explosions, and a big "YOU HIT THE JACKPOT!" banner
- **On loss:** "Better luck next time!" (or "So close!" when 2 match)
- **Press Enter, Esc, or Space** to skip the animation at any time
- Renders as a **centered overlay** on top of your conversation

## Commands

| Command | Description |
|---------|-------------|
| `/rigged` | Toggle always-win mode 💰 |

## Flags

| Flag | Description |
|------|-------------|
| `--rigged` | Start pi with always-win mode enabled |

```bash
# Always win
pi --rigged
```

## License

MIT

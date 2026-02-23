/**
 * 🎰 Slot Machine Extension for pi
 *
 * Spins a slot machine overlay every time you send a prompt.
 * 3 reels with emoji symbols spin and stop one by one.
 * If all 3 match → JACKPOT with a flashy explosion! 💥
 *
 * Commands:
 *   /rigged  - Toggle always-win mode
 *
 * Flags:
 *   --rigged - Start with always-win mode enabled
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";

const SYMBOLS = ["🍒", "🍋", "🔥", "⭐", "💎", "🎲", "🍀", "💰"];
const SPARKLES = ["✨", "🌟", "💫", "⚡", "💥", "🎉", "🎊", "🎆", "🎇"];

const TICK_MS = 40;
const REEL_STOPS = [20, 36, 54];
const CLOSE_LOSE = 72;
const CLOSE_WIN = 140;
const WIN_CHANCE = 0.18;

const ri = (n: number) => Math.floor(Math.random() * n);

class SlotMachineComponent {
	private pos: number[];
	private finalPos: number[];
	private locked: boolean[];
	private isJackpot: boolean;
	private tick = 0;
	private interval: ReturnType<typeof setInterval> | null = null;
	private closed = false;

	private cW = 0;
	private cV = -1;
	private cL: string[] = [];
	private v = 0;

	private tui: { requestRender: () => void };
	private onDone: () => void;

	constructor(tui: { requestRender: () => void }, onDone: () => void, forceWin = false) {
		this.tui = tui;
		this.onDone = onDone;
		this.locked = [false, false, false];
		this.pos = [ri(8), ri(8), ri(8)];

		this.isJackpot = forceWin || Math.random() < WIN_CHANCE;
		if (this.isJackpot) {
			const s = ri(SYMBOLS.length);
			this.finalPos = [s, s, s];
		} else {
			do {
				this.finalPos = [ri(8), ri(8), ri(8)];
			} while (this.finalPos[0] === this.finalPos[1] && this.finalPos[1] === this.finalPos[2]);
		}

		this.interval = setInterval(() => {
			this.step();
			this.v++;
			this.tui.requestRender();
		}, TICK_MS);
	}

	private step() {
		this.tick++;
		for (let i = 0; i < 3; i++) {
			if (this.locked[i]) continue;
			const left = REEL_STOPS[i] - this.tick;
			if (left <= 0) {
				this.locked[i] = true;
				this.pos[i] = this.finalPos[i];
			} else if (left <= 3) {
				if (this.tick % 4 === 0) this.pos[i] = (this.pos[i] + 1) % 8;
			} else if (left <= 8) {
				if (this.tick % 2 === 0) this.pos[i] = (this.pos[i] + 1) % 8;
			} else {
				this.pos[i] = (this.pos[i] + 1) % 8;
			}
		}
		const closeAt = this.isJackpot ? CLOSE_WIN : CLOSE_LOSE;
		if (this.tick >= closeAt) this.close();
	}

	handleInput(data: string) {
		if (data === "\x1b" || data === "\r" || data === "\n" || data === " ") {
			this.close();
		}
	}

	private close() {
		if (this.closed) return;
		this.closed = true;
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.onDone();
	}

	invalidate() {
		this.cW = 0;
	}

	render(width: number): string[] {
		if (this.cW === width && this.cV === this.v) return this.cL;

		const allStopped = this.locked.every(Boolean);

		const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
		const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
		const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
		const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;
		const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
		const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
		const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
		const bgYellow = (s: string) => `\x1b[30;43m${s}\x1b[0m`;
		const bgRed = (s: string) => `\x1b[97;41m${s}\x1b[0m`;
		const bgMagenta = (s: string) => `\x1b[97;45m${s}\x1b[0m`;

		const flash = this.isJackpot && allStopped;
		const flashPhase = this.tick % 6;
		const borderFn = flash ? (flashPhase < 2 ? yellow : flashPhase < 4 ? magenta : cyan) : dim;

		const innerW = width - 2;

		const ctr = (content: string, cvw: number) => {
			const sp = Math.max(0, innerW - cvw);
			const l = Math.floor(sp / 2);
			const r = sp - l;
			return borderFn("│") + " ".repeat(l) + content + " ".repeat(r) + borderFn("│");
		};
		const empty = () => ctr("", 0);
		const hr = (a: string, z: string) => borderFn(a + "─".repeat(innerW) + z);

		const sym = (reel: number, off: number) => SYMBOLS[((this.pos[reel] + off) % 8 + 8) % 8];

		const lines: string[] = [];

		lines.push(hr("╭", "╮"));
		lines.push(empty());

		// Title
		const titleRaw = "🎰  S L O T   M A C H I N E  🎰";
		const titleVW = visibleWidth(titleRaw);
		const styledTitle = flash
			? flashPhase < 3
				? bold(yellow(titleRaw))
				: bold(magenta(titleRaw))
			: bold(titleRaw);
		lines.push(ctr(styledTitle, titleVW));
		lines.push(empty());

		// Reel top borders
		const reelBorderTop = dim("┌──────┐") + "  " + dim("┌──────┐") + "  " + dim("┌──────┐");
		lines.push(ctr(reelBorderTop, visibleWidth(reelBorderTop)));

		// Reel rows
		for (let off = -1; off <= 1; off++) {
			let row = "";
			for (let r = 0; r < 3; r++) {
				if (r > 0) row += "  ";
				const e = sym(r, off);
				if (off === 0) {
					const lockColor = flash
						? flashPhase < 2
							? yellow
							: flashPhase < 4
								? magenta
								: cyan
						: yellow;
					const aL = this.locked[r] ? lockColor("▸") : dim("▸");
					const aR = this.locked[r] ? lockColor("◂") : dim("◂");
					row += dim("│") + " " + aL + e + aR + " " + dim("│");
				} else {
					row += dim("│") + "  " + e + "  " + dim("│");
				}
			}
			lines.push(ctr(row, visibleWidth(row)));
		}

		// Reel bottom borders
		const reelBorderBot = dim("└──────┘") + "  " + dim("└──────┘") + "  " + dim("└──────┘");
		lines.push(ctr(reelBorderBot, visibleWidth(reelBorderBot)));
		lines.push(empty());

		// Status / Explosion
		if (this.isJackpot && allStopped) {
			const et = this.tick - REEL_STOPS[2];

			const jpRaw = "🎉🎉🎉  J A C K P O T !!!  🎉🎉🎉";
			const jpVW = visibleWidth(jpRaw);
			const jpStyled =
				flashPhase < 2
					? bold(yellow(jpRaw))
					: flashPhase < 4
						? bold(magenta(jpRaw))
						: bold(cyan(jpRaw));
			lines.push(ctr(jpStyled, jpVW));

			if (et > 3) {
				const winEmoji = SYMBOLS[this.finalPos[0]];
				const winRow = [winEmoji, winEmoji, winEmoji, winEmoji, winEmoji].join("  ");
				const winVW = visibleWidth(winRow);
				const winStyled = et % 4 < 2 ? winRow : bold(winRow);
				lines.push(ctr(winStyled, winVW));
			}

			const maxSparkleRows = Math.min(Math.floor(et / 7), 5);
			for (let sr = 0; sr < maxSparkleRows; sr++) {
				const count = Math.min(2 + sr + Math.floor(et / 12), 12);
				let sparkRow = "";
				for (let i = 0; i < count; i++) {
					const idx = (this.tick * 3 + i * 7 + sr * 13) % SPARKLES.length;
					if (i > 0) sparkRow += " ";
					sparkRow += SPARKLES[idx];
				}
				const sVW = visibleWidth(sparkRow);
				if (sVW <= innerW - 2) {
					const colorFn = [yellow, magenta, cyan, red, green][sr % 5];
					lines.push(ctr(colorFn(sparkRow), sVW));
				}
			}

			if (et > 25) {
				lines.push(empty());
				const bannerRaw = "  💰 YOU HIT THE JACKPOT! 💰  ";
				const bannerVW = visibleWidth(bannerRaw);
				lines.push(ctr(bgYellow(bold(bannerRaw)), bannerVW));
			}
		} else if (allStopped) {
			const a = this.finalPos[0],
				b = this.finalPos[1],
				c = this.finalPos[2];
			const twoMatch = a === b || b === c || a === c;
			const msgRaw = twoMatch ? "So close! 😬" : "Better luck next time! 😅";
			lines.push(ctr(dim(msgRaw), visibleWidth(msgRaw)));
		} else {
			const spinFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
			const spinner = yellow(spinFrames[this.tick % spinFrames.length]);
			const dots = ".".repeat((this.tick % 3) + 1).padEnd(3);
			const spinText = " Spinning" + dots + "  ";
			const spinVW = visibleWidth(spinText) + 1;
			lines.push(ctr(spinner + yellow(spinText), spinVW));
		}

		lines.push(empty());

		const hintRaw = "Press Enter or Esc to skip";
		lines.push(ctr(dim(hintRaw), visibleWidth(hintRaw)));

		lines.push(hr("╰", "╯"));

		this.cL = lines;
		this.cW = width;
		this.cV = this.v;
		return lines;
	}

	dispose() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}
}

export default function (pi: ExtensionAPI) {
	let rigged = false;

	pi.registerFlag("rigged", {
		description: "Slot machine always wins (dev mode)",
		type: "boolean",
		default: false,
	});

	pi.registerCommand("rigged", {
		description: "Toggle rigged slot machine (always win)",
		handler: async (_args, ctx) => {
			rigged = !rigged;
			ctx.ui.notify(rigged ? "🎰 Slot machine RIGGED! 💰" : "🎰 Slot machine back to normal", "info");
		},
	});

	pi.on("before_agent_start", async (_event, ctx) => {
		if (!rigged) rigged = !!pi.getFlag("rigged");
		if (!ctx.hasUI) return;

		// Don't await — let the agent proceed while the slot machine plays
		ctx.ui.custom<void>(
			(tui, _theme, _kb, done) => {
				return new SlotMachineComponent(tui, () => done(undefined), rigged);
			},
			{
				overlay: true,
				overlayOptions: {
					anchor: "center",
					width: 44,
					minWidth: 44,
				},
			},
		);
	});
}

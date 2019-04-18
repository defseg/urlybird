const POINT_LOOKUPS = [
	[0, 0], // 1 4
	[1, 0], // 2 5
	[2, 0], // 3 6
	[0, 1], // 7 8
	[1, 1], 
	[2, 1], 
	[3, 0],
	[3, 1]
]

const Y_DIM = 4;
const BRIXEL_Y_DIM = 4;
const BRIXEL_X_DIM = 2; // maybe there'll be 4x4 grid characters someday?

class BrixelScreen {
	constructor (x_dim) {
		this.y_dim = Y_DIM;
		this.x_dim = x_dim;

		this.num_brixels = Math.ceil(this.x_dim / BRIXEL_X_DIM);
		this.arr = new Array(this.y_dim * this.x_dim).fill(false);
	}

	brixel (num) {
		if (num < 0 || num >= this.num_brixels) throw new Error('Brixel out of bounds');
		let x_offset = num * BRIXEL_X_DIM;

		let bin = new Array(this.y_dim * BRIXEL_X_DIM);
		for (var p_idx = 0; p_idx < POINT_LOOKUPS.length; p_idx++) { // could maybe be a map but it'd be slower I think
			let [p_offset_y, p_offset_x] = POINT_LOOKUPS[p_idx];     // if you're reading this from HN, I wrote this in an hour before bed
			let p_y = p_offset_y;                                    
			let p_x = p_offset_x + x_offset;                         
			bin[bin.length - p_idx - 1] = this.point(p_y, p_x); // low-endian
		}

		bin = bin.map(x => +x);
		bin = parseInt(bin.join(''), 2);

		return String.fromCharCode(0x2800 + bin);
	}

	point (y, x) {
		if (x == this.x_dim) return false; // in case x_dim is odd
		return this.arr[y * this.x_dim + x];
	}

	draw (arr) {
		this.arr = arr;

		let display = '';

		for (let b_idx = 0; b_idx < this.num_brixels; b_idx++) {
			display += this.brixel(b_idx);
		}
		return display;
	}
}

const GAME_X = 40;
const HURDLES = [ // should have one column of blank space between the components, otherwise it looks janky
	{ before: 0, after: 0, odds: 4, shape: [[0,0,0,1]] },
	{ before: 0, after: 0, odds: 5, shape: [[0,0,1,1]] },
	{ before: 2, after: 1, odds: 3, shape: [[0,1,1,1]] },
	{ before: 1, after: 2, odds: 1, shape: [[1,0,0,1]] },
	{ before: 0, after: 2, odds: 2, shape: [[0,0,1,1],[0,0,0,0],[0,0,1,1]] },
	{ before: 5, after: 5, odds: 2, shape: [[0,0,0,1],[0,0,0,0],[1,0,0,0],[0,0,0,0],[0,0,0,1]] },
]
const JUMP_HEIGHTS = [0,1,2,3,3,3,2,1];

// compute the actual odds
let total_odds = 0;
for (let h of HURDLES) {
	total_odds += h.odds;
}
let cumulative_odds = 0;
for (let h of HURDLES) {
	cumulative_odds += (h.odds / total_odds);
	h.odds = cumulative_odds;
}
function roll_hurdle() {
	const roll = Math.random();
	for (let h_idx = 0; h_idx < HURDLES.length; h_idx++) {
		if (roll < HURDLES[h_idx].odds) {
			return h_idx;
		}
	}
}

class Game {
	constructor () {
		this.min_interval = 7;

		this.screen = new BrixelScreen(GAME_X);
		this.init();
	}

	init () {
		this.jumping = false;
		this.jump_time = 0;
		this.x_progress = -39;
		this.time_since_last_hurdle = 1000;
		this.last_hurdle = 2; // good enough default, don't want to handle none
		this.lost = false;
		this.time_since_lost = 0; // don't mash out of the score screen
		this.displayed_loss = false;
		this.grid = new Array(GAME_X * Y_DIM).fill(false);
		this.next_hurdle = null;
	}

	input () {
		if (!this.lost) {
			this.jump();
			return;
		}

		if (this.time_since_lost < 3) return;
		this.init();
	}

	jump () {
		if (this.jumping) return;
		this.jumping = true;
	}

	step () {
		if (this.lost) {
			this.time_since_lost++;
			if (!this.displayed_loss) {
				location.hash += `Score:⠀${this.x_progress}⠀-⠀Press⠀any⠀key⠀to⠀play⠀again`; // using U+2800 - can't have whitespace in hashes
				let scoreEl = document.getElementById('highscore')
				if (this.x_progress > +(scoreEl.innerText)) scoreEl.innerText = this.x_progress;
				this.displayed_loss = true;
			}
			return
		};

		if (this.jumping) {
			this.jump_time++;
			if (this.jump_time >= JUMP_HEIGHTS.length) {
				this.jumping = false;
				this.jump_time = 0;
			}
		}

		this.time_since_last_hurdle++;

		this.move_grid();
		
		var grid_with_player = this.grid.slice();
		grid_with_player[this.player_loc()] = true;

		location.hash = this.screen.draw(grid_with_player)
	}

	player_y () {
		if (!this.jumping) return 0;
		return JUMP_HEIGHTS[this.jump_time];
	}

	player_loc () {
		return (3 - this.player_y()) * GAME_X;
	}

	add_hurdle(hurdle) {
		this.time_since_last_hurdle = 0;
		this.last_hurdle = hurdle;
		this.next_hurdle = false;
		this.add_column(HURDLES[this.last_hurdle], 0);
	}

	add_column(hurdle, idx) {
		this.grid[    GAME_X - 1] = hurdle.shape[idx][0];
		this.grid[2 * GAME_X - 1] = hurdle.shape[idx][1];
		this.grid[3 * GAME_X - 1] = hurdle.shape[idx][2];
		this.grid[4 * GAME_X - 1] = hurdle.shape[idx][3]; 	
	}

	add_blank_col() {
		this.grid[    GAME_X - 1] = false;
		this.grid[2 * GAME_X - 1] = false;
		this.grid[3 * GAME_X - 1] = false;
		this.grid[4 * GAME_X - 1] = false;
	}

	can_place_hurdle(hurdle = null) {
		let hurdle_before = (hurdle === null) ? 0 : HURDLES[hurdle].before; 
		let res = this.time_since_last_hurdle - (this.min_interval + HURDLES[this.last_hurdle].after + HURDLES[hurdle].before);
		return res > 0;
	}

	move_grid () {
		for (let x = 0; x < GAME_X - 1; x++) {
			for (let y = 0; y < Y_DIM; y++) {
				this.grid[y * GAME_X + x] = this.grid[y * GAME_X + x + 1];
			}
		}

		if (this.grid[this.player_loc()]) {
			this.lost = true;
			return;
		}

		this.x_progress++;

		// if we just placed the first part of a hurdle, place the second part
		if (this.time_since_last_hurdle < HURDLES[this.last_hurdle].shape.length) {
			this.add_column(HURDLES[this.last_hurdle], this.time_since_last_hurdle);
			return;
		}
		// if we scheduled a hurdle to be placed, see if we should place it
		if (this.next_hurdle) {
			if (this.can_place_hurdle(this.next_hurdle)) {
				this.add_hurdle(this.next_hurdle);
			} else {
				this.add_blank_col();
			}
			return;
		}
		
		// now, do we want to generate a new hurdle? let's see if we *don't*
		let roll = 0;
		let roll_tmp = .5;
		for (var i = 0; i < this.time_since_last_hurdle - this.min_interval; i++) {
			roll += roll_tmp;
			roll_tmp /= 1.5;
		}
		roll /= 1.5;
		if (Math.random() > roll) {
			this.add_blank_col();
			return;
		}

		let rolled_hurdle = roll_hurdle();
		let hurdle = HURDLES[rolled_hurdle];

		if (!this.can_place_hurdle(rolled_hurdle)) {
			this.next_hurdle = rolled_hurdle;
			this.add_blank_col();
			return;
		}

		this.add_hurdle(rolled_hurdle);
	}
}

var g = new Game();
window.setInterval(g.step.bind(g), 100);
document.onkeydown = g.input.bind(g);
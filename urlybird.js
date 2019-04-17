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
const HURDLES = [
	[1,0,0,1],
	[0,0,0,1],
	[0,0,1,1],
	[0,1,1,1]
]
const HURDLE_SPACING = [2, -1, 0, 1];
const JUMP_HEIGHTS = [0,1,2,3,3,3,2,1];

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
		this.displayed_loss = false;
		this.grid = new Array(GAME_X * Y_DIM).fill(false);
	}

	input () {
		if (!this.lost) {
			this.jump();
			return;
		}

		this.init();
	}

	jump () {
		if (this.jumping) return;
		this.jumping = true;
	}

	step () {
		if (this.lost) {
			if (!this.displayed_loss) {
				location.hash += `Score:⠀${this.x_progress}⠀-⠀Press⠀any⠀key⠀to⠀play⠀again`; // using U+2800 - can't have whitespace in hashes
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
		
		// now, do we want to generate a new hurdle? let's see if we *don't*
		let roll = 0;
		let roll_tmp = .5;
		for (var i = 0; i < this.time_since_last_hurdle - this.min_interval - HURDLE_SPACING[this.last_hurdle]; i++) {
			roll += roll_tmp;
			roll_tmp /= 1.5;
		}
		roll /= 1.5;
		if (Math.random() > roll) {
			this.grid[    GAME_X - 1] = false;
			this.grid[2 * GAME_X - 1] = false;
			this.grid[3 * GAME_X - 1] = false;
			this.grid[4 * GAME_X - 1] = false;
			return;
		}

		this.time_since_last_hurdle = 0;

		let hroll = Math.random();
		let rolled_hurdle = 3;
		if (hroll < 0.25) {
			rolled_hurdle = 0;
		} else if (hroll < 0.5) {
			rolled_hurdle = 1;
		} else if (hroll < 0.75) {
			rolled_hurdle = 2;
		} 
		let hurdle = HURDLES[rolled_hurdle];
		this.last_hurdle = rolled_hurdle;

		this.spacing_modifier = HURDLE_SPACING[rolled_hurdle];

		this.grid[    GAME_X - 1] = hurdle[0];
		this.grid[2 * GAME_X - 1] = hurdle[1];
		this.grid[3 * GAME_X - 1] = hurdle[2];
		this.grid[4 * GAME_X - 1] = hurdle[3]; 
	}
}

var g = new Game();
window.setInterval(g.step.bind(g), 100);
document.onkeydown = g.input.bind(g);
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

class Game {
	constructor () {
		this.min_interval = 7;

		this.HURDLES = [
			[1,0,0,1],
			[0,0,0,1],
			[0,0,1,1],
			[0,1,1,1]
		]
		
		this.jump_heights = [0,0,1,2,3,3,3,2,1]; // first two are discarded
		this.screen = new BrixelScreen(GAME_X);
		this.init();
	}

	init () {
		this.jumping = 0;
		this.x_progress = -39;
		this.time_since_last_hurdle = 1000;
		this.spacing_modifier = 0; // -1: closer, 1: further, 0: normal
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
		this.jumping = 1;
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
			this.jumping++;
			if (this.jumping >= this.jump_heights.length) this.jumping = 0;
		}

		this.time_since_last_hurdle++;

		this.move_grid();
		
		var grid_with_player = this.grid.slice();
		grid_with_player[this.player_loc()] = true;

		location.hash = this.screen.draw(grid_with_player)
	}

	player_y () {
		if (this.jumping === 0) return 0;
		return this.jump_heights[this.jumping];
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
		if ((this.spacing_modifier === -1 && this.time_since_last_hurdle < this.min_interval - 1 + Math.random() * 4) ||
			(this.spacing_modifier ===  0 && this.time_since_last_hurdle < this.min_interval     + Math.random() * 5) ||
		    (this.spacing_modifier ===  1 && this.time_since_last_hurdle < this.jump_heights.length * 2)) {
			this.grid[    GAME_X - 1] = false;
			this.grid[2 * GAME_X - 1] = false;
			this.grid[3 * GAME_X - 1] = false;
			this.grid[4 * GAME_X - 1] = false;
			return;
		}

		this.time_since_last_hurdle = 0;

		let dice_roll = Math.floor(Math.random() * 6 + Math.random() * 6 + Math.random() * 6 + Math.random() * 6)
		let hurdle = this.HURDLES[Math.round(dice_roll / 6) - 1];

		this.spacing_modifier = [1, -1, 0, 1][Math.round(dice_roll / 6)];

		this.grid[    GAME_X - 1] = hurdle[0];
		this.grid[2 * GAME_X - 1] = hurdle[1];
		this.grid[3 * GAME_X - 1] = hurdle[2];
		this.grid[4 * GAME_X - 1] = hurdle[3]; 
	}
}

var g = new Game();
window.setInterval(g.step.bind(g), 100);
document.onkeydown = g.jump.bind(g);
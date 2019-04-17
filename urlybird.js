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
			let p_y = p_offset_y;                                    // also, I work in a warehouse and could use a better job
			let p_x = p_offset_x + x_offset;                         // hi @ my domain name
			console.log(`${p_y} ${p_x} ${bin.length - p_idx - 1} ${this.point(p_y, p_x)}`)
			bin[bin.length - p_idx - 1] = this.point(p_y, p_x); // low-endian
		}

		bin = bin.map(x => +x);
		bin = parseInt(bin.join(''), 2);

		console.log(bin);

		return String.fromCharCode(0x2800 + bin);
	}

	point (y, x) {
		if (x == this.x_dim) return false; // in case x_dim is odd
		return this.arr[y * this.x_dim + x];
	}

	draw (arr) {
		this.arr = arr;
	}

	display () {
		let display = '';

		for (let b_idx = 0; b_idx < this.num_brixels; b_idx++) {
			display += this.brixel(b_idx);
		}

		location.hash = display;
	}
}



class Game {
	constructor () {
		this.points = 0;
		this.jumping = 0;
		this.x_progress = 0;
		
		this.jump = [1,2,3,3,3,2,1];


	}

	jump () {
		this.jumping = 1;
	}

	step () {
		if (this.jumping) {
			this.jumping++;
			if (this.jumping === this.jump.length) this.jumping = 0;
		}

		this.move_grid();
	}
}

var b = new BrixelScreen(37);
b.draw([
	1,0,0,0,0,1,1,1,1,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,
	1,1,0,0,0,0,1,1,1,0,1,1,1,1,0,0,1,1,1,0,1,1,1,0,1,0,0,0,1,0,0,1,1,0,1,1,1,
	1,1,1,0,0,0,0,1,1,0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,
	1,1,1,1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,1,1,1,0,0,1,0,1,0,0,0,1,1,0,1,1,0
].map(x => !!x));
DeShredder = function (img, threshold) {
	var self = this;
	this.threshold = threshold || 100;
	var input = new Image();
	input.src = document.getElementById(img).src;
	input.onload = function () {
		self.prepareCanvas(this);
		self.solve();
	}
}
DeShredder.prototype = {
	cache: {},
	prepareCanvas: function (img) {
		var canvas = document.createElement('canvas');
		this.width = canvas.width = img.width;
		this.height = canvas.height = img.height;
		this.context = canvas.getContext('2d');
		this.context.drawImage(img, 0, 0, this.width, this.height);
		this.output = canvas;
	},
	getStripSize: function () {
		var i, diff, diffs = [], total = 0, stripSize = this.width, factor;
		this.pixels = [];
		for (i = 0; i < this.width; i++) {
			this.pixels[i] = this.context.getImageData(i, 0, 1, this.height);
			if (i) {
				diff = this.diff(i, i-1);
				diffs[i] = diff;
				total += diff;
			}
		}
		for (factor = 2; factor < this.width/2; factor++) {
			if (this.width % factor === 0) {
				stripSize = this.tryStripSize(diffs, total/this.width, this.width/factor) || stripSize;
			}
		}
		return stripSize;
	},
	getSections: function () {
		this.sections = [];
		stripSize = this.getStripSize();
		for (var i = 0; i < Math.ceil(this.width/stripSize); i++) {
			this.sections[i] = new Section(i*stripSize, (i+1)*stripSize - 1, this.context.getImageData(i*stripSize, 0, stripSize, this.height));
		}
	},
	tryStripSize: function (diffs, mean, width) {
		for (var i = 1; i < this.width/width; i++) {
			if (diffs[i * width] < mean) {
				return false
			}
		}
		return width;
	},
	diff: function (a, b) {
		if (typeof this.cache[a + '-' + b] !== 'undefined') {
			return this.cache[a + '-' + b];
		}
		var i, total = 0, euc = 0,
			right = this.pixels[a].data,
			left = this.pixels[b].data;
		for (i = 0; i < this.height; i++) {
			euc = 0;
			euc += Math.pow(right[i*4] - left[i*4], 2);
			euc += Math.pow(right[i*4 + 1] - left[i*4 + 1], 2);
			euc += Math.pow(right[i*4 + 2] - left[i*4 + 2], 2);
			total += euc > this.threshold ? 1 : 0;
		}
		this.cache[a + '-' + b] = total;
		return total;
	},
	compare: function (a, b) {
		return [this.diff(a.right, b.left), this.diff(b.right, a.left)];
	},
	solve: function () {
		if (!this.sections) {
			this.getSections();
		}
		var d, min = Infinity, index, dir, self = this, i;
		for (i = 1; i < this.sections.length; i++) {
			d = this.compare(this.sections[0], this.sections[i]);
			if (d[0] < min) {
				min = d[0];
				index = i;
				dir = 'left';
			}
			if (d[1] < min) {
				min = d[1];
				index = i;
				dir = 'right';
			}
		}
		this.sections[0] = this.merge(this.sections[0], this.sections[index], dir);
		this.sections.splice(index, 1);
		if (this.sections.length === 1) {
			this.render();
		} else {
			this.solve();
		}
	},
	merge: function (a, b, dir) {
		if (dir === 'right') {
			return this.merge(b, a);
		}
		a.right = b.right;
		a.data = a.data.concat(b.data);
		return a;
	},
	render: function () {
		var i, section = this.sections[0].data, imageData, self = this;
		for (i = 0; i < section.length; i++) {
			var imageData = section[i];
			self.context.putImageData(imageData, i * imageData.width, 0);
		}
		document.body.appendChild(this.output);
	}
}

Section = function (left, right, data) {
	this.left = left;
	this.right = right;
	if (data) {
		this.data = [data];
	}
}
goog.provide('kemia.model.NeighborList');
goog.require('goog.math.Vec2');
goog.require('goog.array');
goog.require('goog.math.Line');

/**
 * Class for locating the objects nearest to a specified coordinate.
 * 
 * <pre class="code">
 * var neighborList = new kemia.model.NeighborList(molecule);
 * neighborList.getNearest( {
 * 	x : 4,
 * 	y : 5
 * });
 * </pre>
 * 
 * @class Class for computing objects for a specified coordinate.
 * @param {Array.
 *            <Object>} objects The objects to initialize the grid.
 * @param {Number}
 *            opt_cellSize The cell size, default is 2. This is in atomic units.
 * @param {Number}
 *            opt_tolerance The tolerance to consider an atom close enough to
 *            the specified coordinate. The default is 0.3. This is in atomic
 *            units.
 * @constructor
 */
kemia.model.NeighborList = function(objects, opt_cellSize, opt_tolerance) {
	this.cells = [];
	this.cellSize = opt_cellSize ? opt_cellSize : 2;
	this.tolerance = opt_tolerance ? opt_tolerance : 0.3;
	this.xMin = 100000;
	this.yMin = 100000;
	this.xMax = -100000;
	this.yMax = -100000;

	// find min/max values for the grid
	for ( var i = 0, li = objects.length; i < li; i++) {
		var obj = objects[i];
		if (obj instanceof kemia.model.Molecule) {
			for ( var j = 0, lj = obj.countAtoms(); j < lj; j++) {
				var atom = obj.atoms[j];
				if (atom.coord.x < this.xMin) {
					this.xMin = atom.coord.x;
				}
				if (atom.coord.x > this.xMax) {
					this.xMax = atom.coord.x;
				}
				if (atom.coord.y < this.yMin) {
					this.yMin = atom.coord.y;
				}
				if (atom.coord.y > this.yMax) {
					this.yMax = atom.coord.y;
				}
			}
		}
	}

	this.xMin -= 1;
	this.yMin -= 1;
	this.xMax += 1;
	this.yMax += 1;

	// compute number of cells and create them
	this.width = this.xMax - this.xMin;
	this.height = this.yMax - this.yMin;
	this.xDim = Math.ceil(this.width / this.cellSize);
	this.yDim = Math.ceil(this.height / this.cellSize);
	for ( var i = 0, li = this.xDim * this.yDim; i < li; i++) {
		this.cells.push( []);
	}

	// add the objects to the grid
	goog.array.forEach(objects, function(obj) {
		if (obj instanceof kemia.model.Molecule) {
			var molecule = obj;
			goog.array.forEach(molecule.atoms, function(atom) {
				var x = Math.floor((atom.coord.x - this.xMin) / this.cellSize);
				var y = Math.floor((atom.coord.y - this.yMin) / this.cellSize);
				this.cells[y * this.xDim + x].push(atom);
			}, this);
			goog.array.forEach(molecule.bonds, function(bond) {
				var midPoint = goog.math.Vec2
						.fromCoordinate(goog.math.Coordinate.sum(
								bond.source.coord, bond.target.coord));
				midPoint.scale(0.5);
				bond.midPoint = midPoint;
				var x = Math.floor((midPoint.x - this.xMin) / this.cellSize);
				var y = Math.floor((midPoint.y - this.yMin) / this.cellSize);
				this.cells[y * this.xDim + x].push(bond);
			}, this);
		}
	}, this);
};

/**
 * 
 * @param coord
 * @return
 */
kemia.model.NeighborList.prototype.cellsAroundCoord = function(coord) {
	var cells = [];
	var x = Math.floor((coord.x - this.xMin) / this.cellSize);
	var y = Math.floor((coord.y - this.yMin) / this.cellSize);

	for ( var i = x - 1, li = x + 2; i < li; i++) {
		if (i < 0 || i >= this.xDim) {
			continue;
		}
		for ( var j = y - 1, lj = y + 2; j < lj; j++) {
			if (j < 0 || j >= this.yDim) {
				continue;
			}
			cells.push(j * this.xDim + i);
		}
	}

	return cells;
};

/**
 * 
 */
kemia.model.NeighborList.prototype.triangleSign = function(a, b, c) {
	return (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
};


/**
 * calculate distance from a point to the nearest point on the bond line segment
 * 
 * @param {kemia.model.Bond}
 *            bond, the subject bond
 * @param {goog.math.Coordinate}
 *            coord coordinate of the subject point
 * @return {number} distance from the point to the nearest point on the bond
 */
kemia.model.NeighborList.prototype.bondDistance = function(bond, coord) {
	var line = new goog.math.Line(bond.source.coord.x, bond.source.coord.y,
			bond.target.coord.x, bond.target.coord.y);
	return goog.math.Coordinate.distance(line.getClosestSegmentPoint(coord.x,
			coord.y), coord);
};

kemia.model.NeighborList.prototype.getNearest = function(coord) {
	var nearestList = this.getNearestList(coord);
	if (nearestList.length>0){
		return nearestList[0];
	}
};

/**
 * Returns a neighboring objects for the specified coordinate. Sorted by
 * distance from the coordinate. Atoms have higher priority than bonds since
 * bonds will overlap with atoms. For atoms, the distance from the specified
 * coordinate to the atom coordinate is checked. If this is within the used
 * tolerance, the atom is a candidate. The search goes on untill all near atoms
 * in the neighboring cells are checked and the nearest atom is returned. For
 * bonds, a bounding box with a 2 * tolerance width and length of the bond is
 * used to check is within the (rotated) box. Any bond matching the coordinate
 * are assigned the tolerance as distance resulting in atoms having a higher
 * priority (The atom will be closer than tolerance...).
 */

kemia.model.NeighborList.prototype.getNearestList = function(coord) {
	var nearest = [];
	var cells = this.cellsAroundCoord(coord);
	var rMin = this.tolerance;
	for (i = 0, li = cells.length; i < li; i++) {
		var cell = this.cells[cells[i]];
		for (j = 0, lj = cell.length; j < lj; j++) {
			var obj = cell[j];
			if (obj instanceof kemia.model.Atom) {
				var r = goog.math.Coordinate.distance(obj.coord, coord);
				if (r < this.tolerance) {
					nearest.push( {
						obj : obj,
						distance : r
					});
				} else if (r < 3 * this.tolerance) {
					nearest.push( {
						obj : obj.molecule,
						distance : r * 2
					});
				}
			} else if (obj instanceof kemia.model.Bond) {
				var r = this.bondDistance(obj, coord);
				if (r < this.tolerance) {
					nearest.push( {
						obj : obj,
						distance : r + this.tolerance
					});
				}
			}

		}
	}

	nearest.sort(function(a, b) {
		return a.distance - b.distance;
	});

	return goog.array.map(nearest, function(n){
		return n.obj;
	});
};

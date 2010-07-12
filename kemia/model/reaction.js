goog.provide('kemia.model.Reaction');
goog.require('kemia.model.Molecule');
goog.require('goog.math.Box');
goog.require('goog.math.Rect');
goog.require('goog.debug.Logger');

/**
 * Creates a new Reaction.
 * 
 * @constructor
 */
kemia.model.Reaction = function() {
	this.header = "";
	this.reactants = [];
	this.products = [];
	this.arrows = [];
	this.pluses = [];
	this.reagentsText = "";
	this.conditionsText = "";
};


// TODO add docs
kemia.model.Reaction.prototype.addReactant = function(mol) {
	this.reactants.push(mol);
	mol.reaction = this;
};
kemia.model.Reaction.prototype.addProduct = function(mol) {
	this.products.push(mol);
	mol.reaction = this;
};
kemia.model.Reaction.prototype.removeMolecule = function(mol){
	if(goog.array.contains(this.reactants, mol)){
		goog.array.remove(this.reactants, mol);
		mol.reaction = undefined;
	}else if(goog.array.contains(this.products, mol)){
		goog.array.remove(this.products, mol);
		mol.reaction = undefined;
	}
}
kemia.model.Reaction.prototype.addArrow = function(coord) {
	this.arrows.push(coord);
	coord.reaction = this;
}
kemia.model.Reaction.prototype.removeArrow = function(coord) {
	goog.array.remove(this.arrows, coord);
	coord.reaction = undefined;
}
kemia.model.Reaction.prototype.addPlus = function(coord) {
	this.pluses.push(coord);
	coord.reaction = this;
}
kemia.model.Reaction.prototype.removePlus = function(coord) {
	goog.array.remove(this.pluses, coord);
	coord.reaction = undefined;
}
kemia.model.Reaction.prototype.removeArrowOrPlus = function(coord) {
	if (goog.array.contains(this.arrows, coord)) {
		this.removeArrow(coord);
	} else if (goog.array.contains(this.pluses, coord)) {
		this.removePlus(coord);
	}
}

kemia.model.Reaction.prototype.generatePlusCoords = function(molecules) {
	var previousMol;
	goog.array.forEach(molecules, function(mol) {
		if (previousMol) {
			var center = this.center( [ previousMol, mol ]);
			this.addPlus(center);
		}
		previousMol = mol;
	}, this);

};

kemia.model.Reaction.prototype.generateArrowCoords = function(reactants,
		products) {
	var r_box = this.boundingBox(reactants);
	var p_box = this.boundingBox(products);
	this.addArrow(new goog.math.Coordinate((r_box.right + p_box.left) / 2,
			(r_box.top + p_box.bottom) / 2));
};

/**
 * bounding box of an array of molecules
 * 
 * @return goog.math.Box
 */
kemia.model.Reaction.prototype.boundingBox = function(molecules) {
	var atoms = goog.array.flatten(goog.array.map(molecules, function(mol) {
		return mol.atoms;
	}));
	var coords = goog.array.map(atoms, function(a) {
		return a.coord;
	})
	return goog.math.Box.boundingBox.apply(null, coords);
};

/**
 * finds center of an array of molecules
 * 
 * @return goog.math.Coordinate
 */
kemia.model.Reaction.prototype.center = function(molecules) {

	var bbox = this.boundingBox(molecules);

	return new goog.math.Coordinate((bbox.left + bbox.right) / 2,
			(bbox.top + bbox.bottom) / 2);
};

/**
 * layout molecules to eliminate any molecule overlap, if necessary
 */
kemia.model.Reaction.prototype.removeOverlap = function() {
	var margin = 4;
	var molecules = goog.array.concat(this.reactants, this.products);
	var accumulated_rect;
	goog.array
			.forEach(molecules,
					function(mol) {
						var mol_rect = goog.math.Rect.createFromBox(this
								.boundingBox( [ mol ]));

						if (accumulated_rect) {

							if (goog.math.Rect.intersection(accumulated_rect,
									mol_rect)) {
								this.translateMolecule(mol,
										new goog.math.Coordinate(margin
												+ accumulated_rect.left
												+ accumulated_rect.width
												- mol_rect.left, 0));
							}
							// expand to include this molecule location
					accumulated_rect.boundingRect(goog.math.Rect
							.createFromBox(this.boundingBox( [ mol ])));
				} else {
					accumulated_rect = mol_rect;
				}
			}, this);

};

/**
 * translate molecule coordinates
 * 
 * @param {kemia.model.Molecule}
 *            molecule, the molecule to translate
 * @param {goog.math.Coordinate}
 *            coord, contains x and y change amounts
 * 
 * @return {kemia.model.Molecule}
 */
kemia.model.Reaction.prototype.translateMolecule = function(molecule, coord) {
	
	goog.array.forEach(molecule.atoms, function(a) {
		a.coord = goog.math.Coordinate.sum(a.coord, coord);
	});

	return molecule;
};

/**
 * rotate molecule coordinates
 * 
 * @param {kemia.model.Molecule} molecule, the molecule to rotate
 * @param {goog.math.Coordinate} center, coordinates of center of rotation
 * 
 * @return {kemia.model.Molecule}
 */
kemia.model.Reaction.prototype.rotateMolecule = function(molecule, degrees, center) {
	
	var trans = kemia.graphics.AffineTransform.getRotateInstance(goog.math.toRadians(degrees), center.x, center.y);
	goog.array.forEach(molecule.atoms, function(a) {
		a.coord = trans.transformCoords([a.coord])[0];
	});
	return molecule;
}


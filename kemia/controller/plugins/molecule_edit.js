goog.provide('kemia.controller.plugins.MoleculeEdit');
goog.require('kemia.controller.Plugin');
goog.require('goog.debug.Logger');
goog.require('kemia.model.Molecule');

/**
 * @constructor
 * @extends{kemia.controller.Plugin}s
 */
kemia.controller.plugins.MoleculeEdit = function() {
	kemia.controller.Plugin.call(this);

}
goog.inherits(kemia.controller.plugins.MoleculeEdit, kemia.controller.Plugin);

/**
 * Logging object.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.MoleculeEdit.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.MoleculeEdit');
/**
 * Command implemented by this plugin.
 */
kemia.controller.plugins.MoleculeEdit.COMMAND = 'selectMoleculeTemplate';

/** @inheritDoc */
kemia.controller.plugins.MoleculeEdit.prototype.isSupportedCommand = function(
		command) {
	return command == kemia.controller.plugins.MoleculeEdit.COMMAND;
};

/** @inheritDoc */
kemia.controller.plugins.MoleculeEdit.prototype.getTrogClassId = goog.functions
		.constant(kemia.controller.plugins.MoleculeEdit.COMMAND);

/**
 * sets template
 * 
 * @param {string}
 *            command Command to execute.
 * @return {Object|undefined} The result of the command.
 */
kemia.controller.plugins.MoleculeEdit.prototype.execCommandInternal = function(
		command, var_args) {
	this.template = arguments[1];
	var e = arguments[3];
	var molecule = kemia.io.json.readMolecule(this.template);
	// place template as new molecule at 0,0 of graphics canvas
	var origin = this.editorObject.getAtomicCoords(new goog.math.Coordinate(0,
			0));
	var mol_bbox = molecule.getBoundingBox();
	var mol_offset = new goog.math.Coordinate(mol_bbox.right, mol_bbox.top);
	var diff = goog.math.Coordinate.difference(origin, mol_offset);
	// diff = goog.math.Coordinate.difference(diff, mol_offset);
	if (this.editorObject.getModels().length > 0) {
		var reaction = this.editorObject.getModels()[0];
	} else {
		reaction = new kemia.model.Reaction();
	}
	reaction.addReactant(molecule);
	reaction.translateMolecule(molecule, diff);
	this.editorObject.setModels( [ reaction ]);
	var mol_center = molecule.getCenter();

	var center = this.editorObject.getGraphicsCoords(mol_center);
	var origin = kemia.controller.ReactionEditor.getOffsetCoords(
			this.editorObject.originalElement, document.body.scrollLeft
			+ document.documentElement.scrollLeft, document.body.scrollTop
			+ document.documentElement.scrollTop);

	e.clientX = center.x - origin.x;
	e.clientY = center.y - origin.y;

	this.dragTemplate(e, molecule);
};

kemia.controller.plugins.MoleculeEdit.prototype.dragTemplate = function(e,
		molecule) {

	var d = new goog.fx.Dragger(this.editorObject.getOriginalElement());
	d._start = new goog.math.Coordinate(e.clientX, e.clientY);
	d._prev = d._start;
	d.molecule = molecule;
	d.editor = this.editorObject;
	d
			.addEventListener(goog.fx.Dragger.EventType.DRAG,
					function(e) {
						if (d._highlightGroups) {
							goog.array.forEach(d._highlightGroups, function(g) {
								g.clear();
							})
						}
						d._highlightGroups = [];
						var mouse_coord = new goog.math.Coordinate(e.clientX,
								e.clientY);

						var diff = goog.math.Coordinate.difference(mouse_coord,
								d._start);

						// move graphic
					d.molecule.group.setTransformation(diff.x, diff.y, 0, 0, 0);

					// move molecule
					var mol_coords = d.editor.reactionRenderer.transform
							.createInverse().transformCoords(
									[ mouse_coord, d._prev ]);

					var diff = goog.math.Coordinate.difference(mol_coords[0],
							mol_coords[1]);
					d.molecule.reaction.translateMolecule(d.molecule, diff);
					d._prev = mouse_coord;

					// highlight merge sites
					var merge_pairs = this.findAtomMergePairs(molecule);

					// only first merge pair for now
					if (merge_pairs.length > 0) {
						merge_pairs = [ merge_pairs[0] ];
					}
					goog.array
							.forEach(
									merge_pairs,
									function(pair) {
										d._highlightGroups
												.push(d.editor.reactionRenderer.moleculeRenderer.atomRenderer
														.highlightOn(pair[0]));
										d._highlightGroups
												.push(d.editor.reactionRenderer.moleculeRenderer.atomRenderer
														.highlightOn(pair[1]));
									});

				}, undefined, this);
	d.addEventListener(goog.fx.Dragger.EventType.END, function(e) {
		var merge_pairs = this.findAtomMergePairs(d.molecule);

		// only first merge pair for now
			if (merge_pairs.length > 0) {
				merge_pairs = [ merge_pairs[0] ];
			}
			goog.array.forEach(merge_pairs, function(pair) {
				kemia.controller.plugins.AtomEdit.mergeMolecules(pair[0],
						pair[1]);
			}, this);
			d.editor.setModels(d.editor.getModels());
			d.dispose();
		}, undefined, this);
	d.startDrag(e);
};

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.MoleculeEdit.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.MoleculeEdit');

kemia.controller.plugins.MoleculeEdit.prototype.handleMouseDown = function(e) {

	// if (this.isActive) {
	this.editorObject.dispatchBeforeChange();
	var target = this.editorObject.findTarget(e);

	if (target instanceof kemia.model.Molecule) {
		if (e.shiftKey) {
			this.rotate(e, target);
		} else {
			this.drag(e, target);
		}
	}
	this.editorObject.dispatchChange();
	// }
};

kemia.controller.plugins.MoleculeEdit.prototype.drag = function(e, molecule) {

	var d = new goog.fx.Dragger(this.editorObject.getOriginalElement());
	d._center = this.editorObject.getGraphicsCoords(molecule.getCenter());
	d._initDeltaX = null;
	d._initDeltaY = null;
	d._prevDeltaX = 0;
	d._prevDeltaY = 0;
	d.molecule = molecule;
	d.editor = this.editorObject;
	d
			.addEventListener(
					goog.fx.Dragger.EventType.DRAG,
					function(e) {
						if (d._highlightGroups) {
							goog.array.forEach(d._highlightGroups, function(g) {
								g.clear();
							})
						}
						d._highlightGroups = [];
						d._initDeltaX = d._initDeltaX || d.deltaX;
						d._initDeltaY = d._initDeltaY || d.deltaY;
						var deltaX = d.deltaX - d._initDeltaX;
						var deltaY = d.deltaY - d._initDeltaY;
						var deltaDeltaX = deltaX - d._prevDeltaX;
						var deltaDeltaY = deltaY - d._prevDeltaY;

						// move graphic
						d.molecule.group.setTransformation(deltaX, deltaY, 0,
								0, 0);

						// move molecule
						var diff = new goog.math.Coordinate(deltaDeltaX
								/ d.editor.reactionRenderer.transform
										.getScaleX(), deltaDeltaY
								/ d.editor.reactionRenderer.transform
										.getScaleY());
						d.molecule.reaction.translateMolecule(d.molecule, diff);

						// d._prev = mouse_coord;
						d._prevDeltaX = d.deltaX - d._initDeltaX;
						d._prevDeltaY = d.deltaY - d._initDeltaY

						// highlight merge sites
						var merge_pairs = this.findAtomMergePairs(molecule);

						// only first merge pair for now
						if (merge_pairs.length > 0) {
							merge_pairs = [ merge_pairs[0] ];
						}
						goog.array
								.forEach(
										merge_pairs,
										function(pair) {
											d._highlightGroups
													.push(d.editor.reactionRenderer.moleculeRenderer.atomRenderer
															.highlightOn(pair[0]));
											d._highlightGroups
													.push(d.editor.reactionRenderer.moleculeRenderer.atomRenderer
															.highlightOn(pair[1]));
										});

					}, undefined, this);
	d.addEventListener(goog.fx.Dragger.EventType.END, function(e) {
		var merge_pairs = this.findAtomMergePairs(d.molecule);

		// only first merge pair for now
			if (merge_pairs.length > 0) {
				merge_pairs = [ merge_pairs[0] ];
			}
			goog.array.forEach(merge_pairs, function(pair) {
				kemia.controller.plugins.AtomEdit.mergeMolecules(pair[0],
						pair[1]);
			}, this);
			d.editor.setModels(d.editor.getModels());
			d.dispose();
		}, undefined, this);

	d.startDrag(e);
};

kemia.controller.plugins.MoleculeEdit.prototype.findAtomMergePairs = function(
		molecule) {
	return goog.array.filter(goog.array.map(molecule.atoms, function(atom) {
		var nearest = this.editorObject.neighborList.getNearestList( {
			x : atom.coord.x,
			y : atom.coord.y
		}, this);
		var other_atoms = goog.array.filter(nearest, function(other) {
			if (other instanceof kemia.model.Atom) {
				if (!goog.array.contains(molecule.atoms, other)) {
					return true;
				}
			}
			return false;
		});
		if (other_atoms.length > 0) {
			return [ atom, other_atoms[0] ];
		} else {
			return false;
		}
	}, this), function(pair) {
		return pair != false;
	}, this);
};

kemia.controller.plugins.MoleculeEdit.prototype.rotate = function(e, molecule) {

	var d = new goog.fx.Dragger(this.editorObject.getOriginalElement());

	d._center = this.editorObject.reactionRenderer.transform
			.transformCoords( [ molecule.getCenter() ])[0];
	d._start = kemia.controller.ReactionEditor.getMouseCoords(e);
	d._start_angle = goog.math.angle(d._center.x, d._center.y, d._start.x,
			d._start.y);
	d._initDeltaX = null;
	d._initDeltaY = null;
	d.group = molecule.group;
	d.molecule = molecule;
	d.editor = this.editorObject;

	d.addEventListener(goog.fx.Dragger.EventType.DRAG, function(e) {
		d._initDeltaX = d._initDeltaX || d.deltaX;
		d._initDeltaY = d._initDeltaY || d.deltaY;
		var deltaX = d.deltaX - d._initDeltaX;
		var deltaY = d.deltaY - d._initDeltaY;
		var new_angle = goog.math.angle(d._center.x, d._center.y, d._start.x
				+ deltaX, d._start.y + deltaY);
		var g_trans = d.group.getTransform();
		var degrees = new_angle - d._start_angle;
		d.group.setTransformation(0, 0, degrees, d._center.x, d._center.y);
	});
	d.addEventListener(goog.fx.Dragger.EventType.END, function(e) {
		var mol_center = d.editor.reactionRenderer.transform.createInverse()
				.transformCoords( [ d._center ])[0];
		var new_angle = goog.math.angle(d._center.x, d._center.y, d._start.x
				+ d.deltaX, d._start.y + d.deltaY);

		var degrees = new_angle - d._start_angle;
		d.molecule.reaction.rotateMolecule(d.molecule, -degrees, mol_center);
		d.editor.setModels(d.editor.getModels());
		d.dispose();
	});
	d.startDrag(e);
};

/**
 * @enum {Object}
 */
kemia.controller.plugins.MoleculeEdit.TEMPLATES = [ {
	"name" : "benzene",
	"atoms" : [ {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 1.30,
			"y" : 3.0,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 1.30,
			"y" : 0,
			"z" : 0
		},
		"charge" : 0
	} ],
	"bondindex" : [ {
		"source" : 0,
		"target" : 1,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 1,
		"target" : 2,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 2,
		"target" : 3,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 3,
		"target" : 4,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 4,
		"target" : 5,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 5,
		"target" : 0,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	} ]
}, {
	"name" : "cyclohexane",
	"atoms" : [ {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 1.30,
			"y" : 3.0,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 1.30,
			"y" : 0,
			"z" : 0
		},
		"charge" : 0
	} ],
	"bondindex" : [ {
		"source" : 0,
		"target" : 1,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 1,
		"target" : 2,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 2,
		"target" : 3,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 3,
		"target" : 4,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 4,
		"target" : 5,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 5,
		"target" : 0,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	} ]
}, {
	"name" : "cyclopentane",
	"atoms" : [ {
		"symbol" : "C",
		"coord" : {
			"x" : -2.3083,
			"y" : 0.4635,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : -2.3083,
			"y" : 1.9635,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : -0.8817,
			"y" : 2.427,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 1.2135,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : -0.8817,
			"y" : 0,
			"z" : 0
		},
		"charge" : 0
	} ],
	"bondindex" : [ {
		"source" : 0,
		"target" : 1,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 1,
		"target" : 2,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 2,
		"target" : 3,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 3,
		"target" : 4,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 4,
		"target" : 0,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	} ]
}, {
	"name" : "cyclopentane",
	"atoms" : [ {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 1.30,
			"y" : 0,
			"z" : 0
		},
		"charge" : 0
	} ],
	"bondindex" : [ {
		"source" : 0,
		"target" : 1,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 1,
		"target" : 2,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 2,
		"target" : 3,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 3,
		"target" : 4,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 4,
		"target" : 0,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	} ]
}, {
	"name" : "pyrrole",
	"atoms" : [ {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "N",
		"coord" : {
			"x" : 1.30,
			"y" : 0,
			"z" : 0
		},
		"charge" : 0
	} ],
	"bondindex" : [ {
		"source" : 0,
		"target" : 1,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 1,
		"target" : 2,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 2,
		"target" : 3,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 3,
		"target" : 4,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 4,
		"target" : 0,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	} ]
}, {
	"name" : "pyrrole",
	"atoms" : [ {
		"symbol" : "C",
		"coord" : {
			"x" : -2.3083,
			"y" : 0.4635,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : -2.3083,
			"y" : 1.9635,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : -0.8817,
			"y" : 2.427,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 1.2135,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "N",
		"coord" : {
			"x" : -0.8817,
			"y" : 0,
			"z" : 0
		},
		"charge" : 0
	} ],
	"bondindex" : [ {
		"source" : 0,
		"target" : 1,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 1,
		"target" : 2,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 2,
		"target" : 3,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 3,
		"target" : 4,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 4,
		"target" : 0,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	} ]
}, {
	"name" : "naphthalene",
	"atoms" : [ {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 2.5981,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 1.2991,
			"y" : 3,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 0,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 1.2991,
			"y" : 0,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 3.8971,
			"y" : 3,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 5.1962,
			"y" : 2.25,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 5.1962,
			"y" : 0.75,
			"z" : 0
		},
		"charge" : 0
	}, {
		"symbol" : "C",
		"coord" : {
			"x" : 3.8971,
			"y" : 0,
			"z" : 0
		},
		"charge" : 0
	} ],
	"bondindex" : [ {
		"source" : 0,
		"target" : 1,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 1,
		"target" : 2,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 2,
		"target" : 3,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 3,
		"target" : 4,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 4,
		"target" : 5,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 5,
		"target" : 0,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 1,
		"target" : 6,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 6,
		"target" : 7,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 7,
		"target" : 8,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 8,
		"target" : 9,
		"type" : "DOUBLE_BOND",
		"stereo" : "NOT_STEREO"
	}, {
		"source" : 9,
		"target" : 0,
		"type" : "SINGLE_BOND",
		"stereo" : "NOT_STEREO"
	} ]
} ];

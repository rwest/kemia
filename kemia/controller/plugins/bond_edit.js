goog.provide('kemia.controller.plugins.BondEdit');
goog.require('kemia.controller.Plugin');
goog.require('goog.debug.Logger');
goog.require('kemia.model.Bond');

/**
 * @constructor
 * @extends{kemia.controller.Plugin}s
 */
kemia.controller.plugins.BondEdit = function() {
	kemia.controller.Plugin.call(this);

}
goog.inherits(kemia.controller.plugins.BondEdit, kemia.controller.Plugin);

/**
 * Command implemented by this plugin.
 */
kemia.controller.plugins.BondEdit.COMMAND = 'selectBond';

/** @inheritDoc */
kemia.controller.plugins.BondEdit.prototype.isSupportedCommand = function(
		command) {
	return command == kemia.controller.plugins.BondEdit.COMMAND;
};

/** @inheritDoc */
kemia.controller.plugins.BondEdit.prototype.getTrogClassId = goog.functions
		.constant(kemia.controller.plugins.BondEdit.COMMAND);

/**
 * sets bond order and stereo.
 * 
 * @param {string}
 *            command Command to execute.
 * @return {Object|undefined} The result of the command.
 */
kemia.controller.plugins.BondEdit.prototype.execCommandInternal = function(
		command, var_args) {
	this.bond_type = arguments[1];
};

kemia.controller.plugins.BondEdit.SHORTCUTS = [ {
	id : '1',
	key : '1',
	order : kemia.model.Bond.ORDER.SINGLE,
	stereo : kemia.model.Bond.STEREO.NOT_STEREO
}, {
	id : '2',
	key : '2',
	order : kemia.model.Bond.ORDER.DOUBLE,
	stereo : kemia.model.Bond.STEREO.NOT_STEREO
}, {
	id : '3',
	key : '3',
	order : kemia.model.Bond.ORDER.TRIPLE,
	stereo : kemia.model.Bond.STEREO.NOT_STEREO
} ];

kemia.controller.plugins.BondEdit.prototype.getKeyboardShortcuts = function() {
	return kemia.controller.plugins.BondEdit.SHORTCUTS;
}

/**
 * @enum {Object}
 */
kemia.controller.plugins.BondEdit.BOND_TYPES = [ {
	caption : "Single",
	order : kemia.model.Bond.ORDER.SINGLE,
	stereo : kemia.model.Bond.STEREO.NOT_STEREO
}, {
	caption : "Double",
	order : kemia.model.Bond.ORDER.DOUBLE,
	stereo : kemia.model.Bond.STEREO.NOT_STEREO
}, {
	caption : "Triple",
	order : kemia.model.Bond.ORDER.TRIPLE,
	stereo : kemia.model.Bond.STEREO.NOT_STEREO
}, {
	caption : "Quadruple",
	order : kemia.model.Bond.ORDER.QUADRUPLE,
	stereo : kemia.model.Bond.STEREO.NOT_STEREO
}, {
	caption : "Single Up",
	order : kemia.model.Bond.ORDER.SINGLE,
	stereo : kemia.model.Bond.STEREO.UP
}, {
	caption : "Single Down",
	order : kemia.model.Bond.ORDER.SINGLE,
	stereo : kemia.model.Bond.STEREO.DOWN
}, {
	caption : "Single Up or Down",
	order : kemia.model.Bond.ORDER.SINGLE,
	stereo : kemia.model.Bond.STEREO.UP_OR_DOWN
} ]

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.BondEdit.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.BondEdit');

// kemia.controller.plugins.BondEdit.prototype.handleDoubleClick = function(e) {
// this.logger.info('handleDoubleClick');
// }

kemia.controller.plugins.BondEdit.prototype.handleKeyboardShortcut = function(e) {
	var id = e.identifier;
	var shortcut = goog.array.find(kemia.controller.plugins.BondEdit.SHORTCUTS,
			function(obj) {
				return obj.id == e.identifier
			});
	if (shortcut) {
		this.bond_type = shortcut;
		return true;
	}
}

kemia.controller.plugins.BondEdit.prototype.handleMouseDown = function(e) {

	// if (this.isActive) {
	this.editorObject.dispatchBeforeChange();
	var target = this.editorObject.findTarget(e);

	if (target instanceof kemia.model.Atom) {
		this.addBondToAtom(target);
		this.editorObject.setModels(this.editorObject.getModels());
		this.editorObject.dispatchChange();
		return true;
	}
	if (target instanceof kemia.model.Bond) {
		if (this.bond_type) {
			this.replaceBond(target);
			this.editorObject.setModels(this.editorObject.getModels());
			this.editorObject.dispatchChange();
			return true;
		} else {
			if (target._last_click) {
				if ((goog.now() - target._last_click) < 1000) {
					this.toggleBondType(target);
					this.editorObject.setModels(this.editorObject.getModels());
					this.editorObject.dispatchChange();
					return true;
				} else {
					this.drag(e, target);
				}
			}
			target._last_click = goog.now();
			this.drag(e, target);
		}
	}
	if (target == undefined && this.bond_type) {
		this.createMolecule(kemia.controller.ReactionEditor.getMouseCoords(e));
		this.editorObject.setModels(this.editorObject.getModels());
		this.editorObject.dispatchChange();
		return true;
	}

	// }

};

kemia.controller.plugins.BondEdit.prototype.createMolecule = function(pos) {
	var coord = this.editorObject.reactionRenderer.transform.createInverse()
			.transformCoords( [ pos ])[0];
	var atom = new kemia.model.Atom("C", coord.x, coord.y);
	var molecule = new kemia.model.Molecule();
	molecule.addAtom(atom);
	this.addBondToAtom(atom);
	var reaction;
	if (this.editorObject.getModels().length > 0) {
		reaction = this.editorObject.getModels()[0];
		if (reaction.arrows.length > 0) {
			var arrow_pos = reaction.arrows[0];
			if (arrow_pos.x > coord.x) {
				// left of arrow, so reactant
				reaction.addReactant(molecule);
			} else {
				// right of arrow so product
				reaction.addProduct(molecule);
			}
		}
		// no arrow
		reaction.addReactant(molecule);
	}
};

kemia.controller.plugins.BondEdit.prototype.toggleBondType = function(bond) {
	if (bond.stereo == kemia.model.Bond.STEREO.NOT_STEREO) {
		var order = kemia.model.Bond.ORDER.SINGLE;
		if (bond.order == kemia.model.Bond.ORDER.SINGLE) {
			order = kemia.model.Bond.ORDER.DOUBLE;
		} else if (bond.order == kemia.model.Bond.ORDER.DOUBLE) {
			order = kemia.model.Bond.ORDER.TRIPLE;
		}
		var new_bond = new kemia.model.Bond(bond.target, bond.source, order,
				bond.stereo);
		var molecule = bond.molecule;
		molecule.removeBond(bond);
		molecule.addBond(new_bond);
	}
};

kemia.controller.plugins.BondEdit.prototype.replaceBond = function(bond) {
	if (this.bond_type.stereo != kemia.model.Bond.STEREO.NOT_STEREO
			&& bond.stereo == this.bond_type.stereo) {
		// flip ends if replacing with the same stereo

		var new_bond = new kemia.model.Bond(bond.target, bond.source,
				this.bond_type.order, this.bond_type.stereo);
	} else {
		var new_bond = new kemia.model.Bond(bond.source, bond.target,
				this.bond_type.order, this.bond_type.stereo);
	}
	var molecule = bond.molecule;
	molecule.removeBond(bond);
	molecule.addBond(new_bond);
};

kemia.controller.plugins.BondEdit.prototype.addBondToAtom = function(atom) {
	if (this.bond_type) {
		var angles = goog.array.map(atom.bonds.getValues(), function(bond) {
			return new kemia.math.Line(atom.coord, bond.otherAtom(atom).coord)
					.getTheta();
		});

		// this.logger.info("angles.length " + angles.length);
		// this.logger.info("angles[0] " + angles[0]);

		var new_angle;

		if (angles.length == 0) {
			new_angle = 0;
		}
		if (angles.length == 1) {
			if (angles[0] > 0) {
				new_angle = angles[0] - Math.PI * 2 / 3;
			} else {
				new_angle = angles[0] + Math.PI * 2 / 3;
			}
		} else if (angles.length == 2) {
			var sum_angles = goog.array.reduce(angles, function(r, v) {
				return r + v;
			}, 0);

			new_angle = Math.PI + (sum_angles / angles.length);
		}
		if (new_angle != undefined) {
			var new_atom = new kemia.model.Atom("C", atom.coord.x
					+ Math.cos(new_angle) * 1.25, atom.coord.y
					+ Math.sin(new_angle) * 1.25);
			var new_bond = new kemia.model.Bond(atom, new_atom,
					this.bond_type.order, this.bond_type.stereo);
			var molecule = atom.molecule;
			molecule.addAtom(new_atom);
			molecule.addBond(new_bond);
		}
	}
};

kemia.controller.plugins.BondEdit.prototype.drag = function(e, bond) {

	var d = new goog.fx.Dragger(this.editorObject.getOriginalElement());
	d._prevX = e.clientX;
	d._prevY = e.clientY;

	d.bond = bond;
	d.editor = this.editorObject;
	d
			.addEventListener(
					goog.fx.Dragger.EventType.DRAG,
					function(e) {
						d.bond.molecule.group.clear();
						var trans = new goog.graphics.AffineTransform.getTranslateInstance(
								e.clientX - d._prevX, e.clientY - d._prevY);

						var coords = d.editor.reactionRenderer.transform
								.createInverse().transformCoords(
										[
												new goog.math.Coordinate(
														e.clientX, e.clientY),
												new goog.math.Coordinate(
														d._prevX, d._prevY) ]);
						var diff = goog.math.Coordinate.difference(coords[0],
								coords[1]);

						bond.source.coord = goog.math.Coordinate.sum(
								bond.source.coord, diff);
						bond.target.coord = goog.math.Coordinate.sum(
								bond.target.coord, diff);
						d.editor.reactionRenderer.moleculeRenderer.render(
								bond.molecule,
								d.editor.reactionRenderer.transform);

						d._prevX = e.clientX;
						d._prevY = e.clientY;

					});
	d.addEventListener(goog.fx.Dragger.EventType.END, function(e) {

		d.editor.setModels(d.editor.getModels());
		d.dispose();
	});
	d.startDrag(e);
};

/**
 * reset to default state
 * called when another plugin is made active
 */
kemia.controller.plugins.BondEdit.prototype.resetState = function(){
	this.bond_type  = undefined;
}


/** @inheritDoc */
kemia.controller.plugins.BondEdit.prototype.queryCommandValue = function(command) {
	if (command == kemia.controller.plugins.BondEdit.COMMAND) {
		return this.bond_type;
	}
};

goog.provide('kemia.controller.plugins.AtomEdit');
goog.require('kemia.controller.Plugin');
goog.require('goog.debug.Logger');

/**
 * @constructor
 * @extends{kemian.controller.Plugin}s
 */
kemia.controller.plugins.AtomEdit = function() {
	kemia.controller.Plugin.call(this);

}
goog.inherits(kemia.controller.plugins.AtomEdit, kemia.controller.Plugin);

/**
 * Command implemented by this plugin.
 */
kemia.controller.plugins.AtomEdit.COMMAND = 'selectSymbol';

/** @inheritDoc */
kemia.controller.plugins.AtomEdit.prototype.isSupportedCommand = function(
		command) {
	return command == kemia.controller.plugins.AtomEdit.COMMAND;
};

/** @inheritDoc */
kemia.controller.plugins.AtomEdit.prototype.getTrogClassId = goog.functions
		.constant(kemia.controller.plugins.AtomEdit.COMMAND);

/**
 * sets atom symbol.
 * 
 * @param {string}
 *            command Command to execute.
 * @return {Object|undefined} The result of the command.
 */
kemia.controller.plugins.AtomEdit.prototype.execCommandInternal = function(
		command, var_args) {
	this.symbol = arguments[1];
};

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.AtomEdit.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.AtomEdit');

kemia.controller.plugins.AtomEdit.prototype.handleMouseDown = function(e) {
	var target = this.editorObject.findTarget(e);
	if (target instanceof kemia.model.Atom) {
		var atom = target;
		this.editorObject.dispatchBeforeChange();
		if (this.symbol && (this.symbol != atom.symbol)) {
			this.setAtomSymbol(e, atom);
		} else {
			this.drag(e, atom);
		}

		this.editorObject.setModels(this.editorObject.getModels());
		this.editorObject.dispatchChange();
	}
};

kemia.controller.plugins.AtomEdit.prototype.setAtomSymbol = function(e, atom) {
	var new_atom = new kemia.model.Atom(this.symbol, atom.coord.x, atom.coord.y);
	goog.array.forEach(atom.bonds.getValues(), function(bond) {
		var new_bond = bond.clone();
		new_bond.molecule = undefined;
		atom == new_bond.source ? new_bond.source = new_atom
				: new_bond.target = new_atom;
		atom.molecule.addBond(new_bond);
	});
	var molecule = atom.molecule
	molecule.removeAtom(atom);
	molecule.addAtom(new_atom);
};

kemia.controller.plugins.AtomEdit.prototype.drag = function(e, atom) {

	var d = new goog.fx.Dragger(this.editorObject.getOriginalElement());
	d._prevX = e.clientX;
	d._prevY = e.clientY;

	d.atom = atom;
	d.editor = this.editorObject;
	d
			.addEventListener(
					goog.fx.Dragger.EventType.DRAG,
					function(e) {
						d.atom.molecule.group.clear();
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

						atom.coord = goog.math.Coordinate.sum(atom.coord, diff);

						d.editor.reactionRenderer.moleculeRenderer.render(
								d.atom.molecule,
								d.editor.reactionRenderer.transform);

						d._prevX = e.clientX;
						d._prevY = e.clientY;

					});
	d
			.addEventListener(
					goog.fx.Dragger.EventType.END,
					function(e) {

						d.editor.setModels(d.editor.getModels());
						d.dispose();
					});
	d.startDrag(e);
};

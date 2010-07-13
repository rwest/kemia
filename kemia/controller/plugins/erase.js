goog.provide('kemia.controller.plugins.Erase');

goog.require('kemia.controller.Plugin');
goog.require('goog.debug.Logger');

/**
 * @constructor
 * @extends{kemian.controller.Plugin}s
 */
kemia.controller.plugins.Erase = function() {
	kemia.controller.Plugin.call(this);

}
goog.inherits(kemia.controller.plugins.Erase, kemia.controller.Plugin);

/**
 * Command implemented by this plugin.
 */
kemia.controller.plugins.Erase.COMMAND = 'erase';

/** @inheritDoc */
kemia.controller.plugins.Erase.prototype.isSupportedCommand = function(command) {
	return command == kemia.controller.plugins.Erase.COMMAND;
};

/** @inheritDoc */
kemia.controller.plugins.Erase.prototype.getTrogClassId = goog.functions
		.constant(kemia.controller.plugins.Erase.COMMAND);

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.Erase.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.Erase');

/**
 * clears the editor.
 * 
 * @param {string}
 *            command Command to execute.
 * @return {Object|undefined} The result of the command.
 */
kemia.controller.plugins.Erase.prototype.execCommandInternal = function(
		command, value, active) {
	this.logger.info("active: " + active);
	this.isActive = active;

};

kemia.controller.plugins.Erase.prototype.handleMouseDown = function(e) {

	if (this.isActive) {
		this.editorObject.dispatchBeforeChange();
		var target = this.editorObject.findTarget(e);
		if (target instanceof kemia.model.Atom) {
			this.eraseAtom(target);
		}
		if (target instanceof kemia.model.Bond) {
			this.eraseBond(target);
		}
		if (target instanceof kemia.model.Molecule) {
			this.eraseMolecule(target);
		}
		if (target instanceof goog.math.Coordinate) {
			this.eraseArrowOrPlus(target);
		}
		this.editorObject.dispatchChange();
	}

};

kemia.controller.plugins.Erase.prototype.eraseAtom = function(atom) {
	var molecule = atom.molecule;
	goog.array.forEach(atom.bonds.getValues(), function(bond) {
		molecule.removeBond(bond);
	});
	molecule.removeAtom(atom);
	this.editorObject.setModels(this.editorObject.getModels());
};

kemia.controller.plugins.Erase.prototype.eraseBond = function(bond) {
	var molecule = bond.molecule;
	molecule.removeBond(bond);
	var fragments = molecule.getFragments();

	var reaction = molecule.reaction;
	if (reaction.isReactant(molecule)) {
		goog.array.forEach(fragments, function(mol) {
			reaction.addReactant(mol);
		});
	} else if (reaction.isProduct(molecule)) {
		goog.array.forEach(fragments, function(mol) {
			reaction.addProduct(mol);
		});
	}
	reaction.removeMolecule(molecule);

	this.editorObject.setModels(this.editorObject.getModels());

};

kemia.controller.plugins.Erase.prototype.eraseMolecule = function(molecule) {
	var reaction = molecule.reaction;
	reaction.removeMolecule(molecule);
	this.editorObject.setModels(this.editorObject.getModels());
}

kemia.controller.plugins.Erase.prototype.eraseArrowOrPlus = function(coord) {
	var reaction = coord.reaction;
	reaction.removeArrowOrPlus(coord);
	this.editorObject.setModels(this.editorObject.getModels());
};

goog.provide('kemia.view.ReactionRenderer');
goog.require('kemia.view.Renderer');
goog.require('kemia.controller.MoleculeController');
goog.require('kemia.controller.ArrowController');
goog.require('kemia.controller.PlusController');
goog.require('kemia.view.MoleculeRenderer');
goog.require('kemia.view.ArrowRenderer');
goog.require('kemia.view.PlusRenderer');
goog.require("goog.math.Coordinate");
goog.require("kemia.graphics.AffineTransform");

/**
 * Class to render a reaction object to a graphics object
 * 
 * @constructor
 * @param parentEventTarget
 *            {goog.events.EventTarget}
 * @param graphics
 *            {goog.graphics.AbstractGraphics} graphics to draw on.
 * @extends {kemia.view.Renderer}
 */
kemia.view.ReactionRenderer = function(controller, graphics, opt_config) {
	kemia.view.Renderer.call(this, controller, graphics, opt_config,
			kemia.view.ReactionRenderer.defaultConfig);
	this.scale_factor = 1;
	this.moleculeController = new kemia.controller.MoleculeController(
			controller);
	this.moleculeRenderer = new kemia.view.MoleculeRenderer(
			this.moleculeController, graphics, this.config);
	this.arrowController = new kemia.controller.ArrowController(controller);
	this.arrowRenderer = new kemia.view.ArrowRenderer(this.arrowController, graphics,
			this.config);
	this.plusController = new kemia.controller.PlusController(controller);
	this.plusRenderer = new kemia.view.PlusRenderer(this.plusController, graphics,
			this.config);
}
goog.inherits(kemia.view.ReactionRenderer, kemia.view.Renderer);
/**
 * 
 * @param {kemia.model.Reaction}
 *            reaction
 * @return {goog.graphics.GroupElement}
 */
kemia.view.ReactionRenderer.prototype.render = function(reaction) {
	var molecules = goog.array.concat(reaction.reactants, reaction.products);
	var box = this.boundingBox(molecules);
	var m = this.config.get("margin");
	box.expand(m.top, m.right, m.bottom, m.left);
	this.transform = this.buildTransform(box);
	
	goog.array.forEach(molecules, function(mol) {
		this.moleculeRenderer.render(mol, this.transform);
	}, this);
	goog.array.forEach(reaction.pluses, function(plus){
		this.plusRenderer.render(plus, this.transform);
	},this)
	goog.array.forEach(reaction.arrows, function(arrow){
		this.arrowRenderer.render(arrow, reaction.reagentsText, reaction.conditionsText, this.transform);
	},this)

}



/**
 * finds bounding box of an array of molecules
 * 
 * @param molecules
 *            {Array.<kemia.model.Molecule>}
 * @return {goog.math.Box}
 */

kemia.view.ReactionRenderer.prototype.boundingBox = function(molecules) {
	var atoms = goog.array.flatten(goog.array.map(molecules, function(mol) {
		return mol.atoms;
	}));
	var coords = goog.array.map(atoms, function(a) {
		return a.coord;
	})
	return goog.math.Box.boundingBox.apply(null, coords);
}

/**
 * Logging object.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.view.ReactionRenderer.prototype.logger = goog.debug.Logger
		.getLogger('kemia.view.ReactionRenderer');



/**
 * A default configuration for renderer
 */
kemia.view.ReactionRenderer.defaultConfig = {
	'margin' : 2
};

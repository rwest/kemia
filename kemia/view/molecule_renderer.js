goog.provide('kemia.view.MoleculeRenderer');
goog.require('kemia.controller.BondController');
goog.require('kemia.view.BondRenderer');
goog.require('kemia.view.BondRendererFactory');
goog.require('kemia.view.AtomRenderer');
goog.require('kemia.controller.AtomController');

/**
 * Class to render a molecule object to a graphics object
 * 
 * @constructor
 * @param graphics
 *            {goog.graphics.AbstractGraphics} graphics to draw on.
 * @extends {kemia.view.Renderer}
 */
kemia.view.MoleculeRenderer = function(controller, graphics, opt_config) {
	kemia.view.Renderer.call(this, controller, graphics, opt_config,
			kemia.view.MoleculeRenderer.defaultConfig);
	this.scale_factor = 1;
	this.bondController = new kemia.controller.BondController(controller);
	this.bondRendererFactory = new kemia.view.BondRendererFactory(
			this.bondController, graphics, this.config);
	this.atomController = new kemia.controller.AtomController(controller);
	this.atomRenderer = new kemia.view.AtomRenderer(this.atomController,
			graphics, this.config);
}
goog.inherits(kemia.view.MoleculeRenderer, kemia.view.Renderer);

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.view.MoleculeRenderer.prototype.logger = goog.debug.Logger
		.getLogger('kemia.view.MoleculeRenderer');

kemia.view.MoleculeRenderer.prototype.render = function(molecule, trans) {

	var atom_coords = goog.array.map(molecule.atoms, function(a) {
		return a.coord;
	});
	var box = goog.math.Box.boundingBox.apply(null, atom_coords);

	if (!trans) {
		// if not part of a reaction, we need to create a transform
		var m = this.config.get("margin");
		var ex_box = box.expand(m, m, m, m);
		trans = this.buildTransform(ex_box);
	}
	this.transform = trans;
	var center = new goog.math.Coordinate((box.left + box.right) / 2,
			(box.top + box.bottom) / 2);
	var t_center = this.transform.transformCoords( [ center ])[0];
	var rx = Math.abs(this.transform.getScaleX() * (box.right - box.left) / 2);
	var ry = Math.abs(this.transform.getScaleY() * (box.bottom - box.top) / 2);

	var bondStroke = new goog.graphics.Stroke(
			this.config.get("bond")['stroke']['width'],
			this.config.get("bond")['stroke']['color']);
	var bondFill = new goog.graphics.SolidFill(
			this.config.get("bond")['fill']['color']);

	var bondPath = new goog.graphics.Path();
	goog.array.forEach(molecule.bonds, function(bond) {
		this.bondRendererFactory.get(bond).render(bond, trans, bondPath);
	}, this);
	this.graphics.drawPath(bondPath, bondStroke, bondFill);

	// this.logger.info("molecule has " + molecule.atoms.length + " atoms");
	goog.array.forEach(molecule.atoms, function(atom) {
		this.atomRenderer.render(atom, trans);
	}, this);

};

kemia.view.MoleculeRenderer.prototype.highlightOn = function(molecule,
		opt_group) {
	if (!opt_group) {
		opt_group = this.graphics.createGroup();
	}
	goog.array.forEach(molecule.bonds, function(bond) {
		this.bondRendererFactory.get(bond).highlightOn(bond, opt_group);
	}, this);


	goog.array.forEach(molecule.atoms, function(atom) {
		this.atomRenderer.highlightOn(atom, opt_group);
	}, this);

	return opt_group;
}

/**
 * A default configuration for renderer
 */
kemia.view.MoleculeRenderer.defaultConfig = {
	'bond' : {
		'stroke' : {
			'width' : 2,
			'color' : 'black'
		},
		'fill' : {
			'color' : 'black'
		}
	},
	'margin' : 4
};

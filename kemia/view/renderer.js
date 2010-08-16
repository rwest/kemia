goog.provide("kemia.view.Renderer");
goog.require("goog.structs.Map");
goog.require("goog.debug.Logger");

/**
 * Abstract Class to render a model object to a graphics object
 * 
 * @constructor
 * @param controller
 *            {goog.events.EventTarget} controller for this view
 * @param graphics
 *            {goog.graphics.AbstractGraphics} graphics to draw on.
 * @param opt_config
 *            {object} config to override defaults
 * @defaultConfig {object} object holding default values
 */
kemia.view.Renderer = function(controller, graphics, opt_config,
		defaultConfig) {
	this.controller = controller;
	this.graphics = graphics;

	this.config = new goog.structs.Map(defaultConfig);
	if (opt_config) {
		this.config.addAll(opt_config); // merge optional config into
		// defaults
	}
}

kemia.view.Renderer.prototype.render = goog.abstractMethod;

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.view.Renderer.prototype.logger = goog.debug.Logger
		.getLogger('kemia.view.Renderer');

/**
 * 
 * @param {goog.math.Box}
 *            fromRect
 * @return {kemia.graphics.AffineTransform}
 */
kemia.view.Renderer.prototype.buildTransform = function(fromBox) {

	var size = goog.math.Rect.createFromBox(fromBox).getSize();
	var fromWidth = size.width;
	size.scaleToFit(this.graphics.getSize());
	var toWidth = size.width;

	var scale = this.scale_factor * toWidth / fromWidth;
	var top = Math.max(fromBox.top, fromBox.bottom);
	var left = Math.min(fromBox.left, fromBox.right);	
	var transform = new kemia.graphics.AffineTransform(scale, 0, 0, -scale,
			-left * scale, top * scale);

	return transform;
};

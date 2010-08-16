goog.provide('kemia.controller.plugins.Cleanup');
goog.require('goog.debug.Logger');
goog.require('kemia.layout.CoordinateGenerator');
/**
 * @constructor
 * @extends{kemian.controller.Plugin}s
 */
kemia.controller.plugins.Cleanup = function() {
	kemia.controller.Plugin.call(this);
}
goog.inherits(kemia.controller.plugins.Cleanup, kemia.controller.Plugin);

/**
 * Commands implemented by this plugin.
 * 
 * @enum {string}
 */
kemia.controller.plugins.Cleanup.COMMAND = "cleanup";

/** @inheritDoc */
kemia.controller.plugins.Cleanup.prototype.getTrogClassId = goog.functions
		.constant(kemia.controller.plugins.Cleanup.COMMAND);

/** @inheritDoc */
kemia.controller.plugins.Cleanup.prototype.isSupportedCommand = function(
		command) {
	return command == kemia.controller.plugins.Cleanup.COMMAND;
};

/** @inheritDoc */
kemia.controller.plugins.Cleanup.prototype.execCommand = function(command,
		var_args) {

	var models = this.editorObject.getModels();
	goog.array.forEach(models, function(model){
		if (model instanceof kemia.model.Molecule){
			var molecule = model;
			kemia.layout.CoordinateGenerator.generate(molecule);
		} else if (model instanceof kemia.model.Reaction){
			var reaction = model;
			goog.array.forEach(reaction.reactants, function(molecule){
				kemia.layout.CoordinateGenerator.generate(molecule);
			});
			goog.array.forEach(reaction.products, function(molecule){
				kemia.layout.CoordinateGenerator.generate(molecule);
			});
			reaction.removeOverlap();
		}
	});

	this.editorObject.setModels(this.editorObject.getModels());
};

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.Cleanup.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.Cleanup');

goog.provide('kemia.controller.plugins.Smiles');

goog.require('kemia.controller.Plugin');
goog.require('goog.functions');
goog.require('goog.debug.Logger');
goog.require('kemia.controller.plugins.AbstractDialogPlugin');

/**
 * plugin for entering SMILES
 * 
 * @constructor
 * @extends {kemia.controller.Plugin}
 */
kemia.controller.plugins.Smiles = function() {
	kemia.controller.Plugin.call(this);
};
goog.inherits(kemia.controller.plugins.Smiles, kemia.controller.plugins.AbstractDialogPlugin);

/** @inheritDoc */
kemia.controller.plugins.Smiles.prototype.getTrogClassId = goog.functions
		.constant('kemia.controller.plugins.Smiles');

/**
 * Logging object.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.Smiles.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.Smiles');

/**
 * Command implemented by this plugin.
 */
kemia.controller.plugins.Smiles.COMMAND = 'paste_smiles';



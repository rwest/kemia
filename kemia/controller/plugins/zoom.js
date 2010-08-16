goog.provide('kemia.controller.plugins.Zoom');
goog.require('goog.debug.Logger');

//goog.exportSymbol('kemia.controller.plugins.Zoom.COMMAND.ZOOM_IN', kemia.controller.plugins.Zoom.COMMAND.ZOOM_IN);
//goog.exportSymbol('kemia.controller.plugins.Zoom.COMMAND.ZOOM_OUT', kemia.controller.plugins.Zoom.COMMAND.ZOOM_OUT);

/**
 * @constructor
 * @extends{kemian.controller.Plugin}s
 */
kemia.controller.plugins.Zoom = function(){
	  kemia.controller.Plugin.call(this);
}
goog.inherits(kemia.controller.plugins.Zoom, kemia.controller.Plugin);

/**
 * Commands implemented by this plugin.
 * @enum {string}
 */
kemia.controller.plugins.Zoom.COMMAND = {
  ZOOM_IN: 'zoomIn',
  ZOOM_OUT: 'zoomOut'
};

/**
 * Inverse map of execCommand strings to
 * {@link kemia.controller.plugins.Zoom.COMMAND} constants. Used to determine
 * whether a string corresponds to a command this plugin handles 
 * @type {Object}
 * @private
 */
kemia.controller.plugins.Zoom.SUPPORTED_COMMANDS_ =
    goog.object.transpose(kemia.controller.plugins.Zoom.COMMAND);

/** @inheritDoc */
kemia.controller.plugins.Zoom.prototype.getTrogClassId =
    goog.functions.constant(kemia.controller.plugins.Zoom.COMMAND);


/** @inheritDoc */
kemia.controller.plugins.Zoom.prototype.isSupportedCommand = function(command) {
  return command in kemia.controller.plugins.Zoom.SUPPORTED_COMMANDS_;
};


/** @inheritDoc */
kemia.controller.plugins.Zoom.prototype.execCommand = function(command,
    var_args) {
	
	var current = this.editorObject.getScaleFactor();
  if (command == kemia.controller.plugins.Zoom.COMMAND.ZOOM_IN) {
	  this.editorObject.setScaleFactor(current*1.1);  
  } else if (command == kemia.controller.plugins.Zoom.COMMAND.ZOOM_OUT) {
	  this.editorObject.setScaleFactor(current*0.9);
  }

  this.editorObject.setModels(this.editorObject.getModels());
};


/**
 * The logger for this class.
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.Zoom.prototype.logger =
    goog.debug.Logger.getLogger('kemia.controller.plugins.Zoom');

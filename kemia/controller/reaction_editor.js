goog.provide("kemia.controller.ReactionEditor");
goog.provide("kemia.controller.ReactionEditor.EventType");
goog.require("kemia.controller.ReactionController");
goog.require("kemia.view.ReactionRenderer");
goog.require("kemia.view.MoleculeRenderer");
goog.require("goog.graphics");
goog.require('goog.events');
goog.require('goog.fx.Dragger');
goog.require('goog.fx.Dragger.EventType');
goog.require('goog.editor.BrowserFeature');
goog.require('goog.async.Delay');
goog.require('kemia.controller.Plugin');
goog.require('kemia.model.NeighborList');

/**
 * A graphical editor for reactions
 * 
 * 
 * @constructor
 * @extends {goog.events.EventTarget}
 */
kemia.controller.ReactionEditor = function(element, opt_config) {
	goog.events.EventTarget.call(this);
	this.originalElement = element;
	this.id = element.id;
	this.editableDomHelper = goog.dom.getDomHelper(element);
	this.models = [];
	/**
	 * Map of class id to registered plugin.
	 * 
	 * @type {Object}
	 * @private
	 */
	this.plugins_ = {};

	/**
	 * Plugins registered on this editor, indexed by the
	 * kemia.controller.Plugin.Op that they support.
	 * 
	 * @type {Object.<Array>}
	 * @private
	 */
	this.indexedPlugins_ = {};

	for ( var op in kemia.controller.Plugin.OPCODE) {
		this.indexedPlugins_[op] = [];
	}
	this.config = new goog.structs.Map(
			kemia.controller.ReactionEditor.defaultConfig);
	if (opt_config) {
		this.config.addAll(opt_config); // merge optional config into
		// defaults
	}

	this.graphics = goog.graphics.createGraphics(element.clientWidth,
			element.clientHeight);

	this.graphics.render(this.originalElement);

	this.reactionController = new kemia.controller.ReactionController(this);
	this.reactionRenderer = new kemia.view.ReactionRenderer(
			this.reactionController, this.graphics, this.config);

	this.isModified_ = false;
	this.isEverModified_ = false;


	/**
	 * @type {goog.events.EventHandler}
	 * @protected
	 */
	this.eventRegister = new goog.events.EventHandler(this);

	// Wrappers around this editor, to be disposed when the editor is disposed.
	this.wrappers_ = [];

	this.handleEditorLoad();

	this.loadState_ = kemia.controller.ReactionEditor.LoadState_.EDITABLE;

	this.isModified_ = false;
	this.isEverModified_ = false;

	// currently selected model objects
	this.selected = [];
	
	this.neighborList = [];

};
goog.inherits(kemia.controller.ReactionEditor, goog.events.EventTarget);


/**
 * Sets the active editor id.
 * 
 * @param {?string}
 *            editorId The active editor id.
 */
kemia.controller.ReactionEditor.setActiveEditorId = function(editorId) {
	kemia.controller.ReactionEditor.activeEditorId_ = editorId;
};

/**
 * @return {goog.dom.DomHelper?} The dom helper for the editable node.
 */
kemia.controller.ReactionEditor.prototype.getEditableDomHelper = function() {
	return this.editableDomHelper;
};

/**
 * @return {?string} The id of the active editor.
 */
kemia.controller.ReactionEditor.getActiveEditorId = function() {
	return kemia.controller.ReactionEditor.activeEditorId_;
};

kemia.controller.ReactionEditor.prototype.clear = function() {
	this.graphics.clear();
	this.models = [];
	var fill = new goog.graphics.SolidFill(this.config.get("background").color);

	this.graphics.drawRect(0, 0, this.graphics.getSize().width, this.graphics
			.getSize().height, null, fill);
}

kemia.controller.ReactionEditor.prototype.getScaleFactor = function() {
	return this.reactionRenderer.scale_factor;
}

kemia.controller.ReactionEditor.prototype.setScaleFactor = function(scale) {
	this.reactionRenderer.scale_factor = scale;
}

kemia.controller.ReactionEditor.prototype.setModels = function(models) {
	this.clear();
	this.models = models;
	var objects = goog.array.flatten(goog.array.map(models, function(model) {
		if (model instanceof kemia.model.Reaction) {
			if (model.pluses.length == 0) {
				model.generatePlusCoords(model.reactants);
				model.generatePlusCoords(model.products);
			}
			if (model.arrows.length == 0 && model.reactants.length>0 && model.products.length>0) {
				model.generateArrowCoords(model.reactants, model.products);
			}
			return goog.array.concat(model.reactants, model.products, model.pluses, model.arrows);
		} else {
			return [ model ];
		}
	}));
	
	if(objects.length>0){
		this.neighborList = new kemia.model.NeighborList(objects, 1, .5);
	}
	this.render();
}

kemia.controller.ReactionEditor.prototype.render = function() {
	goog.array.forEach(this.models, function(model) {

		if (model instanceof kemia.model.Reaction) {
			this.reactionRenderer.render(model);
		}
		if (model instanceof kemia.model.Molecule) {
			this.reactionRenderer.moleculeRenderer.render(model);
		}
	}, this);
}

/**
 * gets model
 * 
 * @return{Array.<kemia.model.Reaction | kemia.model.Molecule>}
 */
kemia.controller.ReactionEditor.prototype.getModels = function() {
	return this.models;
};

/**
 * This dispatches the beforechange event on the editable reaction editor
 */
kemia.controller.ReactionEditor.prototype.dispatchBeforeChange = function() {

	this
			.dispatchEvent(kemia.controller.ReactionEditor.EventType.BEFORECHANGE);
};


/**
 * Calls all the plugins of the given operation, in sequence, with the given
 * arguments. This is short-circuiting: once one plugin cancels the event, no
 * more plugins will be invoked.
 * 
 * @param {kemia.controller.Plugin.Op}
 *            op A plugin op.
 * @param {...*}
 *            var_args The arguments to the plugin.
 * @return {boolean} True if one of the plugins cancel the event, false
 *         otherwise.
 * @private
 */
kemia.controller.ReactionEditor.prototype.invokeShortCircuitingOp_ = function(
		op, var_args) {
	var plugins = this.indexedPlugins_[op];
	var argList = goog.array.slice(arguments, 1);
	for ( var i = 0; i < plugins.length; ++i) {
		// If the plugin returns true, that means it handled the event and
		// we shouldn't propagate to the other plugins.
		var plugin = plugins[i];
		if ((plugin.isEnabled(this) || kemia.controller.Plugin.IRREPRESSIBLE_OPS[op])
				&& plugin[kemia.controller.Plugin.OPCODE[op]].apply(plugin,
						argList)) {
			// Only one plugin is allowed to handle the event. If for some
			// reason
			// a plugin wants to handle it and still allow other plugins to
			// handle
			// it, it shouldn't return true.
			return true;
		}
	}

	return false;
};


/**
 * Handle a change in the Editor. Marks the editor as modified, dispatches the
 * change event on the editable field 
 */
kemia.controller.ReactionEditor.prototype.handleChange = function() {
	this.isModified_ = true;
	this.isEverModified_ = true;

};

/**
 * Handles keydown on the editor.
 * 
 * @param {goog.events.BrowserEvent}
 *            e The browser event.
 * @private
 */
kemia.controller.ReactionEditor.prototype.handleKeyDown_ = function(e) {

};

/**
 * Handles keypress on the field.
 * 
 * @param {goog.events.BrowserEvent}
 *            e The browser event.
 * @private
 */
kemia.controller.ReactionEditor.prototype.handleKeyPress_ = function(e) {
	this.gotGeneratingKey_ = true;
	this.dispatchBeforeChange();
	this.handleKeyboardShortcut_(e);
};

/**
 * Handles keyup on the editor.
 * 
 * @param {goog.events.BrowserEvent}
 *            e The browser event.
 * @private
 */
kemia.controller.ReactionEditor.prototype.handleKeyUp_ = function(e) {

	this.invokeShortCircuitingOp_(kemia.controller.Plugin.Op.KEYUP, e);
	this.selectionChangeTimer_.start();

};

kemia.controller.ReactionEditor.prototype.findTarget = function(e) {
	var trans = this.reactionRenderer.moleculeRenderer.transform.createInverse();
	var elem = e.currentTarget;

	var posx = e.clientX  + document.body.scrollLeft + document.documentElement.scrollLeft;
	var posy = e.clientY  + document.body.scrollTop + document.documentElement.scrollTop;
	
	posx -=elem.offsetLeft;
	posy -= elem.offsetTop;

    while (elem = elem.offsetParent) {
        posx -= elem.offsetLeft;
        posy -= elem.offsetTop;
}
	var target = trans.transformCoords( [ new goog.math.Coordinate(posx,
			posy) ])[0];
	var nearest = this.neighborList.getNearest( {
		x : target.x,
		y : target.y
	});

	return nearest;
}

kemia.controller.ReactionEditor.prototype.handleMouseOver_ = function(e) {
	this.invokeShortCircuitingOp_(kemia.controller.Plugin.Op.MOUSEOVER, e);
};

kemia.controller.ReactionEditor.prototype.handleMouseOut_ = function(e) {
	this.invokeShortCircuitingOp_(kemia.controller.Plugin.Op.MOUSEOUT, e);
};

kemia.controller.ReactionEditor.prototype.handleMouseMove_ = function(e) {
	this.invokeShortCircuitingOp_(kemia.controller.Plugin.Op.MOUSEMOVE, e);
};

kemia.controller.ReactionEditor.prototype.handleMouseUp_ = function(e) {
	this.invokeShortCircuitingOp_(kemia.controller.Plugin.Op.MOUSEUP, e);
}

kemia.controller.ReactionEditor.prototype.handleMouseDown_ = function(e) {
	this.invokeShortCircuitingOp_(kemia.controller.Plugin.Op.MOUSEDOWN, e);
};


/**
 * Gets the value of this command.
 * 
 * @param {string}
 *            command The command to check.
 * @param {boolean}
 *            isEditable Whether the field is currently editable.
 * @return {string|boolean|null} The state of this command. Null if not handled.
 *         False if the field is uneditable and there are no handlers for
 *         uneditable commands.
 * @private
 */
kemia.controller.ReactionEditor.prototype.queryCommandValueInternal_ = function(
		command, isEditable) {
	var plugins = this.indexedPlugins_[kemia.controller.Plugin.Op.QUERY_COMMAND];
	for ( var i = 0; i < plugins.length; ++i) {
		var plugin = plugins[i];
		if (plugin.isEnabled(this) && plugin.isSupportedCommand(command)
				&& (isEditable || plugin.activeOnUneditableEditors())) {
			return plugin.queryCommandValue(command);
		}
	}
	return isEditable ? null : false;
};

/**
 * Gets the value of command(s).
 * 
 * @param {string|Array.
 *            <string>} commands String name(s) of the command.
 * @return {*} Value of each command. Returns false (or array of falses) if
 *         designMode is off or the editor is otherwise uneditable, and there
 *         are no activeOnUneditable plugins for the command.
 */
kemia.controller.ReactionEditor.prototype.queryCommandValue = function(
		commands) {
	var isEditable = this.isLoaded();
	if (goog.isString(commands)) {
		return this.queryCommandValueInternal_(commands, isEditable);
	} else {
		var state = {};
		for ( var i = 0; i < commands.length; i++) {
			state[commands[i]] = this.queryCommandValueInternal_(commands[i],
					isEditable);
		}
		return state;
	}
};



/**
 * Dispatches the appropriate set of change events.
 * 
 */
kemia.controller.ReactionEditor.prototype.dispatchChange = function() {
	this.handleChange();

};


/**
 * Dispatches a command value change event.
 * 
 * @param {Array.
 *            <string>=} opt_commands Commands whose state has changed.
 */
kemia.controller.ReactionEditor.prototype.dispatchCommandValueChange = function(
		opt_commands) {
	if (opt_commands) {
		this
				.dispatchEvent( {
					type : kemia.controller.ReactionEditor.EventType.COMMAND_VALUE_CHANGE,
					commands : opt_commands
				});
	} else {
		this
				.dispatchEvent(kemia.controller.ReactionEditor.EventType.COMMAND_VALUE_CHANGE);
	}
};

/**
 * Executes an editing command as per the registered plugins.
 * 
 * @param {string}
 *            command The command to execute.
 * @param {...*}
 *            var_args Any additional parameters needed to execute the command.
 * @return {Object|boolean} False if the command wasn't handled, otherwise, the
 *         result of the command.
 */
kemia.controller.ReactionEditor.prototype.execCommand = function(command,
		var_args) {
	var args = arguments;
	var result;

	var plugins = this.indexedPlugins_[kemia.controller.Plugin.Op.EXEC_COMMAND];
	for ( var i = 0; i < plugins.length; ++i) {
		// If the plugin supports the command, that means it handled the
		// event and we shouldn't propagate to the other plugins.
		var plugin = plugins[i];
		if (plugin.isEnabled(this) && plugin.isSupportedCommand(command)) {
			result = plugin.execCommand.apply(plugin, args);
			break;
		}
	}

	return result;
};

/**
 * Registers the plugin with the editor.
 * 
 * @param {kemia.controller.Plugin}
 *            plugin The plugin to register.
 */
kemia.controller.ReactionEditor.prototype.registerPlugin = function(plugin) {
	var classId = plugin.getTrogClassId();

	if (this.plugins_[classId]) {
		this.logger
				.severe('Cannot register the same class of plugin twice [' + classId + ']');
	}
	this.plugins_[classId] = plugin;

	// Only key events and execute should have these has* functions with a
	// custom
	// handler array since they need to be very careful about performance.
	// The rest of the plugin hooks should be event-based.
	for ( var op in kemia.controller.Plugin.OPCODE) {
		var opcode = kemia.controller.Plugin.OPCODE[op];
		if (plugin[opcode]) {
			this.indexedPlugins_[op].push(plugin);
		}
	}
	plugin.registerEditorObject(this);

	// By default we enable all plugins for editors that are currently loaded.
	if (this.isLoaded()) {
		plugin.enable(this);
	}
};

/**
 * Unregisters the plugin with this editor.
 * 
 * @param {kemia.controller.Plugin}
 *            plugin The plugin to unregister.
 */
kemia.controller.ReactionEditor.prototype.unregisterPlugin = function(plugin) {
	var classId = plugin.getTrogClassId();
	if (!this.plugins_[classId]) {
		this.logger
				.severe('Cannot unregister a plugin that isn\'t registered.');
	}
	delete this.plugins_[classId];

	for ( var op in kemia.controller.Plugin.OPCODE) {
		var opcode = kemia.controller.Plugin.OPCODE[op];
		if (plugin[opcode]) {
			goog.array.remove(this.indexedPlugins_[op], plugin);
		}
	}

	plugin.unregisterEditorObject(this);
};

/**
 * @return {boolean} Whether the editor has finished loading.
 */
kemia.controller.ReactionEditor.prototype.isLoaded = function() {
	return this.loadState_ == kemia.controller.ReactionEditor.LoadState_.EDITABLE;
};

/**
 * The load state of the editor.
 * 
 * @enum {number}
 * @private
 */
kemia.controller.ReactionEditor.LoadState_ = {
	UNEDITABLE : 0,
	LOADING : 1,
	EDITABLE : 2
};

/**
 * Logging object.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.ReactionEditor.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.ReactionEditor');

/**
 * Event types that can be stopped/started.
 * 
 * @enum {string}
 */
kemia.controller.ReactionEditor.EventType = {
	/**
	 * Dispatched when the command state of the selection may have changed. This
	 * event should be listened to for updating toolbar state.
	 */
	COMMAND_VALUE_CHANGE : 'cvc',
	/**
	 * Dispatched when the editor is loaded and ready to use.
	 */
	LOAD : 'load',
	/**
	 * Dispatched when the editor is fully unloaded and uneditable.
	 */
	UNLOAD : 'unload',
	/**
	 * Dispatched before the editor contents are changed.
	 */
	BEFORECHANGE : 'beforechange',
	/**
	 * Dispatched when the editor contents change, in FF only. Used for internal
	 * resizing, please do not use.
	 */
	CHANGE : 'change'
};

/**
 * Removes all listeners and destroys the eventhandler object.
 * 
 * @override
 */
kemia.controller.ReactionEditor.prototype.disposeInternal = function() {
	if (this.isLoading() || this.isLoaded()) {
		this.logger.warning('Disposing an editor that is in use.');
	}

	if (this.getOriginalElement()) {
		this.execCommand(kemia.controller.Command.CLEAR);
	}

	this.tearDownEditorObject_();
	this.clearListeners_();
	this.originalDomHelper = null;

	if (this.eventRegister) {
		this.eventRegister.dispose();
		this.eventRegister = null;
	}

	this.removeAllWrappers();

	if (kemia.controller.ReactionEditor.getActiveEditorId() == this.id) {
		kemia.controller.ReactionEditor.setActiveEditorId(null);
	}

	for ( var classId in this.plugins_) {
		var plugin = this.plugins_[classId];
		if (plugin.isAutoDispose()) {
			plugin.dispose();
		}
	}
	delete (this.plugins_);

	kemia.controller.ReactionEditor.superClass_.disposeInternal.call(this);
};

/**
 * Returns the registered plugin with the given classId.
 * 
 * @param {string}
 *            classId classId of the plugin.
 * @return {kemia.controller.Plugin} Registered plugin with the given
 *         classId.
 */
kemia.controller.ReactionEditor.prototype.getPluginByClassId = function(
		classId) {
	return this.plugins_[classId];
};

/**
 * Help make the editor not editable by setting internal data structures to
 * null, and disabling this editor with all registered plugins.
 * 
 * @private
 */
kemia.controller.ReactionEditor.prototype.tearDownEditorObject_ = function() {
	for ( var classId in this.plugins_) {
		var plugin = this.plugins_[classId];
		if (!plugin.activeOnUneditableEditors()) {
			plugin.disable(this);
		}
	}

	this.loadState_ = kemia.controller.ReactionEditor.LoadState_.UNEDITABLE;

};

/**
 * @return {boolean} Whether the editor has finished loading.
 */
kemia.controller.ReactionEditor.prototype.isLoaded = function() {
	return this.loadState_ == kemia.controller.ReactionEditor.LoadState_.EDITABLE;
};

/**
 * @return {boolean} Whether the editor is in the process of loading.
 */
kemia.controller.ReactionEditor.prototype.isLoading = function() {
	return this.loadState_ == kemia.controller.ReactionEditor.LoadState_.LOADING;
};

/**
 * Returns original DOM element for the Editor null if that element has not yet
 * been found in the appropriate document.
 * 
 * @return {Element} The original element.
 */
kemia.controller.ReactionEditor.prototype.getOriginalElement = function() {
	return this.originalElement;
};

/**
 * Stops all listeners and timers.
 * 
 * @private
 */
kemia.controller.ReactionEditor.prototype.clearListeners_ = function() {
	if (this.eventRegister) {
		this.eventRegister.removeAll();
	}

};

/**
 * Removes all wrappers and destroys them.
 */
kemia.controller.ReactionEditor.prototype.removeAllWrappers = function() {
	var wrapper;
	while (wrapper = this.wrappers_.pop()) {
		wrapper.dispose();
	}
};

/**
 * Handle the loading of the editor (e.g. once the editor is ready to setup).
 * 
 * @protected
 */
kemia.controller.ReactionEditor.prototype.handleEditorLoad = function() {

	if (kemia.controller.ReactionEditor.getActiveEditorId() != this.id) {
		// this.execCommand(kemia.controller.Command.CLEAR_EDITOR);
	}

	this.setupChangeListeners_();
	this.dispatchLoadEvent_();

	// Enabling plugins after we fire the load event so that clients have a
	// chance to set initial field contents before we start mucking with
	// everything.
	for ( var classId in this.plugins_) {
		this.plugins_[classId].enable(this);
	}
};


/**
 * Signal that the editor is loaded and ready to use. Change events now are in
 * effect.
 * 
 * @private
 */
kemia.controller.ReactionEditor.prototype.dispatchLoadEvent_ = function() {
	this.installStyles();

	this.dispatchEvent(kemia.controller.ReactionEditor.EventType.LOAD);
};

/**
 * Registers a keyboard event listener on the editor. This is necessary for
 * Gecko since the fields are contained in an iFrame and there is no way to
 * auto-propagate key events up to the main window.
 * 
 * @param {string|Array.
 *            <string>} type Event type to listen for or array of event types,
 *            for example goog.events.EventType.KEYDOWN.
 * @param {Function}
 *            listener Function to be used as the listener.
 * @param {boolean=}
 *            opt_capture Whether to use capture phase (optional, defaults to
 *            false).
 * @param {Object=}
 *            opt_handler Object in whose scope to call the listener.
 */
kemia.controller.ReactionEditor.prototype.addListener = function(type,
		listener, opt_capture, opt_handler) {
	var elem = this.getOriginalElement();

	this.eventRegister.listen(elem, type, listener, opt_capture, opt_handler);
};

/**
 * Initialize listeners on the editor.
 * 
 * @private
 */
kemia.controller.ReactionEditor.prototype.setupChangeListeners_ = function() {

//	this.addListener(goog.events.EventType.KEYDOWN, this.handleKeyDown_);
//	this.addListener(goog.events.EventType.KEYPRESS, this.handleKeyPress_);
//	this.addListener(goog.events.EventType.KEYUP, this.handleKeyUp_);
	this.addListener(goog.events.EventType.MOUSEDOWN, this.handleMouseDown_);
//	this.addListener(goog.events.EventType.MOUSEOVER, this.handleMouseOver_);
//	this.addListener(goog.events.EventType.MOUSEOUT, this.handleMouseOut_);
	this.addListener(goog.events.EventType.MOUSEMOVE, this.handleMouseMove_);

};



/**
 * Installs styles if needed. Only writes styles when they can't be written
 * inline directly into the field.
 * 
 * @protected
 */
kemia.controller.ReactionEditor.prototype.installStyles = function() {
	if (this.cssStyles && this.shouldLoadAsynchronously()) {
		goog.style.installStyles(this.cssStyles, this.getElement());
	}
};

/**
 * A default configuration for the reaction editor.
 */
kemia.controller.ReactionEditor.defaultConfig = {
	background : {
		color : '#F0FFF0'
	},
	margin : {
		left : 1,
		right : 1,
		top : 1,
		bottom : 1
	}
};

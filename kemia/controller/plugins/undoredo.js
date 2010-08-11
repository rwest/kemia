goog.provide('kemia.controller.plugins.UndoRedo');
goog.require('goog.debug.Logger');
goog.require('goog.json');

// goog.exportSymbol('kemia.controller.plugins.UndoRedo.COMMAND.UNDO',
// kemia.controller.plugins.UndoRedo.COMMAND.UNDO);
// goog.exportSymbol('kemia.controller.plugins.UndoRedo.COMMAND.REDO',
// kemia.controller.plugins.UndoRedo.COMMAND.REDO);

/**
 * @constructor
 * @extends{kemian.controller.Plugin}s
 */
kemia.controller.plugins.UndoRedo = function() {
	kemia.controller.Plugin.call(this);

	/**
	 * The maximum number of states on the undo stack at any time. Used to limit
	 * the memory footprint of the undo-redo stack.
	 * 
	 * @type {number}
	 * @private
	 */
	this.maxUndoDepth_ = 100;

	/**
	 * The undo stack.
	 * 
	 * @type {Array}
	 * @private
	 */
	this.undoStack_ = [];

	/**
	 * The redo stack.
	 * 
	 * @type {Array}
	 * @private
	 */
	this.redoStack_ = [];

	this.currentState_ = null;
}
goog.inherits(kemia.controller.plugins.UndoRedo, kemia.controller.Plugin);

/**
 * Commands implemented by this plugin.
 * 
 * @enum {string}
 */
kemia.controller.plugins.UndoRedo.COMMAND = {
	UNDO : 'undo',
	REDO : 'redo'
};

kemia.controller.plugins.UndoRedo.SHORTCUTS = [ {
	id : 'undo',
	key : goog.events.KeyCodes.ESC
} ];

kemia.controller.plugins.UndoRedo.prototype.getKeyboardShortcuts = function() {
	return kemia.controller.plugins.UndoRedo.SHORTCUTS;
}

kemia.controller.plugins.UndoRedo.prototype.handleKeyboardShortcut = function(e) {
	var id = e.identifier;
	var shortcut = goog.array.find(kemia.controller.plugins.UndoRedo.SHORTCUTS,
			function(obj) {
				return obj.id == e.identifier
			});
	if (shortcut.id == 'undo') {
		this.undo();
		return true;
	}
}

/**
 * Inverse map of execCommand strings to
 * {@link kemia.controller.plugins.UndoRedo.COMMAND} constants. Used to
 * determine whether a string corresponds to a command this plugin handles
 * 
 * @type {Object}
 * @private
 */
kemia.controller.plugins.UndoRedo.SUPPORTED_COMMANDS_ = goog.object
		.transpose(kemia.controller.plugins.UndoRedo.COMMAND);

/** @inheritDoc */
kemia.controller.plugins.UndoRedo.prototype.getTrogClassId = function() {
	return 'UndoRedo';
};

/** @inheritDoc */
kemia.controller.plugins.UndoRedo.prototype.isSupportedCommand = function(
		command) {
	return command in kemia.controller.plugins.UndoRedo.SUPPORTED_COMMANDS_;
};

/** @inheritDoc */
kemia.controller.plugins.UndoRedo.prototype.execCommandInternal = function(
		command) {
	if (command == kemia.controller.plugins.UndoRedo.COMMAND.UNDO) {
		this.undo();
	} else if (command == kemia.controller.plugins.UndoRedo.COMMAND.REDO) {
		this.redo();
	}

};

/**
 * Clear the undo/redo stack.
 */
kemia.controller.plugins.UndoRedo.prototype.clearHistory = function() {
	if (this.undoStack_.length > 0 || this.redoStack_.length > 0) {
		this.undoStack_.length = 0;
		this.redoStack_.length = 0;
		this.dispatchStateChange_();
	}
};

/**
 * Before the editor changes, we want to save the state.
 * 
 * @param {goog.events.Event}
 *            e The event.
 * @private
 */
kemia.controller.plugins.UndoRedo.prototype.handleBeforeChange_ = function(e) {

	var editorObj = /** @type {kemia.controller.ReactionEditor} */
	(e.target);

	this.updateCurrentState_(editorObj);

};

/**
 * Helper method for saving state.
 * 
 * @param {kemia.controller.ReactionEditor}
 *            edtiorObj The field object.
 * @private
 */
kemia.controller.plugins.UndoRedo.prototype.updateCurrentState_ = function(
		editorObj) {
	// this.logger.info("updateCurrentState_");
	// this.logger.info(" undoStack_.length " + this.undoStack_.length);
	// this.logger.info(" redoStack_.length " + this.redoStack_.length);

	var content = editorObj.getModels();
	var serialized = "[]";
	if (content) {
		// serialize to json object
		serialized = goog.json.serialize(goog.array.map(editorObj.getModels(),
				kemia.io.json.reactionToJson));
		// this.logger.info(serialized);
	}

	var currentState = this.currentState_;

	if (currentState != serialized) {

		this.addState(currentState);
	}

	this.currentState_ = serialized;

	// this.logger.info(" undoStack_.length " + this.undoStack_.length);
	// this.logger.info(" redoStack_.length " + this.redoStack_.length);
};

/**
 * Add state to the undo stack. This clears the redo stack.
 * 
 * @param {object}
 *            state The state to add to the undo stack.
 */
kemia.controller.plugins.UndoRedo.prototype.addState = function(state) {

	this.undoStack_.push(state);
	if (this.undoStack_.length > this.maxUndoDepth_) {
		this.undoStack_.shift();

		// Clobber the redo stack.
		var redoLength = this.redoStack_.length;
		this.redoStack_.length = 0;

		this.dispatchEvent( {
			type : kemia.controller.plugins.UndoRedo.EventType.STATE_ADDED,
			state : state
		});

		// If the redo state had states on it, then clobbering the redo stack
		// above
		// has caused a state change.
		if (this.undoStack_.length == 1 || redoLength) {
			this.dispatchStateChange_();
		}
	}
};

/**
 * Dispatches a STATE_CHANGE event with this as the target.
 * 
 * @private
 */
kemia.controller.plugins.UndoRedo.prototype.dispatchStateChange_ = function() {
	this
			.dispatchEvent(kemia.controller.plugins.UndoRedo.EventType.STATE_CHANGE);
};

/**
 * Performs the undo operation of the state at the top of the undo stack, moving
 * that state to the top of the redo stack. If the undo stack is empty, does
 * nothing.
 */
kemia.controller.plugins.UndoRedo.prototype.undo = function() {
	this.logger.info('undo');
	this.shiftState_(this.undoStack_, this.redoStack_);
};

/**
 * Performs the redo operation of the state at the top of the redo stack, moving
 * that state to the top of the undo stack. If redo undo stack is empty, does
 * nothing.
 */
kemia.controller.plugins.UndoRedo.prototype.redo = function() {
	this.shiftState_(this.redoStack_, this.undoStack_);
};

/**
 * @return {boolean} Whether the undo stack has items on it, i.e., if it is
 *         possible to perform an undo operation.
 */
kemia.controller.plugins.UndoRedo.prototype.hasUndoState = function() {
	return this.undoStack_.length > 0;
};

/**
 * @return {boolean} Wether the redo stack has items on it, i.e., if it is
 *         possible to perform a redo operation.
 */
kemia.controller.plugins.UndoRedo.prototype.hasRedoState = function() {
	return this.redoStack_.length > 0;
};

/**
 * Move a state from one stack to the other, performing the appropriate undo or
 * redo action.
 * 
 * @param {Array}
 *            fromStack Stack to move the state from.
 * @param {Array}
 *            toStack Stack to move the state to.
 * @private
 */
kemia.controller.plugins.UndoRedo.prototype.shiftState_ = function(fromStack,
		toStack) {
	this.logger.info("shiftState");

	this.logger.info("    fromStack.length " + fromStack.length);
	this.logger.info("    toStack.length " + toStack.length);
	if (fromStack.length) {
		var state = fromStack.pop();

		// Push the current state into the to-stack.
		toStack.push(state);
		this.editorObject.setModels(goog.array.map(
				goog.json.unsafeParse(state), kemia.io.json.readReaction));

		// If either stack transitioned between 0 and 1 in size then the ability
		// to do an undo or redo has changed and we must dispatch a state
		// change.
		this.logger.info("    fromStack.length " + fromStack.length);
		this.logger.info("    toStack.length " + toStack.length);
		if (fromStack.length == 0 || toStack.length == 1) {
			this.dispatchStateChange_();
		}
	}
};

/** @inheritDoc */
kemia.controller.plugins.UndoRedo.prototype.enable = function(editorObject) {
	kemia.controller.plugins.UndoRedo.superClass_.enable.call(this,
			editorObject);

	this.eventHandler = new goog.events.EventHandler(this);

	this.eventHandler.listen(editorObject,
			kemia.controller.ReactionEditor.EventType.BEFORECHANGE,
			this.handleBeforeChange_);

	// We want to capture the initial state of a Trogedit field before any
	// editing has happened. This is necessary so that we can undo the first
	// change to a field, even if we don't handle beforeChange.
	this.updateCurrentState_(editorObject);
};

/** @inheritDoc */
kemia.controller.plugins.UndoRedo.prototype.disable = function(editorObject) {
	// Process any pending changes so we don't lose any undo-redo states that we
	// want prior to disabling undo-redo.
	editorObject.clearDelayedChange();

	this.eventHandler.dispose();
	this.eventHandler = null;
	this.currentState_ = null;

};

/** @inheritDoc */
kemia.controller.plugins.UndoRedo.prototype.disposeInternal = function() {
	goog.editor.plugins.UndoRedo.superClass_.disposeInternal.call(this);
	this.eventHandler.dispose();
	this.editorObject = null;

};

/**
 * Event types for the events dispatched by undo-redo
 * 
 * @enum {string}
 */
kemia.controller.plugins.UndoRedo.EventType = {
	/**
	 * Signifies that he undo or redo stack transitioned between 0 and 1 states,
	 * meaning that the ability to perform undo or redo operations has changed.
	 */
	STATE_CHANGE : 'state_change',

	/**
	 * Signifies that a state was just added to the undo stack. Events of this
	 * type will have a {@code state} property whose value is the state that was
	 * just added.
	 */
	STATE_ADDED : 'state_added',

	/**
	 * Signifies that the undo method of a state is about to be called. Events
	 * of this type will have a {@code state} property whose value is the state
	 * whose undo action is about to be performed. If the event is cancelled the
	 * action does not proceed, but the state will still transition between
	 * stacks.
	 */
	BEFORE_UNDO : 'before_undo',

	/**
	 * Signifies that the redo method of a state is about to be called. Events
	 * of this type will have a {@code state} property whose value is the state
	 * whose redo action is about to be performed. If the event is cancelled the
	 * action does not proceed, but the state will still transition between
	 * stacks.
	 */
	BEFORE_REDO : 'before_redo'
};

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.UndoRedo.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.UndoRedo');

/** @inheritDoc */
kemia.controller.plugins.UndoRedo.prototype.queryCommandValue = function(command) {
	var state = null;
	if (command == kemia.controller.plugins.UndoRedo.COMMAND.UNDO) {
		state = this.hasUndoState();
	} else if (command == goog.editor.plugins.UndoRedo.COMMAND.REDO) {
		state = this.hasRedoState();
	}
	return state;
};

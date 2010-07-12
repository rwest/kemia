goog.provide('kemia.controller.plugins.MoleculeEdit');
goog.require('kemia.controller.Plugin');
goog.require('goog.debug.Logger');
goog.require('kemia.model.Molecule');

/**
 * @constructor
 * @extends{kemia.controller.Plugin}s
 */
kemia.controller.plugins.MoleculeEdit = function() {
	kemia.controller.Plugin.call(this);

}
goog.inherits(kemia.controller.plugins.MoleculeEdit, kemia.controller.Plugin);

/**
 * Logging object.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.MoleculeEdit.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.MoleculeEdit');
/**
 * Command implemented by this plugin.
 */
kemia.controller.plugins.MoleculeEdit.COMMAND = 'selectMolecule';

/** @inheritDoc */
kemia.controller.plugins.MoleculeEdit.prototype.isSupportedCommand = function(
		command) {
	return command == kemia.controller.plugins.MoleculeEdit.COMMAND;
};

/** @inheritDoc */
kemia.controller.plugins.MoleculeEdit.prototype.getTrogClassId = goog.functions
		.constant(kemia.controller.plugins.MoleculeEdit.COMMAND);

/**
 * The logger for this class.
 * 
 * @type {goog.debug.Logger}
 * @protected
 */
kemia.controller.plugins.MoleculeEdit.prototype.logger = goog.debug.Logger
		.getLogger('kemia.controller.plugins.MoleculeEdit');

kemia.controller.plugins.MoleculeEdit.prototype.handleMouseDown = function(e) {

	// if (this.isActive) {
	this.editorObject.dispatchBeforeChange();
	var target = this.editorObject.findTarget(e);

	if (target instanceof kemia.model.Molecule) {
		if(e.shiftKey){
			this.rotate(e, target);
		}else{
			this.drag(e, target);
		}
	}
	this.editorObject.dispatchChange();
	// }
};

kemia.controller.plugins.MoleculeEdit.prototype.drag = function(e, molecule) {

	var d = new goog.fx.Dragger(this.editorObject.getOriginalElement());
	d._prevX = e.clientX;
	d._prevY = e.clientY;
	d._startX = e.clientX;
	d._startY = e.clientY;
	d.group = molecule.group;
	d.molecule = molecule;
	d.editor = this.editorObject;
	d.addEventListener(goog.fx.Dragger.EventType.DRAG, function(e) {

		// goog.array.forEach(d.molecule.getChildren(), function(child) {
			var g_trans = d.group.getTransform();
			var newX = e.clientX - d._prevX + g_trans.getTranslateX();
			var newY = e.clientY - d._prevY + g_trans.getTranslateY();
			d.group.setTransformation(newX, newY, 0, 0, 0);
			// });

			d._prevX = e.clientX;
			d._prevY = e.clientY;

		});
	d
			.addEventListener(
					goog.fx.Dragger.EventType.END,
					function(e) {
						var trans = new goog.graphics.AffineTransform.getTranslateInstance(
								e.clientX - d._startX, e.clientY - d._startY);

						var coords = d.editor.reactionRenderer.transform
								.createInverse()
								.transformCoords(
										[
												new goog.math.Coordinate(
														e.clientX, e.clientY),
												new goog.math.Coordinate(
														d._startX, d._startY) ]);
						var diff = goog.math.Coordinate.difference(coords[0]
								, coords[1]);

						d.molecule.reaction.translateMolecule(d.molecule, diff);
						d.editor.setModels(d.editor.getModels());
						d.dispose();
					});
	d.startDrag(e);
};

kemia.controller.plugins.MoleculeEdit.prototype.rotate = function(e, molecule) {

	var d = new goog.fx.Dragger(this.editorObject.getOriginalElement());
	var elem = e.currentTarget;

	var centerX = e.clientX  + document.body.scrollLeft + document.documentElement.scrollLeft;
	var centerY= e.clientY  + document.body.scrollTop + document.documentElement.scrollTop;
	
	centerX -=elem.offsetLeft;
	centerY -= elem.offsetTop;

    while (elem = elem.offsetParent) {
        centerX -= elem.offsetLeft;
        centerY -= elem.offsetTop;
    }
    
    d._center = new goog.math.Coordinate(centerX, centerY);
	d.group = molecule.group;
	d.molecule = molecule;
	d.editor = this.editorObject;
	d.addEventListener(goog.fx.Dragger.EventType.DRAG, function(e) {		
			var g_trans = d.group.getTransform();
			d.group.setTransformation(0, 0, d.deltaX + d.deltaY, d._center.x, d._center.y);

		});
	d
			.addEventListener(
					goog.fx.Dragger.EventType.END,
					
					function(e) {
						var center = d.editor.reactionRenderer.transform.createInverse().transformCoords([d._center ])[0];
						d.molecule.reaction.rotateMolecule(d.molecule, -(d.deltaX + d.deltaY), center);
						d.editor.setModels(d.editor.getModels());
						d.dispose();
					});
	d.startDrag(e);
};

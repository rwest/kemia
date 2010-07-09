goog.provide('kemia.view.ArrowRenderer');
goog.require('kemia.view.Renderer');
goog.require('goog.graphics');

/**
 * Class to render an Arrow object to a graphics object
 * 
 * @constructor
 * @param graphics
 *            {goog.graphics.AbstractGraphics} graphics to draw on.
 * @extends {kemia.view.Renderer}
 */
kemia.view.ArrowRenderer = function(controller, graphics, opt_config) {
	kemia.view.Renderer.call(this, controller, graphics, opt_config,
			kemia.view.ArrowRenderer.defaultConfig);
}
goog.inherits(kemia.view.ArrowRenderer, kemia.view.Renderer);

kemia.view.ArrowRenderer.prototype.render = function(coord, reagents_text,
		conditions_text, transform) {
	this.transform = transform;

	var w = this.config.get('arrow')['width'];
	var h = this.config.get('arrow')['height'];

	var nock = new goog.math.Coordinate(coord.x - w / 2, coord.y);
	var tip = new goog.math.Coordinate(nock.x + w, nock.y);
	var head1 = new goog.math.Coordinate(tip.x - h, tip.y + h / 2);
	var head2 = new goog.math.Coordinate(tip.x - h, tip.y - h / 2);
	var reagents = new goog.math.Coordinate(coord.x , coord.y+h);
	var conditions = new goog.math.Coordinate(coord.x , coord.y-h);

	var path = new goog.graphics.Path();
	var arrowStroke = new goog.graphics.Stroke(
			this.config.get("arrow")['stroke']['width'], this.config
					.get("arrow")['stroke']['color']);
	var textStroke = new goog.graphics.Stroke(this.config.get("arrow")['font']['stroke']['width'], this.config.get("arrow")['font']['stroke']["color"]);
	var fill = new goog.graphics.SolidFill(this.config.get("arrow")['font']['stroke']["color"]);

	var scale = transform.getScaleX();

	var fontSize = (scale / 1.8) > 12 ? 15 : (scale / 1.8);
	var font = new goog.graphics.Font(fontSize,
			this.config.get("arrow")['font']['name']);

	var coords = transform.transformCoords( [ nock, tip, head1, head2, reagents, conditions ]);

	path.moveTo(coords[0].x, coords[0].y);
	path.lineTo(coords[1].x, coords[1].y);
	path.lineTo(coords[2].x, coords[2].y);
	path.moveTo(coords[1].x, coords[1].y);
	path.lineTo(coords[3].x, coords[3].y);

	this.graphics.drawText(reagents_text, coords[4].x, coords[4].y, w, h ,
			'center', 'bottom', font, textStroke, fill);
	this.graphics.drawText(conditions_text, coords[5].x, coords[5].y, w , h ,
			'center', 'top', font, textStroke, fill);

	// visible arrow
	this.graphics.drawPath(path, arrowStroke);
}

kemia.view.ArrowRenderer.prototype.highlightOn = function(coord,
		opt_group) {
	if (!opt_group) {
		opt_group = this.graphics.createGroup();
	}
	var color = this.config.get("arrow")['highlight']["color"];
	var stroke = null;
	var fill = new goog.graphics.SolidFill(color, .3);
	var radius = this.config.get("arrow")['highlight']['radius'] * this.transform.getScaleX();
	var coords = this.transform.transformCoords( [ coord ])[0];
	this.graphics.drawCircle(coords.x, coords.y, radius, stroke, fill,
			opt_group);
	
	return opt_group;
}

/**
 * A default configuration for renderer
 */
kemia.view.ArrowRenderer.defaultConfig = {
	'arrow' : {
		'width' : 2,
		'height' : .5,
		'stroke' : {
			'width' : 2,
			'color' : "black"
		},
		'fill' : {
			'color' : 'black'
		},
		'font' : {
			'name' : "Arial",
			'stroke' : {
				'width' : .1,
				'color' : 'grey'
			}
		},
		'highlight' : {
			'radius' : .5,
			'color' : 'grey'
		}
	}
}

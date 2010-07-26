goog.require('goog.testing.jsunit');
goog.require('kemia.layout.RingPlacer');
goog.require('kemia.io.smiles');

function testGetRingCenterOfFirstRing() {
	var mol = kemia.io.smiles.parse('c1ccccc1');
	var center = kemia.layout.RingPlacer.getRingCenterOfFirstRing(mol
			.getRings()[0], new kemia.layout.Vector2D(1, 1), 1.25)
	assertEquals(-0.7654655446197434, center.x);
	assertEquals(0.7654655446197435, center.y);
}

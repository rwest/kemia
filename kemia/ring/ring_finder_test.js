goog.require('kemia.ring.RingFinder');
goog.require('goog.testing.jsunit');
goog.require('kemia.io.smiles.SmilesParser');
goog.require('kemia.io.mdl');

var testAzulene = function() {
//	var mol = kemia.io.smiles.parse('c1cccc2cccc2c1');
	var mol = kemia.io.mdl.readMolfile(azulene);
	var rings = kemia.ring.RingFinder.findRings(mol);
	assertEquals('should find 2 rings', 2, rings.length);	
}

var testAlphaPinene = function() {
//	var mol = kemia.io.smiles.SmilesParser.parse('CC1=CCC2CC1C2(C)C');
	var mol=kemia.io.mdl.readMolfile(alpha_pinene);
	var rings = kemia.ring.RingFinder.findRings(mol);
	assertEquals('should find 2 rings', 2, rings.length);
}

function testBiphenyl(){
//	var mol = kemia.io.smiles.SmilesParser.parse('c1ccccc1(c2ccccc2)');
	var mol = kemia.io.mdl.readMolfile(biphenyl);
	var rings = kemia.ring.RingFinder.findRings(mol);
	assertEquals('should find 2 rings', 2, rings.length);
}

function testSpiro45Decane(){
//	var mol = kemia.io.smiles.SmilesParser.parse('O=C1CCC(=O)C12CCCCC2');
	var mol=kemia.io.mdl.readMolfile(spiro_decane);
	var rings = kemia.ring.RingFinder.findRings(mol);
	assertEquals('should find 2 rings', 2, rings.length);
}
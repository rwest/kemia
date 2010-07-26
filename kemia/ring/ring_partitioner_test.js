goog.require('goog.testing.jsunit');
goog.require('kemia.ring.RingPartitioner');
goog.require('kemia.io.mdl');

function testDirectlyConnectedRings() {
	var a1 = new kemia.model.Atom("C");
	var a2 = new kemia.model.Atom("N");
	var a3 = new kemia.model.Atom("O");
	var ring1 = new kemia.ring.Ring( [ a1, a2 ]);
	var ring2 = new kemia.ring.Ring( [ a2, a3 ]);
	var ring3 = new kemia.ring.Ring( [ a3 ]);
	var direct_connect = kemia.ring.RingPartitioner.directConnectedRings(ring1,
			[ ring1, ring2, ring3 ]);
	assertEquals('should be two rings', 2, direct_connect.length);
	assertTrue(goog.array.contains(direct_connect, ring1));
	assertTrue(goog.array.contains(direct_connect, ring2));
	assertFalse(goog.array.contains(direct_connect, ring3));
}

function testAlphaPinene() {
	var mol = kemia.io.mdl.readMolfile(alpha_pinene);
	var sssr = mol.getRings();
	var ring_set = kemia.ring.RingPartitioner.getPartitionedRings(sssr);
	assertEquals('one ring set', 1, ring_set.length);
	assertEquals('two rings in ring set', 2, ring_set[0].length);
	assertEquals(4, ring_set[0][0].atoms.length);
	assertEquals(6, ring_set[0][1].atoms.length);
}

function testAzulene() {
	var mol = kemia.io.mdl.readMolfile(azulene);
	var sssr = mol.getRings();
	var ring_set = kemia.ring.RingPartitioner.getPartitionedRings(sssr);
	assertEquals('one ring set', 1, ring_set.length);
}

function testBiphenyl() {
	var mol = kemia.io.mdl.readMolfile(biphenyl);
	var sssr = mol.getRings();
	var ring_set = kemia.ring.RingPartitioner.getPartitionedRings(sssr);
	assertEquals('two ring sets', 2, ring_set.length);
}

function testSpiroRings() {
	var mol = kemia.io.mdl.readMolfile(spiro_decane);
	var sssr = mol.getRings();
	var ring_set = kemia.ring.RingPartitioner.getPartitionedRings(sssr);
	assertEquals('one ring set', 1, ring_set.length);
	assertEquals('two rings', 2, ring_set[0].length);
}

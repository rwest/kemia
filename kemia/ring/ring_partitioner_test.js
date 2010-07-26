goog.require('goog.testing.jsunit');
goog.require('kemia.ring.RingPartitioner');
goog.require('kemia.io.mdl');

function testAlphaPinene(){
	var mol=kemia.io.mdl.readMolfile(alpha_pinene);
	var sssr = mol.getRings();
	var rp = new kemia.ring.RingPartitioner(sssr);
	var ring_set = rp.getPartitionedRings();
	assertEquals('one ring set', 1, ring_set.length);
	assertEquals('two rings', 2, ring_set[0].length);
	assertEquals(4, ring_set[0][0].atoms.length);
	assertEquals(6, ring_set[0][1].atoms.length);
}

function testAzulene(){
	var mol=kemia.io.mdl.readMolfile(azulene);
	var sssr = mol.getRings();
	var rp = new kemia.ring.RingPartitioner(sssr);
	var ring_set = rp.getPartitionedRings();
	assertEquals('one ring set', 1, ring_set.length);
}

function testBiphenyl(){
	var mol=kemia.io.mdl.readMolfile(biphenyl);
	var sssr = mol.getRings();
	var rp = new kemia.ring.RingPartitioner(sssr);
	var ring_set = rp.getPartitionedRings();
	assertEquals('two ring sets', 2, ring_set.length);
}

function testSpiroRings(){
	var mol=kemia.io.mdl.readMolfile(spiro_decane);
	var sssr = mol.getRings();
	var rp = new kemia.ring.RingPartitioner(sssr);
	var ring_set = rp.getPartitionedRings();
	assertEquals('one ring set', 1, ring_set.length);
	assertEquals('two rings', 2, ring_set[0].length);
}




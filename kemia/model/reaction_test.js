goog.require('kemia.model.Reaction');
goog.require('goog.testing.jsunit');

var testRemoveOverlap = function() { 
	var mol1=new kemia.model.Molecule();
	mol1.addAtom(new kemia.model.Atom("C", -1, -1));
	mol1.addAtom(new kemia.model.Atom("C", 1, 1));
	
	var mol2 = new kemia.model.Molecule();
	mol2.addAtom(new kemia.model.Atom("O", -2, -2));
	mol2.addAtom(new kemia.model.Atom("O", 0, 0));
	
	var rxn = new kemia.model.Reaction();
	rxn.addReactant(mol1);
	rxn.addProduct(mol2);
	
	var bbox = rxn.boundingBox(goog.array.concat(rxn.reactants, rxn.products));
	assertEquals(3, bbox.right - bbox.left);
	rxn.removeOverlap();
	var bbox = rxn.boundingBox(goog.array.concat(rxn.reactants, rxn.products));
	assertEquals(4, bbox.right - bbox.left);
	
	}; 
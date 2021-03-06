goog.provide('kemia.model.Molecule');
goog.require('goog.array');
goog.require('kemia.ring.RingFinder');
goog.require('kemia.model.Atom');

/**
 * Class representing a Molecule
 * 
 * @param {string=}
 *            opt_name, Name of molecule, defaults to empty string.
 * @constructor
 */
kemia.model.Molecule = function(opt_name) {
	/**
	 * bonds belonging to this molecule
	 * 
	 * @type {Array.<kemia.model.Bond>}
	 * 
	 */
	this.bonds = [];

	/**
	 * atoms belonging to this molecule
	 * 
	 * @type {Array.<kemia.model.Atom>}
	 */
	this.atoms = [];

	/**
	 * name of molecule
	 * 
	 * @type {string}
	 */
	this.name = opt_name ? opt_name : "";

	/**
	 * SSSR calculated for this molecule
	 */
	this.sssr = [];
	this.mustRecalcSSSR = true;

	/**
	 * Keep track of fragments, this avoids the need to ever compute it which is
	 * potentially time consuming. This array stores the fragment index for each
	 * atom.
	 */
	this.fragments = [];
	this.fragmentCount = 0;

};

/**
 * Add a bond to molecule.
 * 
 * @param {kemia.model.Bond}
 *            bond The bond to add.
 */

kemia.model.Molecule.prototype.addBond = function(bond) {
	var sourceIndex = this.indexOfAtom(bond.source);
	var targetIndex = this.indexOfAtom(bond.target);
	// check if the bond connects two previously unconnected fragments
	if (this.fragments[sourceIndex] != this.fragments[targetIndex]) {
		var before, after;
		if (this.fragments[sourceIndex] < this.fragments[targetIndex]) {
			before = this.fragments[sourceIndex];
			after = this.fragments[targetIndex];
		} else {
			after = this.fragments[sourceIndex];
			before = this.fragments[targetIndex];
		}

		this.fragmentCount--;

		for ( var i = 0, li = this.atoms.length; i < li; i++) {
			if (this.fragments[i] == before) {
				this.fragments[i] = after;
			}
		}
	}
	this.bonds.push(bond);
	bond.source.bonds.add(bond);
	bond.target.bonds.add(bond);
	bond.molecule = this;
};

/**
 * Get the atom of given id.
 * 
 * @param {number}
 *            id The atom id.
 * @return {kemia.model.Atom}
 */

kemia.model.Molecule.prototype.getAtom = function(id) {
	return this.atoms[id];
};

/**
 * Get the bond of given id.
 * 
 * @param {number}
 *            id The bond id.
 * @return {kemia.model.Bond}
 */

kemia.model.Molecule.prototype.getBond = function(id) {
	return this.bonds[id];
};

/**
 * Find the bond between two given atoms if it exists. Otherwise return null.
 * 
 * @param {Object}
 *            atom1
 * @param {Object}
 *            atom2
 * @return{kemia.model.Bond}
 */
kemia.model.Molecule.prototype.findBond = function(atom1, atom2) {
	var bonds = atom1.bonds.getValues();
	for ( var i = 0, li = bonds.length; i < li; i++) {
		var bond = bonds[i];
		if (bond.otherAtom(atom1) == atom2) {
			return bond;
		}
	}
	return null;
};

/**
 * Return id of given atom. If not found, return -1;
 * 
 * @param {kemia.model.Atom}
 *            atom The atom to lookup.
 * @return{kemia.model.number}
 */
kemia.model.Molecule.prototype.indexOfAtom = function(atom) {
	return goog.array.indexOf(this.atoms, atom);
};

/**
 * Return id of given bond. If not found, return -1;
 * 
 * @param {kemia.model.Bond}
 *            bond The bond to lookup.
 * @return{kemia.model.number}
 */
kemia.model.Molecule.prototype.indexOfBond = function(bond) {
	return goog.array.indexOf(this.bonds, bond);
};

/**
 * Remove a atom from molecule.
 * 
 * @param {number|kemia.model.Atom}
 *            Instance or id of the atom to remove.
 */

kemia.model.Molecule.prototype.removeAtom = function(atomOrId) {
	var atom;
	if (atomOrId.constructor == Number) {
		atom = this.atoms[atomOrId];
	} else if (atomOrId.constructor == kemia.model.Atom) {
		atom = atomOrId;
	}
	var neighborBonds = atom.bonds.getValues();
	var molBonds = this.bonds; // for bond reference in anonymous method
	goog.array.forEach(neighborBonds, function(element, index, array) {
		goog.array.remove(molBonds, element);
	});
	atom.bonds.clear();
	goog.array.remove(this.atoms, atom);
	atom.molecule = undefined;

};

/**
 * Remove a bond from molecule.
 * 
 * @param {number|kemia.model.Bond}
 *            Instance or id of the bond to remove.
 */

kemia.model.Molecule.prototype.removeBond = function(bondOrId) {
	var bond;
	if (bondOrId.constructor == Number) {
		bond = this.bonds[bondOrId];
	} else {
		bond = bondOrId;
	}
	bond.source.bonds.remove(bond);
	bond.target.bonds.remove(bond);
	if (bond.source.bonds.length == 0) {
		goog.array.remove(this.atoms, bond.source);
		bond.source.molecule = undefined;
	}
	if (bond.target.bonds.length == 0) {
		goog.array.remove(this.atoms, bond.target);
		bond.target.molecule = undefined;

	}
	goog.array.remove(this.bonds, bond);
	bond.molecule = undefined;
	bond.source = undefined;
	bond.target = undefined;
};

/**
 * Count atoms.
 * 
 * @return{number}
 */
kemia.model.Molecule.prototype.countAtoms = function() {
	return this.atoms.length;
};

/**
 * Count bonds.
 */
kemia.model.Molecule.prototype.countBonds = function() {
	return this.bonds.length;
};

/**
 * Add an atom to molecule.
 * 
 * @param {kemia.model.Atom}
 *            atom The atom to add.
 */
kemia.model.Molecule.prototype.addAtom = function(atom) {
	var index = this.atoms.length;
	// a new atom is always a new fragment
	this.fragmentCount++;
	this.fragments[index] = this.fragmentCount;
	this.atoms.push(atom);
	atom.molecule = this;
};

/**
 * Get rings found in this molecule
 * 
 * @return{Array.<kemia.ring.Ring>}
 */
kemia.model.Molecule.prototype.getRings = function() {

	if (this.mustRecalcSSSR) {
		this.mustRecalcSSSR = false;
		this.sssr = kemia.ring.RingFinder.findRings(this);
	}
	return this.sssr;
};

/**
 * Checks if atom is in a ring
 * 
 * @return{boolean
 */
kemia.model.Molecule.prototype.isAtomInRing = function(atom_) {
    rings = this.getRings();
	for(r=0,ringCount=rings.length; r<ringCount; r++) { 
        for (a = 0, atomCount = rings[r].atoms.length; a < atomCount; a++) {
			if (atom_ == rings[r].atoms[a]) {
				return true;
			}
		}
	}
    return false;
};

/**
 * Checks if bond is in a ring
 * 
 * @return{boolean
 */
kemia.model.Molecule.prototype.isBondInRing = function(bond_) {
    rings = this.getRings();
    for(r=0,ringCount=rings.length; r<ringCount; r++) { 
        for (b = 0, bondCount = rings[r].bonds.length; b < bondCount; b++) {
            if (bond_ == rings[r].bonds[b]) {
                return true;
            }
        }
    }
    return false;
};


/**
 * clone (shallow) this molecule
 * 
 * @return{kemia.model.Molecule}
 */
kemia.model.Molecule.prototype.clone = function() {
	var mol = new kemia.model.Molecule(this.name);
	goog.array.forEach(this.atoms, function(atom) {
		mol.addAtom(atom);
	});
	goog.array.forEach(this.bonds, function(bond) {
		mol.addBond(bond);
	});
	return mol;
};

/**
 * returns fragments as array of molecules
 * 
 * @return{Array.<kemia.model.Molecule>}
 */
kemia.model.Molecule.prototype.getFragments = function() {
	var mol = this.clone();
	if (mol.fragmentCount == 1) {
		return [ mol ];
	}
	var fragments = new goog.structs.Map();
	goog.array.forEach(mol.atoms, function(atom) {
		var frag = mol.fragments[mol.indexOfAtom(atom)];
		if (fragments.containsKey(frag) == false) {
			fragments.set(frag, new kemia.model.Molecule());
		}
		fragments.get(frag).addAtom(atom);
	});
	goog.array.forEach(mol.bonds, function(bond) {
		var frag = mol.fragments[mol.indexOfAtom(bond.source)];
		fragments.get(frag).addBond(bond);
	});
	return fragments.getValues();

};

/**
 * Returns all bonds connected to the given atom.
 * 
 */
kemia.model.Molecule.prototype.getConnectedBondsList = function(atom) {
	bondsList = new Array();
	bondCount = this.bonds.length;
	for (i = 0; i < bondCount; i++) {
		if (this.bonds[i].source == atom || this.bonds[i].target == atom)
			bondsList.push(this.bonds[i]);
	}
	return bondsList;
};

/**
 * string representation of molecule
 * 
 * @return {string}
 */
kemia.model.Molecule.prototype.toString = function() {
	return goog.array.map(this.atoms, function(atom) {
		return atom.symbol + atom.index + atom.coord.toString();
	});
};
/**
 * returns center coordinates of molecule's atoms
 * 
 * @return {goog.math.Coordinate}
 */
kemia.model.Molecule.prototype.getCenter = function() {
	var box = this.getBoundingBox();
	return new goog.math.Coordinate((box.left + box.right) / 2,
			(box.top + box.bottom) / 2);
};

/**
 * returns bounding box of molecule's atoms
 * 
 * @return {goog.math.Box}
 */
kemia.model.Molecule.prototype.getBoundingBox = function() {
	return goog.math.Box.boundingBox.apply(null, goog.array.map(this.atoms,
			function(a) {
				return a.coord;
			}));
}
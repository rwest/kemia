//License and copyright

/**
 * @fileoverview io utility functions and factory methods for JSON formats
 */
goog.provide('kemia.io.json');

goog.require('kemia.model.Reaction');
goog.require('kemia.model.Molecule');
goog.require('kemia.model.Bond');
goog.require('kemia.model.Atom');
goog.require('goog.json');
goog.require('goog.array');

goog.exportSymbol('kemia.io.json.readReaction', kemia.io.json.readReaction);


/**
 * uses JSON.parse and .stringify; needs def for IE and ?? This allows for a
 * JSON external representation that uses bond atom-index instead of atom
 * objects. So, there are 3 types of things of import here: 1. The actual
 * Molecule object (typically mol here) 2. The object (typically jmol here) in
 * which bond's atom objects are recast as atom indexes 3. The string
 * representaion of jmol There is not use for the JSON string represention of
 * the actual Molecule object.
 */

/**
 * enum for bond types
 * 
 * @enum {string}
 */ 
kemia.io.json.BondType = {
		SINGLE_BOND:"SINGLE_BOND",
		DOUBLE_BOND:"DOUBLE_BOND",		
		TRIPLE_BOND:"TRIPLE_BOND",
		QUADRUPLE_BOND:"QUADRUPLE_BOND",
		AROMATIC:"AROMATIC",
		SINGLE_OR_DOUBLE:"SINGLE_OR_DOUBLE",
		SINGLE_OR_AROMATIC:"SINGLE_OR_AROMATIC",
		DOUBLE_OR_AROMATIC:"DOUBLE_OR_AROMATIC",
		ANY:"ANY"
};

/**
 * enum for stereo types
 * 
 * @enum {string}
 */ 
kemia.io.json.StereoType = {
		NOT_STEREO:"NOT_STEREO",
		SINGLE_BOND_UP:"SINGLE_BOND_UP",
		SINGLE_BOND_UP_OR_DOWN:"SINGLE_BOND_UP_OR_DOWN",
		SINGLE_BOND_DOWN:"SINGLE_BOND_DOWN"
};

/**
 * maps bond class to bond type code
 * 
 * @param{kemia.model.Bond} bond
 * @return{jchembun.io.json.BondType}
 */
kemia.io.json.getTypeCode = function(bond){
	if (bond.order == 1){
		return kemia.io.json.BondType.SINGLE_BOND;
	}
	if (bond.order == 2){
		return kemia.io.json.BondType.DOUBLE_BOND;
	}
	if (bond.order == 3){
		return kemia.io.json.BondType.TRIPLE_BOND;
	}
	throw new Error("Invalid bond type [" + bond + "]");
	
};

/**
 * maps bond class to stereo type code
 * 
 * @param{kemia.model.Bond} bond
 * @return{kemia.io.json.StereoType}
 */
kemia.io.json.getStereoCode = function(bond){
	if (bond.stereo == 'up'){
		return kemia.io.json.StereoType.SINGLE_BOND_UP;
	}
	if (bond.stereo == 'down'){
		return kemia.io.json.StereoType.SINGLE_BOND_DOWN;
	}
	if (bond.stereo == 'up_or_down'){
		return kemia.io.json.StereoType.SINGLE_BOND_UP_OR_DOWN;
	}
	return kemia.io.json.StereoType.NOT_STEREO;
	
	
}

/**
 * factory method for bonds
 * 
 * @param{kemia.io.json.BondType}type bond-type code
 * @param{kemia.io.json.StereoType}stereo stereo-type code
 * @param{kemia.model.Atom} source atom at source end of bond
 * @param{kemia.model.Atom} target atom at target end of bond
 * 
 * @return{kemia.model.Bond}
 */
kemia.io.json.createBond = function(type, stereo, source, target) {
	switch (type) {
	case kemia.io.json.BondType.SINGLE_BOND:
		switch (stereo) {
		case kemia.io.json.StereoType.NOT_STEREO:
			return new kemia.model.Bond(source, target);
		case kemia.io.json.StereoType.SINGLE_BOND_UP:
			var bond = new kemia.model.Bond(source, target);
                        bond.stereo = 'up';
                        return bond;
		case kemia.io.json.StereoType.SINGLE_BOND_UP_OR_DOWN:
			var bond = new kemia.model.Bond(source, target);
                        bond.stereo = 'up_or_down';
                        return bond;
		case kemia.io.json.StereoType.SINGLE_BOND_DOWN:
			var bond = new kemia.model.Bond(source, target);
                        bond.stereo = 'down';
                        return bond;
		default:
			throw new Error("invalid bond type/stereo [" + type + "]/["
					+ stereo + "]");
		};
	case kemia.io.json.BondType.DOUBLE_BOND:
		return new kemia.model.Bond(source, target, 2);
	case kemia.io.json.BondType.TRIPLE_BOND:
		return new kemia.model.Bond(source, target, 3);
	case kemia.io.json.BondType.AROMATIC:
		var bond = new kemia.model.Bond(source, target);
                bond.aromatic = true;
                return bond;
	case kemia.io.json.BondType.SINGLE_OR_DOUBLE:
	case kemia.io.json.BondType.SINGLE_OR_AROMATIC:
	case kemia.io.json.BondType.DOUBLE_OR_AROMATIC: 
	case kemia.io.json.BondType.ANY: 
	default:
		throw new Error("invalid bond type/stereo [" + type + "]/[" + stereo
				+ "]");
	};
};


/**
 * convert jmol JSON object or string to molecule
 * 
 * @param{string} arg
 * @return{kemia.model.Molecule}
 */
kemia.io.json.readMolecule = function(arg) {
	var jmol;
	if (arg.constructor == String) {
		jmol = goog.json.parse(arg);
	} else {
		jmol = arg;
	}
	var mol = new kemia.model.Molecule();
	mol.name = jmol.name;
	goog.array.forEach(jmol.atoms, function(a){
		mol.addAtom(new kemia.model.Atom(a.symbol, a.coord.x, a.coord.y, a.charge));
	});
	goog.array.forEach(jmol.bondindex, function(b){
		mol.addBond(kemia.io.json.createBond(b.type, b.stereo, mol.getAtom(b.source), mol.getAtom(b.target)));
	});
	
	return mol;
};

kemia.io.json.writeMolecule = function(mol) {
	return new goog.json.Serializer().serialize(kemia.io.json.moleculeToJson(mol));
};


/**
 * convert molecule object to json representation
 * 
 * @param{kemia.model.Molecule} mol the molecule to convert
 * @returns{object} in json molecule format
 */
kemia.io.json.moleculeToJson = function(mol) {
	var atoms = goog.array.map(mol.atoms, function(a){
		return {symbol: a.symbol, coord:{x: a.coord.x, y: a.coord.y}, charge: a.charge};
	});
	var bonds = goog.array.map(mol.bonds, function(b){
		var btype =   kemia.io.json.getTypeCode(b);
		var bstereo = kemia.io.json.getStereoCode(b);
		return { source : mol.indexOfAtom(b.source), target : mol.indexOfAtom(b.target), type : btype, stereo : bstereo
		}
	});

	return {
		name : mol.name,
		atoms : atoms,
		bondindex : bonds
	};
};

/**
 * convert JSON reaction representation to reaction object
 * 
 * @param {string|Object}
 *            arg The JSON object string, or object itself
 * @return {kemia.model.Reaction}
 */
kemia.io.json.readReaction = function(arg) {
	var jrxn;
	if (arg.constructor == String) {
		jrxn = goog.json.parse(arg);
	} else {
		jrxn = arg;
	}
	var rxn = new kemia.model.Reaction();
	rxn.header = jrxn.header;
	goog.array.forEach(jrxn.reactants, function(mol){
		rxn.addReactant(kemia.io.json.readMolecule(mol));
	}, this);
	goog.array.forEach(jrxn.products, function(mol){
		rxn.addProduct(kemia.io.json.readMolecule(mol));
	}, this );

	return rxn;
};

/**
 * converts a reaction object to JSON representation
 * 
 * @param{kemia.model.Reaction} rxn. The reaction to convert to json
 * @return{object} json representation
 */
kemia.io.json.reactionToJson = function (rxn) {
	var header = rxn.header;
	var reactants = goog.array.map(rxn.reactants, kemia.io.json.moleculeToJson);
	var products = goog.array.map(rxn.products, kemia.io.json.moleculeToJson);
	return {header: header,
		reactants: reactants,
		products: products};
};

kemia.io.json.writeReaction = function(rxn){
	return new goog.json.Serializer().serialize(kemia.io.json.reactionToJson(rxn));
}



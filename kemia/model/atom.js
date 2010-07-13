//Licence and copyright
goog.provide('kemia.model.Atom');
goog.provide('kemia.model.Atom.Hybridizations');
goog.require("kemia.resource.Covalence");
goog.require('goog.structs.Set');
goog.require('goog.math.Coordinate');

/**
 * Class representing an atom
 * 
 * @param {string}
 *            symbol, Atom symbol
 * @param {number}
 *            x, X-coordinate of atom.
 * @param {number}
 *            y, Y-coordinate of atom.
 * @param {number}
 *            opt_charge, Charge of atom, defaults to 0.
 * @constructor
 */
kemia.model.Atom=function(symbol, x, y, opt_charge, opt_aromatic, opt_isotope)
{
	/**
	 * Atom symbol
	 * 
	 * @type {string}
	 */
    this.symbol = symbol;
    
    /**
     * 2d coordinates 
     * @type{goog.math.Coordinate}
     */
    this.coord = new goog.math.Coordinate(x,y);
    /**
     * Bonds belonging to this atom
     * @type{goog.structs.Set}
     */
    this.bonds=new goog.structs.Set();
    /**
     * charge
     * @type{number} 
     */
    this.charge = goog.isDef(opt_charge) ? opt_charge : 0;
    
    /**
     * isotope
     * @type{number} 
     */
    this.isotope = goog.isDef(opt_isotope) ? opt_isotope : 0;
    
    /**
     * aromatic
     * @type{bool} 
     */
    this.aromatic = goog.isDef(opt_aromatic) ? opt_aromatic : false;

    this.hybridization=null;
};

kemia.model.Atom.prototype.countBonds = function() {
	return this.bonds.getCount();	
};
/**
 * Implict hydrogen count
 * @return Integer
 */
kemia.model.Atom.prototype.hydrogenCount = function() {
	var cov = kemia.resource.Covalence[this.symbol];
	var totalBondOrder = goog.array.reduce(this.bonds.getValues(), function(r, v) {
		return r + v.order;
                }, 0);
	var hydrogenCount = 0;
	if (cov) {
		hydrogenCount = cov - totalBondOrder + this.charge;
	}
	return hydrogenCount;
};

/**
 * Get an array with the neighbor atoms.
 * @return {Array.<kemia.model.Atom>}
 */
kemia.model.Atom.prototype.getNeighbors = function() {
    var bonds = this.bonds.getValues();
    var nbrs = [];
    for (var i = 0, li = bonds.length; i < li; i++) {
        nbrs.push(bonds[i].otherAtom(this));
    }
    return nbrs;
};

/**
 * clones this atom
 * 
 * @return {kemia.model.Atom}
 */
kemia.model.Atom.prototype.clone = function() {
	return new kemia.model.Atom(this.symbol, this.coord.x, this.coord.y, this.charge, this.aromatic, this.isotope);
}

	

/**
 * Hybridization states
 * @enum {number}
 */
kemia.model.Atom.Hybridizations = {
        S      :0,
        SP1    :1,     // linear
        SP2    :2,     // trigonal planar (single pi-electron in pz)
        SP3    :3,     // tetrahedral
        PLANAR3:4,     // trigonal planar (lone pair in pz)
        SP3D1  :5,     // trigonal planar
        SP3D2  :6,     // octahedral
        SP3D3  :7,     // pentagonal bipyramid
        SP3D4  :8,     // square antiprim
        SP3D5  :9      // tricapped trigonal prism
};






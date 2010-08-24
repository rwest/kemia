/*
 * Licence TODO
 * Copyright (c) 2010 Mark Rijnbeek (markr@ebi.ac.uk)
 *
 * Ring
 *
 */
goog.provide('kemia.ring.Ring');

goog.require('kemia.model.Flags');
goog.require('goog.array');
goog.require('goog.structs.Map');

//_____________________________________________________________________________
// Ring
//_____________________________________________________________________________
/**
 * Creates a new Ring
 * @constructor
 */
kemia.ring.Ring=function(_atoms,_bonds)
{
    this.atoms=_atoms;
    this.bonds=_bonds;

    var avgX=0;
	var avgY=0;
    for (var j = 0, jl = _atoms.length; j < jl; j++) {
        avgX += _atoms[j].coord.x;
        avgY += _atoms[j].coord.y;
    }
    this.ringCenter=new goog.math.Coordinate(avgX/_atoms.length, avgY/_atoms.length);

    /** 
     * Array with property flags (true/false) 
     */
    this.flags = new Array(kemia.model.Flags.MAX_FLAG_INDEX+1);

}

/**
 * Set a flag to be true or false
 * @param {Object} flag_type <kemia.model.Flags> 
 * @param {Object} flag_value true or false
 */
kemia.ring.Ring.prototype.setFlag = function(flag_type, flag_value){
    this.flags[flag_type] = flag_value
}

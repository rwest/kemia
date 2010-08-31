/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */
goog.provide('kemia.layout.CoordinateGenerator');
goog.require('kemia.layout.Vector2D');
goog.require('kemia.layout.AtomPlacer');
goog.require('kemia.layout.RingPlacer');
goog.require('kemia.model.Flags');
goog.require('kemia.ring.RingPartitioner');
goog.require('kemia.layout.RingPlacer');
goog.require('kemia.layout.OverlapResolver');

/**
 * Generates 2D coordinates for a molecule for which only connectivity is known
 * or the coordinates have been discarded for some reason.
 * 
 * Javascript version of CDK's StructureDiagramGenerator (author C.Steinbeck)
 * 
 * @author: markr@ebi.ac.uk
 */
kemia.layout.CoordinateGenerator.BOND_LENGTH = 1.5;


kemia.layout.CoordinateGenerator.generate = function(molecule){

    var safetyCounter = 0
	var firstBondVector = new kemia.layout.Vector2D(0, 1)

    var atCount=molecule.countAtoms();
    for (f = 0; f < atCount; f++)
    {
		atom = molecule.getAtom(f);
		atom.setFlag(kemia.model.Flags.ISPLACED, false);
		atom.setFlag(kemia.model.Flags.VISITED, false);
		atom.setFlag(kemia.model.Flags.ISINRING, false);
		atom.setFlag(kemia.model.Flags.ISALIPHATIC, false);
	}

    /*
	 * If molecule contains only one Atom, don't fail, simply set coordinates to
	 * simplest: 0,0
	 */
    if (atCount == 1)
	{
	    molecule.getAtom(0).coords = new goog.math.Coordinate(0,0)
	    return molecule;
	}
	
    if (molecule.fragmentCount > 1){
    	throw Error("Molecule not connected.");
    }

    // TODO: insert template pre-fab substructures here

   var nrOfEdges = molecule.countBonds();
   var angle; // double
   var expectedRingCount = nrOfEdges - molecule.countAtoms() + 1;
   var sssr = molecule.getRings();
   
   // partition sssr into connected sets of rings
   var ringsets = new kemia.ring.RingPartitioner.getPartitionedRings(sssr);
   
    if (expectedRingCount > 0) {
    	
    	// flag all atoms in sssr as ISINRING
    	goog.array.forEach(sssr, function(ring){
    		goog.array.forEach(ring.atoms, function(atom){
    			atom.setFlag(kemia.model.Flags.ISINRING, true);
    				});
    	});
    	
    	goog.array.sort(ringsets, function(a,b){
    		return goog.array.defaultCompare(a.length, b.length);
    	});
    	var largest_ringset = goog.array.peek(ringsets);
		//alert("ringsets length"+ ringsets.length+" largest_ringset is "+ largest_ringset.length)
    	
		// place largest ringset
    	this.layoutRingSet(firstBondVector, largest_ringset);

    	// place substituents on largest ringset
    	kemia.layout.RingPlacer.placeRingSubstituents(molecule, largest_ringset, kemia.layout.CoordinateGenerator.BOND_LENGTH);

    	goog.array.forEach(largest_ringset, function(ring){
    		ring.isPlaced = true;
    	});
    }
    else {
		/*
		 * We are here because there are no rings in the molecule so we get the
		 * longest chain in the molecule and placed in on a horizontal axis
		 */
		var longestChain = kemia.layout.AtomPlacer.getInitialLongestChain(molecule);

		longestChain.getAtom(0).coord= new goog.math.Coordinate(0,0);
		longestChain.getAtom(0).flags[kemia.model.Flags.ISPLACED]=true;
        angle = Math.PI *(-30/180);
		kemia.layout.AtomPlacer.placeLinearChain(longestChain, firstBondVector, kemia.layout.CoordinateGenerator.BOND_LENGTH);
	 }

	/* Do the layout of the rest of the molecule */
    var safetyCounter=0;
	do
	{
	    safetyCounter++;
	    /*
		 * do layout for all aliphatic parts of the molecule which are connected
		 * to the parts which have already been laid out.
		 */

	    this.handleAliphatics(molecule,nrOfEdges, kemia.layout.CoordinateGenerator.BOND_LENGTH);

	    /*
		 * do layout for the next ring aliphatic parts of the molecule which are
		 * connected to the parts which have already been laid out.
		 */

	    kemia.layout.RingPlacer.layoutNextRingSystem(firstBondVector, molecule, sssr, ringsets);


	} while ( !kemia.layout.AtomPlacer.allPlaced(molecule, atCount) && safetyCounter <= molecule.countAtoms()  );
	
	//Malfunctioning
    //kemia.layout.OverlapResolver.resolveOverlap(molecule, sssr)


    /* DEBUG coords   
     alrt="";
	 for(z=0; z<molecule.countAtoms(); z++) {
     at = molecule.getAtom(z)
     alrt+=(at.symbol+":"+at.coord.x+","+at.coord.y)+"\n"
      }
	 alert (alrt)
    /* DEBUG coords */  



    return molecule;
}

/**
 * Does a layout of all the rings in a connected ringset.
 * 
 * @param {kemia.layout.Vector2D}
 *            bondVector A vector for placement for the first bond
 * @param {Array.
 *            <kemia.ring.Ring>} ringset The connected RingSet to be layed out
 */
kemia.layout.CoordinateGenerator.layoutRingSet=function(bondVector, ringset){
	
	// TODO apply templates to layout pre-fab rings

    var bl=kemia.layout.CoordinateGenerator.BOND_LENGTH;	
	var complexity = function(ring){
		var others = goog.array.filter(ringset, function(r){
			return goog.array.contains(ringset, r);
		});
		goog.array.reduce(others, function(r, val){
			var common_atoms = goog.array.filter(val.atoms, function(atom){
				goog.array.contains(ring.atoms, atom);
			});
			return r + common_atoms.length;
		}, 0);
	}
	
	goog.array.sort(ringset, function(a,b){
		goog.array.defaultCompare(complexity(a), complexity(b));
	});
	
	var most_complex_ring = goog.array.peek(ringset);

    if (!most_complex_ring.flags[kemia.model.Flags.ISPLACED]) {
		var shared_fragment = {atoms:this.placeFirstBond( most_complex_ring.bonds[0], bondVector),
				bonds: [most_complex_ring.bonds[0]]};
		var shared_fragment_sum = goog.array.reduce(shared_fragment.atoms, function(r,atom){
			return goog.math.Coordinate.sum(r,atom.coord);}, 
			new goog.math.Coordinate(0,0));
		var shared_fragment_center = new kemia.layout.Vector2D(shared_fragment_sum.x/shared_fragment.atoms.length, shared_fragment_sum.y/shared_fragment.atoms.length);

		var ringCenterVector = kemia.layout.RingPlacer.getRingCenterOfFirstRing(most_complex_ring, bondVector, bl);

		kemia.layout.RingPlacer.placeRing(most_complex_ring, shared_fragment, shared_fragment_center, ringCenterVector, bl);

	    most_complex_ring.setFlag(kemia.model.Flags.ISPLACED, true);

	}	
    var thisRing = 0;
    do {
        if (most_complex_ring.flags[kemia.model.Flags.ISPLACED]) {
            kemia.layout.RingPlacer.placeConnectedRings(ringset, most_complex_ring, 'FUSED',bl);
            kemia.layout.RingPlacer.placeConnectedRings(ringset, most_complex_ring, 'BRIDGED', bl);
            kemia.layout.RingPlacer.placeConnectedRings(ringset, most_complex_ring, 'SPIRO',bl);
        }
        thisRing++;
        if (thisRing == ringset.length)
            thisRing = 0;
        most_complex_ring = ringset[thisRing];
    } while (!this.allPlaced(ringset));

}


/**
 * places first bond of first ring with source at origin and target at scaled
 * vector
 * 
 * @param {kemia.model.Bond}
 *            bond, subject bond to be placed
 * @param {kemia.layout.Vector2D}
 *            vector, where to put the bond.target
 * @return {Array.<kemia.model.Atom>} array of the atoms placed
 */
kemia.layout.CoordinateGenerator.placeFirstBond=function(bond, vector){
	vector.normalize();
	vector.scale(kemia.layout.CoordinateGenerator.BOND_LENGTH);
	bond.source.coord = new goog.math.Coordinate(0,0);
	bond.source.setFlag(kemia.model.Flags.ISPLACED, true);
	bond.target.coord = new goog.math.Coordinate(vector.x, vector.y);
	bond.target.setFlag(kemia.model.Flags.ISPLACED, true);
	return [bond.source, bond.target];
}

kemia.layout.CoordinateGenerator.allPlaced=function(rings){
    for (f1=0; f1<rings.length; f1++) {
        if (! rings[f1].flags[kemia.model.Flags.ISPLACED]) {
            return false;
        }
    }
    return true;
}

/**
 * Returns the next atom with unplaced aliphatic neighbors
 */
kemia.layout.CoordinateGenerator.getNextAtomWithAliphaticUnplacedNeigbors = function(molecule,bondCount){
    for (bc=0; bc<bondCount; bc++) {
        bond = molecule.getBond(bc);

        if ( bond.source.flags[kemia.model.Flags.ISPLACED]  &&
            !bond.target.flags[kemia.model.Flags.ISPLACED] ) {
            return bond.source;
        }
        if (!bond.source.flags[kemia.model.Flags.ISPLACED]  &&
             bond.target.flags[kemia.model.Flags.ISPLACED] ) {
            return bond.target;
        }
    }
    return null;
}

kemia.layout.CoordinateGenerator.getAtoms = function(atom,molecule,bondCount,placed){
    atoms = new kemia.model.Molecule;
	bonds = molecule.getConnectedBondsList(atom);
	for (ga=0, bLen=bonds.length; ga<bLen; ga++ ) {
	    connectedAtom = bonds[ga].otherAtom(atom);
		if (placed && connectedAtom.flags[kemia.model.Flags.ISPLACED] ) 
            atoms.addAtom(connectedAtom);
		else
        if (!placed && !connectedAtom.flags[kemia.model.Flags.ISPLACED] ) 
            atoms.addAtom(connectedAtom);
	}
	return atoms;
}

/**
 * Does a layout of all aliphatic parts connected to the parts of the molecule
 * that have already been laid out. Starts at the first bond with unplaced
 * neighbours and stops when a ring is encountered.
 */
kemia.layout.CoordinateGenerator.handleAliphatics = function(molecule, bondCount,bondLength){

    var cntr = 0;
	var at;
    do {
        cntr++;
        done = false;
        at = this.getNextAtomWithAliphaticUnplacedNeigbors(molecule, bondCount);
        var direction=null;
        var startVector=null;
        if (at != null) {
            unplacedAtoms = this.getAtoms(at,molecule,bondCount,false);
            placedAtoms = this.getAtoms(at,molecule,bondCount,true);
            longestUnplacedChain = kemia.layout.AtomPlacer.getLongestUnplacedChain (molecule, at)
			if (longestUnplacedChain.countAtoms() > 1) {
				if (placedAtoms.countAtoms() > 1) {
					kemia.layout.AtomPlacer.distributePartners(at, placedAtoms, kemia.layout.AtomPlacer.get2DCenter(placedAtoms), unplacedAtoms, bondLength);
					direction = new kemia.layout.Vector2D(longestUnplacedChain.getAtom(1).coord.x, longestUnplacedChain.getAtom(1).coord.y);
					startVector = new kemia.layout.Vector2D(at.coord.x, at.coord.y);
					direction.sub(startVector);
				}
				else {
					direction = kemia.layout.AtomPlacer.getNextBondVector(at, placedAtoms.getAtom(0), kemia.layout.AtomPlacer.get2DCenter(molecule), true);
				}

                for (z=1, zCnt=longestUnplacedChain.countAtoms(); z<zCnt; z++) {
                    longestUnplacedChain.getAtom(z).flags[kemia.model.Flags.ISPLACED]=false
                }
                kemia.layout.AtomPlacer.placeLinearChain(longestUnplacedChain, direction, bondLength);

            } else
                done = true;
        } else
            done = true;
    } 
    while (!done && cntr <= molecule.countAtoms());
}



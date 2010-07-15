goog.provide('kemia.layout.CoordinateGenerator');
goog.require('kemia.layout.Vector2D');
goog.require('kemia.layout.AtomPlacer');
goog.require('kemia.model.Flags');

/**
 * Generates 2D coordinates for a molecule for which only connectivity is known
 * or the coordinates have been discarded for some reason. 
 * 
 * Javascript version of  CDK's StructureDiagramGenerator (author C.Steinbeck)
 * @author: markr@ebi.ac.uk
 */
kemia.layout.CoordinateGenerator = function(){
}

kemia.layout.CoordinateGenerator.generate = function(molecule){

    var bondLength = 1.5;
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

    /*  If molecule contains only one Atom, don't fail, simply
     *  set coordinates to simplest: 0,0 */
    if (atCount == 1)
	{
	    molecule.getAtom(0).coords = new goog.math.Coordinate(0,0)
	    return molecule;
	}
	
	//TODO: something similar to: if (!ConnectivityChecker.isConnected(molecule)) -> Exception


   var nrOfEdges = molecule.countBonds();
   var angle; // double
   var expectedRingCount = nrOfEdges - molecule.countAtoms() + 1;
   
    //if (expectedRingCount > 0) {
   	//    alert ("TODO .. rings "+molecule.countBonds()+" "+molecule.countAtoms()+" "+expectedRingCount); 
	//} 
    //else {
		/*
		*  We are here because there are no rings in the molecule
		*  so we get the longest chain in the molecule and placed in
		*  on a horizontal axis
		*/
		var longestChain = kemia.layout.AtomPlacer.getInitialLongestChain(molecule);

		longestChain.getAtom(0).coord= new goog.math.Coordinate(0,0);
		longestChain.getAtom(0).flags[kemia.model.Flags.ISPLACED]=true;
        angle = Math.PI *(-30/180);
		kemia.layout.AtomPlacer.placeLinearChain(longestChain, firstBondVector, bondLength);
	// }

	/* Do the layout of the rest of the molecule */
    var safetyCounter=0;
	do
	{
	    safetyCounter++;
	    /*
	     *  do layout for all aliphatic parts of the molecule which are
	     *  connected to the parts which have already been laid out.
	     */
	    this.handleAliphatics(molecule,nrOfEdges,bondLength);
	    /*
	     *  do layout for the next ring aliphatic parts of the molecule which are
	     *  connected to the parts which have already been laid out.
	     */

	    //TODOlayoutNextRingSystem(); !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

	} while ( !kemia.layout.AtomPlacer.allPlaced(molecule, atCount) && safetyCounter <= molecule.countAtoms()  );

    /* DEBUG coords */  
    //alrt="";
	//for(z=0; z<molecule.countAtoms(); z++) {
    //  at = molecule.getAtom(z)
    //  alrt+=(at.symbol+":"+at.coord.x+","+at.coord.y)+"\n"
    //}
	//alert (alrt)
    /* DEBUG coords */  
    return molecule;
}


/**
 *  Returns the next atom with unplaced aliphatic neighbors
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



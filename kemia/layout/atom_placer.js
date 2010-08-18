goog.provide('kemia.layout.AtomPlacer');
goog.require('kemia.layout.ConnectionMatrix');
goog.require('goog.testing.jsunit');
goog.require('kemia.layout.Vector2D');
goog.require('goog.math');

/**
 * Javascript version of CDK's AtomPlacer class. Methods for generating
 * coordinates for atoms in various situations.
 * 
 * @author: markr@ebi.ac.uk
 */

kemia.layout.AtomPlacer.getInitialLongestChain = function(molecule){

    var connectionMatrix = kemia.layout.ConnectionMatrix.getMatrix(molecule);
    var apsp = this.computeFloydAPSP(connectionMatrix);
    var maxPathLength = 0;
    var bestStartAtom = -1;
    var bestEndAtom = -1;
    var bondCount = molecule.countBonds();
    var apspLength = apsp.length;
    
    for (f = 0; f < apspLength; f++) {
        atom = molecule.getAtom(f);
        var connBondCount = this.getConnectedBondsCount(atom, molecule, bondCount);
        if (connBondCount == 1) {
            for (g = 0; g < apspLength; g++) {
                if (apsp[f][g] > maxPathLength) {
                    maxPathLength = apsp[f][g];
                    bestStartAtom = f;
                    bestEndAtom = g;
                }
            }
        }
    }
    // kemia.layout.ConnectionMatrix.display(apsp);
    
    var startAtom = molecule.getAtom(bestStartAtom);
    path = this.getLongestUnplacedChain(molecule, startAtom);
	
	/* DEBUG PATH */
	// var debugPath="";
	// for(a=0; a<path.countAtoms(); a++) {
	// debugPath+=path.getAtom(a).symbol;
	// }
    // alert("longest path is >> "+debugPath);
    /* DEBUG PATH */

    return path;
}


/**
 * All-Pairs-Shortest-Path computation based on Floyds algorithm. Takes an nxn
 * matrix C of edge costs and produces an nxn matrix A of lengths of shortest
 * paths.
 */
kemia.layout.AtomPlacer.computeFloydAPSP = function(costMatrix){
    nrow = costMatrix.length;
    
    var distMatrix = new Array(nrow);
    for (i = 0; i < nrow; ++i) 
        distMatrix[i] = new Array(nrow);
    
    for (i = 0; i < nrow; i++) {
        for (j = 0; j < nrow; j++) {
            if (costMatrix[i][j] == 0) {
                distMatrix[i][j] = 999999;
            }
            else {
                distMatrix[i][j] = 1;
            }
        }
    }
    
    for (i = 0; i < nrow; i++) {
        distMatrix[i][i] = 0;        // no self cycle
    }
    for (k = 0; k < nrow; k++) {
        for (i = 0; i < nrow; i++) {
            for (j = 0; j < nrow; j++) {
                if (distMatrix[i][k] + distMatrix[k][j] < distMatrix[i][j]) {
                    distMatrix[i][j] = distMatrix[i][k] + distMatrix[k][j];
                }
            }
        }
    }
    // kemia.layout.ConnectionMatrix.display(distMatrix);
    return distMatrix;
}

/**
 * Search a molecule for the longest unplaced, aliphatic chain in it. If an
 * aliphatic chain encounters an unplaced ring atom, the ring atom is also
 * appended to allow for it to be laid out. This gives us an array for attaching
 * the unplaced ring later.
 */
kemia.layout.AtomPlacer.getLongestUnplacedChain = function(molecule, startAtom){

    var longest = 0;
    var longestPathLength = 0;
    var maxDegreeSum = 0;
    var degreeSum = 0;
    var paths = new Array();// of molecules
    var atCount = molecule.countAtoms()
    var bondCount = molecule.countBonds()

    for (f = 0; f < atCount; f++) {
        molecule.getAtom(f).setFlag(kemia.model.Flags.VISITED, false);
        paths[f] = new kemia.model.Molecule;
        paths[f].addAtom(startAtom);
    }
    
    var startSphere = new Array();
    startSphere.push(startAtom);
	startAtom.flags[kemia.model.Flags.VISITED]=true;
    
    this.breadthFirstSearch(molecule, startSphere, paths, bondCount);
	
    for (ds = 0; ds < atCount; ds++) {
	
        if (paths[ds].countAtoms() >= longestPathLength) {
            degreeSum = this.getDegreeSum(paths[ds], molecule, bondCount);
            if (degreeSum > maxDegreeSum) {
                maxDegreeSum = degreeSum;
                longest = ds;
                longestPathLength = paths[ds].countAtoms();
            }
        }
    }
    return paths[longest];
}

/**
 * Sums up the degrees of atoms in a molecule
 */
kemia.layout.AtomPlacer.getDegreeSum = function(molecule, superMolecule, superBondCount){
    var degreeSum = 0;
	var atCount=molecule.countAtoms();
    for (cb = 0; cb < atCount; cb++) {
        degreeSum += this.getConnectedBondsCount(molecule.getAtom(cb), superMolecule, superBondCount);
    }
    return degreeSum;
}

/**
 * Returns the number of Bonds for a given Atom.
 */
kemia.layout.AtomPlacer.getConnectedBondsCount = function(atom, molecule, bondCount){
	var connBondCount = 0;
	for (i = 0; i < bondCount; i++) {
		if (molecule.getBond(i).source == atom || molecule.getBond(i).target == atom) 
			connBondCount++;
	}
	return connBondCount;
}


/**
 * Performs a breadthFirstSearch in an molecule starting with a particular
 * sphere, which usually consists of one start atom, and searches for the
 * longest aliphatic chain which is yet unplaced. If the search encounters an
 * unplaced ring atom, it is also appended to the chain so that this last bond
 * of the chain can also be laid out. This gives us the orientation for the
 * attachment of the ring system.
 */
kemia.layout.AtomPlacer.breadthFirstSearch = function(mol, sphere, paths, bondCount){
	newSphere = new Array();
	sphere_len = sphere.length;
	for (f = 0; f < sphere_len; f++)
	{
	    atom = sphere[f];
	    if (!atom.flags[kemia.model.Flags.ISINRING])
	    {
	        atomNr = mol.indexOfAtom(atom);
	        bonds = mol.getConnectedBondsList(atom);
	        for (g = 0; g < bonds.length; g++)
	        {
	            curBond = bonds[g];
	            nextAtom = curBond.otherAtom(atom);

	            if (!nextAtom.flags[kemia.model.Flags.VISITED] && !nextAtom.flags[kemia.model.Flags.ISPLACED])
	            {
	                nextAtomNr = mol.indexOfAtom(nextAtom);
	                paths[nextAtomNr] = this.copyPath(paths[atomNr]); 
	                paths[nextAtomNr].addAtom(nextAtom);
	                paths[nextAtomNr].addBond(curBond);
	                if (this.getConnectedBondsCount(nextAtom,mol,bondCount) > 1)  {
	                    newSphere.push(nextAtom);
	                }
	            }
	        }
	    }
	}
	if (newSphere.length > 0){
	    for (ns = 0; ns < newSphere.length; ns++){
	        newSphere[ns].setFlag(kemia.model.Flags.VISITED, true);
	    }
	    this.breadthFirstSearch(mol, newSphere, paths, bondCount);
	}
}

kemia.layout.AtomPlacer.copyPath = function(path){
	pathCopy = new kemia.model.Molecule;
	for (pl=0,pathLen= path.countAtoms(); pl<pathLen; pl++ ) {
		pathCopy.addAtom(path.getAtom(pl));
	}
	return pathCopy;
}


/**
 * Places the atoms in a linear chain. Not included: CIS/TRANS logic from CDK
 * class (could do look for double bond instead)
 */

kemia.layout.AtomPlacer.placeLinearChain = function(chain, initialBondVector, bondLength){

    bondVector = initialBondVector;
	for (f = 0; f < chain.countAtoms()- 1; f++)
	{
		atom = chain.getAtom(f);
		nextAtom = chain.getAtom(f + 1);
        atomPoint = new goog.math.Coordinate(atom.coord.x, atom.coord.y);
        bondVector.normalize();
        bondVector.scale(bondLength);
		atomPoint.x += bondVector.x;
        atomPoint.y += bondVector.y;

		nextAtom.coord.x=atomPoint.x; 
        nextAtom.coord.y=atomPoint.y; 
		nextAtom.setFlag(kemia.model.Flags.ISPLACED,true);
		bondVector = this.getNextBondVector(nextAtom, atom, this.get2DCenter(chain));
	}
}

kemia.layout.AtomPlacer.get2DCenter = function(molecule){
    var centerX=0;
	var centerY=0;
	var counter=0;
	for (atIdx=0, atCount=molecule.countAtoms(); atIdx<atCount; atIdx++) { 
		atom = molecule.getAtom(atIdx);
		if (atom.flags[kemia.model.Flags.ISPLACED]==true ) {
		        centerX += atom.coord.x;
		        centerY += atom.coord.y;
		        counter++;
		}
    }
	center= new goog.math.Coordinate(centerX / (counter), centerY / (counter))
    return center
}


kemia.layout.AtomPlacer.getAngle = function(xDiff, yDiff){

	var angle = 0;
	if (xDiff >= 0 && yDiff >= 0) {
	    angle = Math.atan(yDiff / xDiff);
	} else if (xDiff < 0 && yDiff >= 0) {
	    angle = Math.PI + Math.atan(yDiff / xDiff);
	} else if (xDiff < 0 && yDiff < 0) {
	    angle = Math.PI + Math.atan(yDiff / xDiff);
	} else if (xDiff >= 0 && yDiff < 0) {
	    angle = 2 * Math.PI + Math.atan(yDiff / xDiff);
	}
	return angle;
}


kemia.layout.AtomPlacer.getNextBondVector = function(atom, previousAtom, distanceMeasure){

	angle = this.getAngle(previousAtom.coord.x - atom.coord.x, previousAtom.coord.y - atom.coord.y);
    addAngle = Math.PI *(120/180)

    // Omitted from CDK port:
    // if(!trans)
    // addAngle=Math.toRadians(60);

    // TODO if (shouldBeLinear(atom, molecule)) addAngle = Math.toRadians(180);

	angle += addAngle;
	vec1 =  new kemia.layout.Vector2D(Math.cos(angle), Math.sin(angle));
	point1 = new goog.math.Coordinate(atom.coord.x+vec1.x, atom.coord.y+vec1.y);
	distance1 = goog.math.Coordinate.distance(point1,distanceMeasure)
	angle += addAngle;

	vec2 = new kemia.layout.Vector2D(Math.cos(angle), Math.sin(angle));
	point2 = new goog.math.Coordinate(atom.coord.x+vec2.x, atom.coord.y+vec2.y);
    distance2 = goog.math.Coordinate.distance(point2,distanceMeasure)

	if (distance2 > distance1) {
		return vec2;
	}
	else {
		return vec1;
	}
}


kemia.layout.AtomPlacer.allPlaced = function(molecule, atCount){
    for (ap=0; ap<atCount; ap++)
        if (!molecule.getAtom(ap).flags[kemia.model.Flags.ISPLACED])
            return false;
    return true;
}

/**
 * Distribute the bonded atoms (neighbours) of an atom such that they fill the
 * remaining space around an atom in a geometrically nice way.
 */
kemia.layout.AtomPlacer.distributePartners = function(atom, placedNeighbours, sharedAtomsCenter, unplacedNeighbours, bondLength){

	var occupiedAngle = 0;
	var startAngle = 0.0;
	var addAngle = 0.0;
	var radius = 0.0;
	var remainingAngle = 0.0;
	
	// Calculate the direction away from the already placed partners of atom
	sharedAtomsCenterVector = new kemia.layout.Vector2D(sharedAtomsCenter.x,sharedAtomsCenter.y);
	newDirection = new kemia.layout.Vector2D(atom.coord.x, atom.coord.y);
	
	occupiedDirection = new kemia.layout.Vector2D(sharedAtomsCenter.x,sharedAtomsCenter.y);
	occupiedDirection.sub(newDirection);
	atomsToDraw = new Array();

    var placedNeighboursCountAtoms =placedNeighbours.countAtoms(); 
    var unPlacedNeighboursCountAtoms = unplacedNeighbours.countAtoms(); 

	if (placedNeighboursCountAtoms == 1)
	{
	    for (f1=0; f1<unPlacedNeighboursCountAtoms; f1++) {
	        atomsToDraw.push(unplacedNeighbours.getAtom(f1));
	    }
	    addAngle = Math.PI * 2 / (unPlacedNeighboursCountAtoms + placedNeighboursCountAtoms);
	    placedAtom = placedNeighbours.getAtom(0);
	    xDiff = placedAtom.coord.x - atom.coord.x;
	    yDiff = placedAtom.coord.y - atom.coord.y;
	
	    startAngle = this.getAngle(xDiff, yDiff);
	    this.populatePolygonCorners(atomsToDraw, new goog.math.Coordinate(atom.coord.x, atom.coord.y), startAngle, addAngle, bondLength);
	    return;
	} else if (placedNeighboursCountAtoms == 0)
	{
        for (f1=0; f1<unPlacedNeighboursCountAtoms; f1++) {
            atomsToDraw.push(unplacedNeighbours.getAtom(f1));
        }
		addAngle = Math.PI * 2.0 / unPlacedNeighboursCountAtoms;
		startAngle = 0.0;
		populatePolygonCorners(atomsToDraw, new goog.math.Coordinate(atom.coord.x, atom.coord.y), startAngle, addAngle, bondLength);
		return;
	}
    var sortedAtoms = new Array();
	// if the least hindered side of the atom is clearly defined (bondLength /
	// 10 is an arbitrary value that seemed reasonable) */
	sharedAtomsCenterVector.sub(newDirection);

	newDirection = sharedAtomsCenterVector;
	newDirection.normalize();
	newDirection.scale(bondLength);
	newDirection.negate();

	distanceMeasure = new goog.math.Coordinate(atom.coord.x, atom.coord.y)
	distanceMeasure.x += newDirection.x;
    distanceMeasure.y += newDirection.y;
	
	 // get the two sharedAtom partners with the smallest distance to the new
		// center
    for (f1=0; f1<placedNeighboursCountAtoms; f1++) {
        sortedAtoms.push(placedNeighbours.getAtom(f1));
    }
    this.sortBy2DDistance(sortedAtoms, distanceMeasure);
	closestPoint1 = new kemia.layout.Vector2D(sortedAtoms[0].coord.x,sortedAtoms[0].coord.y)
    closestPoint2 = new kemia.layout.Vector2D(sortedAtoms[1].coord.x,sortedAtoms[1].coord.y)
    closestPoint1.sub(new kemia.layout.Vector2D(atom.coord.x, atom.coord.y));
    closestPoint2.sub(new kemia.layout.Vector2D(atom.coord.x, atom.coord.y));
    occupiedAngle = closestPoint1.angle(occupiedDirection);
    occupiedAngle += closestPoint2.angle(occupiedDirection);

    angle1 = this.getAngle(sortedAtoms[0].coord.x - atom.coord.x, sortedAtoms[0].coord.y - atom.coord.y);
    angle2 = this.getAngle(sortedAtoms[1].coord.x - atom.coord.x, sortedAtoms[1].coord.y - atom.coord.y);
    angle3 = this.getAngle(distanceMeasure.x - atom.coord.x, distanceMeasure.y - atom.coord.y);

	var startAtom = null;
	
	if (angle1 > angle3)
	{
	    if (angle1 - angle3 < Math.PI)
	        startAtom = sortedAtoms[1];
	    else
	        startAtom = sortedAtoms[0];
	
	} else
	{
	    if (angle3 - angle1 < Math.PI)
	        startAtom = sortedAtoms[0];
	    else
	        startAtom = sortedAtoms[1];
	}
	remainingAngle = (2 * Math.PI) - occupiedAngle;
	addAngle = remainingAngle / (unPlacedNeighboursCountAtoms + 1);
    
	for (fff=0; fff < unPlacedNeighboursCountAtoms; fff++){
	    atomsToDraw.push(unplacedNeighbours.getAtom(fff));
	}
	radius = bondLength;
	startAngle = this.getAngle(startAtom.coord.x - atom.coord.x, startAtom.coord.y - atom.coord.y);
	
    this.populatePolygonCorners(atomsToDraw, new goog.math.Coordinate(atom.coord.x, atom.coord.y), startAngle, addAngle, radius);
}


/**
 * Sorts an array of atoms such that the 2D distances of the atom locations from
 * a given point are smallest for the first atoms in the vector
 * 
 */
kemia.layout.AtomPlacer.sortBy2DDistance = function(atoms, point){

	var doneSomething;
	do {
		doneSomething=false;
	    for (atIdx=0,atLen=atoms.length; atIdx <atLen-1; atIdx++) {
	        atom1 = atoms[atIdx];
	        atom2 = atoms[atIdx + 1];
	        distance1 = goog.math.Coordinate.distance (point,atom1.coord);
	        distance2 = goog.math.Coordinate.distance (point,atom2.coord);
	        if (distance2 < distance1) {
	            atoms[atIdx] = atom2;
	            atoms[atIdx + 1] = atom1;
	            doneSomething = true;
	        }
	    }
	} while (doneSomething);
}

 /**
	 * Populates the corners of a polygon with atoms. Used to place atoms in a
	 * geometrically regular way around a ring center or another atom. If this
	 * is used to place the bonding partner of an atom (and not to draw a ring)
	 * we want to place the atoms such that those with highest "weight" are
	 * placed farmost away from the rest of the molecules. The "weight"
	 * mentioned here is calculated by a modified morgan number algorithm.
	 */
kemia.layout.AtomPlacer.populatePolygonCorners = function(atomsToDraw, rotationCenter, startAngle, addAngle, radius){
 
	points = new Array();
    angle = startAngle;
	for (ad=0,ads=atomsToDraw.length; ad < ads; ad++) {
	    angle = angle + addAngle;
	    if (angle >= 2.0 * Math.PI)
	        angle -= 2.0 * Math.PI;

        //Fix Github issue 17 : Generated bond lengths should better reflect bond and participating element chemistry.
        connectAtom = atomsToDraw[ad];
		if (connectAtom.symbol=='H')
		  radius*=.6;
        //End fix

	    x = Math.cos(angle) * radius;
	    y = Math.sin(angle) * radius;
	    newX = x + rotationCenter.x;
	    newY = y + rotationCenter.y;
	    points.push(new goog.math.Coordinate(newX, newY));
	}
    for (ad=0,ads=atomsToDraw.length; ad<ads; ad++) {
	    connectAtom = atomsToDraw[ad];
	    connectAtom.coord = points[ad];
		connectAtom.flags[kemia.model.Flags.ISPLACED]=true;
	}
};

/**
 * Partition the bonding partners of a given atom into placed and not placed.
 * 
 * @param atom
 *            {kemia.model.Atom} The atom whose bonding partners are to be
 *            partitioned
 * @param unplacedPartners
 *            An array for the unplaced bonding partners to go in
 * @param placedPartners
 *            An array vector for the placed bonding partners to go in
 */
kemia.layout.AtomPlacer.partitionPartners=function(atom, unplacedPartners, placedPartners){
	goog.array.forEach(atom.bonds.getValues(), function(bond){
		var other_atom = bond.otherAtom(atom);
		if (other_atom.flags[kemia.model.Flags.ISPLACED]){
			placedPartners.addAtom(other_atom);
		}else{
			unplacedPartners.addAtom(other_atom);
		}
	});
};
	
kemia.layout.AtomPlacer.markNotPlaced = function(atoms){
	goog.array.forEach(atoms, function(atom){
		atom.setFlag(kemia.model.Flags.ISPLACED,false);
	});	
};	

kemia.layout.AtomPlacer.markPlaced = function(atoms){
	goog.array.forEach(atoms, function(atom){
		atom.setFlag(kemia.model.Flags.ISPLACED,true);
	});	
};


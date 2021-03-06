goog.provide('kemia.layout.ConnectionMatrix');

kemia.layout.ConnectionMatrix = function(){
}

kemia.layout.ConnectionMatrix.getMatrix = function(molecule){

	var indexAtom1;
	var indexAtom2;

    var cntAtoms = molecule.countAtoms();
    var conMat = new Array(cntAtoms); 
	for (i = 0; i < cntAtoms; ++i) {
		conMat[i] = new Array(cntAtoms);
		for (j = 0; j < cntAtoms; j++) 
			conMat[i][j] = 0;
	}

    var cntBonds = molecule.countBonds();
	for (var f = 0; f < cntBonds; f++) {
		bond = molecule.getBond(f);
		indexAtom1 = molecule.indexOfAtom(bond.source);
		indexAtom2 = molecule.indexOfAtom(bond.target);
		conMat[indexAtom1][indexAtom2] = 1; 
		conMat[indexAtom2][indexAtom1] = 1;
	}
	//kemia.layout.ConnectionMatrix.display(conMat);
	return conMat;
}


kemia.layout.ConnectionMatrix.display = function(matrix){
    var debug="";
    var size = matrix.length;
	for(i=0; i<size; i++) {
        for (i2 = 0; i2 < size; i2++) {
			if (matrix[i][i2]==undefined)
                debug+="[ ]";
            else
                debug+="["+matrix[i][i2]+"]";
		}
		debug+="\n"		
	}
	alert (debug);
}
		
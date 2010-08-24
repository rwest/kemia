goog.provide("kemia.io.smiles");
goog.require('kemia.model.Molecule');
goog.require('kemia.model.Atom');
goog.require('kemia.model.Bond');
goog.require('kemia.model.Reaction');

kemia.io.smiles.generate = function (molecule,chiral) {

    if (molecule.countAtoms()== 0)
        return "shit "+molecule.countAtoms();

    //?? canLabler.canonLabel(molecule);
    //?? brokenBonds.clear();

    var ringMarker = 0;

    var coords00=0;
    for (i = 0; i < molecule.countAtoms(); i++) {
        atom = molecule.getAtom(i);
		if (atom.coord.x==0 && atom.coord.y==0)
		  coords00++;
    }
    if (chiral && coords00==molecule.countAtoms())
        throw "Atoms have no 2D coordinates, but 2D coordinates are needed for creating chiral smiles";

    //TODO canonical labeler instead?	
    var start = molecule.getAtom(0);

    if (chiral && rings.getAtomContainerCount() > 0) {
	//TODO!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1
	}




    return ("todo..");



};

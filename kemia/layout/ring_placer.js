/*
 * Copyright 2010 Paul Novak paul@wingu.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */
goog.provide("kemia.layout.RingPlacer");
goog.require("kemia.layout.Vector2D");
goog.require("goog.math.Coordinate");
goog.require("kemia.layout.AtomPlacer");
goog.require("goog.math");
goog.require("kemia.graphics.AffineTransform");

/**
 * finds center of first ring
 * 
 * @param {kemia.ring.Ring}
 *            ring, subject ring
 * @param {kemia.layout.Vector2D}
 *            bondVector location of first bond
 * @param {number}
 *            bondLength
 * @return {kemia.layout.Vector2D}
 */
kemia.layout.RingPlacer.getRingCenterOfFirstRing = function(ring, bondVector,
		bondLength) {
	var size = ring.atoms.length;
	var radius = bondLength / (2 * Math.sin((Math.PI) / size));
	var newRingPerpendicular = Math.sqrt(Math.pow(radius, 2)
			- Math.pow(bondLength / 2, 2));
	// get the angle from the origin to the bondVector
	var rotangle = Math.atan2(bondVector.y, bondVector.x);
	/*
	 * Add 90 Degrees to this angle, this is supposed to be the new ringcenter
	 * vector
	 */
	rotangle += Math.PI / 2;
	return new kemia.layout.Vector2D(Math.cos(rotangle) * newRingPerpendicular,
			Math.sin(rotangle) * newRingPerpendicular);
}

/**
 * Generated coordinates for a given ring. Dispatches to special handlers for
 * the different possible situations (spiro-, fusion-, bridged attachment)
 * 
 * @param ring
 *            The ring to be placed
 * @param sharedAtoms
 *            {object} The atoms of this ring, also members of another ring,
 *            which are already placed
 * @param sharedAtomsCenter
 *            The geometric center of these atoms
 * @param ringCenterVector
 *            A vector pointing the the center of the new ring
 * @param bondLength
 *            The standard bondlength
 */
kemia.layout.RingPlacer.placeRing = function(ring, shared_fragment,
		shared_fragment_center, ringCenterVector, bondLength) {
	var sharedAtomCount = shared_fragment.atoms.length;

	if (sharedAtomCount > 2) {
		kemia.layout.RingPlacer.placeBridgedRing(ring, shared_fragment,
				shared_fragment_center, ringCenterVector, bondLength);
	} else if (sharedAtomCount == 2) {
		kemia.layout.RingPlacer.placeFusedRing(ring, shared_fragment,
				shared_fragment_center, ringCenterVector, bondLength);
	} else if (sharedAtomCount == 1) {
		kemia.layout.RingPlacer.placeSpiroRing(ring, shared_fragment,
				shared_fragment_center, ringCenterVector, bondLength);
	}
}

kemia.layout.RingPlacer.placeRingSubstituents = function(ringset, bondLength) {
	var treated_atoms = new kemia.model.Molecule();
	goog.array.forEach(ringset, function(ring) {
		goog.array.forEach(ring.atoms, function(atom) {
			var unplaced_partners = new kemia.model.Molecule();
			var shared_atoms = new kemia.model.Molecule();
			var rings = goog.array.filter(ringset, function(r) {
				return goog.array.contains(r.atoms, atom);
			});
			var rings_atoms = goog.array.flatten(goog.array.map(rings,
					function(r) {
				return r.atoms;
			}));
			var center_of_ring_gravity = kemia.layout.RingPlacer
			.center(rings_atoms);
			kemia.layout.AtomPlacer.partitionPartners(atom, unplaced_partners,
					shared_atoms);
			kemia.layout.AtomPlacer.markNotPlaced(unplaced_partners.atoms);
			goog.array.forEach(unplaced_partners.atoms, function(atom){
				treated_atoms.addAtom(atom);
			});

			if (unplaced_partners.atoms.length > 0) {
				kemia.layout.AtomPlacer.distributePartners(atom, shared_atoms,
						center_of_ring_gravity, unplaced_partners, bondLength);
			}
		});
	});
	return treated_atoms;
}

/**
 * Generated coordinates for a bridged ring.
 * 
 * @param ring
 *            The ring to be placed
 * @param sharedAtoms
 *            The atoms of this ring, also members of another ring, which are
 *            already placed
 * @param sharedAtomsCenter
 *            The geometric center of these atoms
 * @param ringCenterVector
 *            A vector pointing the the center of the new ring
 * @param bondLength
 *            The standard bondlength
 */
kemia.layout.RingPlacer.placeBridgedRing = function(ring, shared_fragment,
		shared_fragment_center, ringCenterVector, bondLength) {
	var radius = kemia.layout.RingPlacer.getNativeRingRadius(ring.atoms.length,
			bondLength);
	ringCenterVector.normalize();
	ringCenterVector.scale(radius);
	var ringCenter = shared_fragment_center.add(ringCenterVector);

	var bridgeAtoms = kemia.layout.RingPlacer.getBridgeAtoms(shared_fragment);

	var bondAtom1 = bridgeAtoms[0];
	var bondAtom2 = bridgeAtoms[1];

	var bondAtom1Vector = new kemia.layout.Vector2D(bondAtom1.coord.x,
			bondAtom1.coord.y);
	var bondAtom2Vector = new kemia.layout.Vector2D(bondAtom2.coord.x,
			bondAtom2.coord.y);

	bondAtom1Vector.sub(ringCenterVector);
	bondAtom2Vector.sub(ringCenterVector);

	var occupiedAngle = bondAtom1Vector.angle(bondAtom2Vector);

	var remainingAngle = (2 * Math.PI) - occupiedAngle;
	var addAngle = remainingAngle
	/ (ring.atoms.length - shared_fragment.atoms.length + 1);

	var startAtom = kemia.layout.RingPlacer.findStartAtom(ringCenterVector,
			bondAtom1, bondAtom2);
	var startAngle = goog.math.toRadians(goog.math.angle(startAtom.coord.x, startAtom.coord.y, ringCenterVector.x, ringCenterVector.y));

	var atoms_to_place = kemia.layout.RingPlacer.atomsInPlacementOrder(
			startAtom, shared_fragment.bonds[0], ring.bonds);

	var addAngle = addAngle
	* kemia.layout.RingPlacer.findDirection(ringCenterVector,
			bondAtom1, bondAtom2);
	kemia.layout.AtomPlacer.populatePolygonCorners(atoms_to_place, ringCenter, startAngle,
			addAngle, radius);
}

kemia.layout.RingPlacer.atomsInPlacementOrder = function(atom, bond, bonds) {
	var other_bonds = goog.array.filter(bonds, function(b){
		return b!==bond;
	});
	var next_bond = goog.array.find(other_bonds, function(b) {
		return b.otherAtom(atom);
	});

	var remaining_bonds = goog.array.filter(other_bonds, function(b){
		return b!==next_bond;
	});

	if (remaining_bonds.length > 0) {
		var next_atom = next_bond.otherAtom(atom);
		return goog.array.concat(next_atom, kemia.layout.RingPlacer
				.atomsInPlacementOrder(next_atom, next_bond, remaining_bonds));
	} else {
		return [];
	}
}
/**
 * determine direction
 * 
 * @param {kemia.layout.Vector2D}
 *            ringCenter
 * @param {kemia.model.Atom}
 *            atom1
 * @param {kemia.model.Atom}
 *            atom2
 * 
 * @return{number} 1 or -1
 */
kemia.layout.RingPlacer.findDirection = function(ringCenter, atom1, atom2) {
	var result = 1;
	var diff = goog.math.Coordinate.difference(atom1.coord, atom2.coord);

	if (diff.x == 0) {
		// vertical bond
		if (ringCenter.x > atom1.coord.x) {
			result = -1;
		}
	} else {
		// not vertical
		if (ringCenter.y - atom1.coord.y < (ringCenter.x - atom1.coord.x)
				* diff.y / diff.x) {
			result = -1;
		}
	}
	return result;
};

kemia.layout.RingPlacer.findStartAtom = function(ringCenter, atom1, atom2) {
	var diff = goog.math.Coordinate.difference(atom1.coord, atom2.coord);
	if (diff.x == 0) {
		// vertical bond
		// start with the lower Atom
		if (atom1.coord.y > atom2.coord.y) {
			return atom1;
		}
	} else {
		// bond is not vertical
		// start with the left Atom
		if (atom1.coord.x > atom2.coord.x) {
			return atom1;
		}
	}
	return atom2;
}

/**
 * Returns the bridge atoms, that is the outermost atoms in the chain of more
 * than two atoms which are shared by two rings
 * 
 * @param sharedAtoms
 *            The atoms (n > 2) which are shared by two rings
 * @return The bridge atoms, i.e. the outermost atoms in the chain of more than
 *         two atoms which are shared by two rings
 */
kemia.layout.RingPlacer.getBridgeAtoms = function(shared_fragment) {
	var bridge_atoms = [];
	goog.array.forEach(shared_fragment.atoms, function(atom) {
		goog.array.forEach(atom.bonds.getValues(), function(bond) {
			if (goog.array.contains(shared_fragment.bonds, bond)) {
				bridge_atoms.push(bond.otherAtom(atom));
			}
		});
	});
	return bridge_atoms;
}

/**
 * Generated coordinates for a fused ring.
 * 
 * @param ring
 *            The ring to be placed
 * @param sharedAtoms
 *            The atoms of this ring, also members of another ring, which are
 *            already placed
 * @param sharedAtomsCenter
 *            The geometric center of these atoms
 * @param ringCenterVector
 *            A vector pointing the the center of the new ring
 * @param bondLength
 *            The standard bondlength
 */
kemia.layout.RingPlacer.placeFusedRing = function(ring, shared_fragment,
		sharedAtomsCenter, ringCenterVector, bondLength) {

	var radius = kemia.layout.RingPlacer.getNativeRingRadius(ring.atoms.length,
			bondLength);
	var newRingPerpendicular = Math.sqrt(Math.pow(radius, 2)
			- Math.pow(bondLength / 2, 2));
	ringCenterVector.normalize();
	ringCenterVector.scale(newRingPerpendicular);

	var ringCenter = sharedAtomsCenter.add(ringCenterVector);

	var bondAtom1 = shared_fragment.atoms[0];
	var bondAtom2 = shared_fragment.atoms[1];

	var bondAtom1Vector = new kemia.layout.Vector2D(
			bondAtom1.coord.x, bondAtom1.coord.y);
	var bondAtom2Vector = new kemia.layout.Vector2D(
			bondAtom2.coord.x, bondAtom2.coord.y);

	bondAtom1Vector.sub(ringCenter);
	bondAtom2Vector.sub(ringCenter);

	var occupiedAngle = bondAtom1Vector.angle(bondAtom2Vector);

	var remainingAngle = (2 * Math.PI) - occupiedAngle;
	var addAngle = remainingAngle / (ring.atoms.length -  1);

	var startAtom = kemia.layout.RingPlacer.findStartAtom(ringCenterVector,
			bondAtom1, bondAtom2);
	var startAngle = Math.atan2(startAtom.coord.y - ringCenter.y, startAtom.coord.x - ringCenter.x);

	var atoms_to_place = kemia.layout.RingPlacer.atomsInPlacementOrder(
			startAtom, shared_fragment.bonds[0], ring.bonds);
	var direction = kemia.layout.RingPlacer.findDirection(ringCenterVector,
			bondAtom1, bondAtom2);
	var addAngle = addAngle * direction; 
	kemia.layout.AtomPlacer.populatePolygonCorners(atoms_to_place, ringCenter,
			startAngle, addAngle, radius);
}

/**
 * Generated coordinates for a spiro ring.
 * 
 * @param ring
 *            The ring to be placed
 * @param sharedAtoms
 *            The atoms of this ring, also members of another ring, which are
 *            already placed
 * @param sharedAtomsCenter
 *            The geometric center of these atoms
 * @param ringCenterVector
 *            A vector pointing the the center of the new ring
 * @param bondLength
 *            The standard bondlength
 */
kemia.layout.RingPlacer.placeSpiroRing = function(ring, shared_fragment,
		sharedAtomsCenter, ringCenterVector, bondLength) {
	var radius = kemia.layout.RingPlacer.getNativeRingRadius(ring.atoms.length,
			bondLength);
	ringCenterVector.normalize();
	ringCenterVector.scale(radius);
	var ringCenter = sharedAtomsCenter.add(ringCenterVector);

	var addAngle = 2 * Math.PI / ring.atoms.length;

	var startAtom = shared_fragment.atoms[0];
	var startAngle = new kemia.layout.Vector2D(startAtom.coord.x,
			startAtom.coord.y).angle(ringCenterVector);

	var atoms_to_place = kemia.layout.RingPlacer.atomsInPlacementOrder(
			startAtom, shared_fragment.bonds[0], ring.bonds);

	kemia.layout.AtomPlacer.populatePolygonCorners(atoms_to_place, ringCenter,
			startAngle, addAngle, radius);
};

/**
 * Returns the ring radius of a perfect polygons of size ring.getAtomCount() The
 * ring radius is the distance of each atom to the ringcenter.
 * 
 * @param {number}
 *            size Number of atoms in the ring for which the radius is to
 *            calculated
 * @param {number}
 *            bondLength The bond length for each bond in the ring
 * @return {number} The radius of the ring.
 */
kemia.layout.RingPlacer.getNativeRingRadius=function(size, bondLength){
	return bondLength / (2 * Math.sin((Math.PI) / size));
}

kemia.layout.RingPlacer.getIntersectingAtoms = function(ring1, ring2) {
	var atoms = [];
	goog.array.forEach(ring2.atoms, function(atom) {
		if (goog.array.contains(ring1.atoms, atom)) {
			atoms.push(atom);
		}
	});
	return atoms;
}

kemia.layout.RingPlacer.getIntersectingBonds = function(ring1, ring2) {
	var bonds = [];
	goog.array.forEach(ring2.bonds, function(bond) {
		if (goog.array.contains(ring1.bonds, bond)) {
			bonds.push(bond);
		}
	});
	return bonds;
}

/**
 * finds center of a list of atoms
 * 
 * @param {Array.
 *            <kemia.model.Atom>} atoms, list of atoms to find center of
 * @return {goog.math.Coordinate} coordinate of center of atoms
 */
kemia.layout.RingPlacer.center = function(atoms) {
	var sum = goog.array.reduce(atoms, function(rval, atom) {
		return goog.math.Coordinate.sum(rval, atom.coord);
	}, new goog.math.Coordinate(0, 0));

	return new goog.math.Coordinate(sum.x / atoms.length, sum.y
			/ atoms.length);
};

kemia.layout.RingPlacer.placeConnectedRings = function(ringset, ring,
		bondLength) {
	var connectedRings = kemia.ring.RingPartitioner.directConnectedRings(ring,
			ringset);
	goog.array.forEach(connectedRings, function(connected_ring) {
		var shared_fragment = {
				atoms : kemia.layout.RingPlacer.getIntersectingAtoms(ring,
						connected_ring),
						bonds : kemia.layout.RingPlacer.getIntersectingBonds(ring,
								connected_ring)
		}

		var shared_fragment_center = kemia.layout.RingPlacer
		.center(shared_fragment.atoms);
		var old_ring_center = kemia.layout.RingPlacer.center(ring.atoms);
		var new_ring_center = goog.math.Coordinate.difference(
				shared_fragment_center, old_ring_center);
		var new_ring_center_vector = new kemia.layout.Vector2D(new_ring_center.x, new_ring_center.y);
		var shared_fragment_center_vector = new kemia.layout.Vector2D(shared_fragment_center.x, shared_fragment_center.y);
		kemia.layout.RingPlacer.placeRing(connected_ring, shared_fragment,
				shared_fragment_center_vector, new_ring_center_vector, bondLength);
	});
	var remaining = goog.array.filter(ringset, function(r) {
		return !r === ring;
	});
	if (remaining.length > 0) {
		kemia.layout.RingPlacer.placeConnectedRings(remaining, remaining[0],
				bondLength);
	}
};

/**
 * flag all atoms in rings as unplaced atoms
 * 
 * @param {Array.Array.<
 *            <kemia.ring.Ring>>}
 */
kemia.layout.RingPlacer.resetUnplacedRingAtoms = function(ringset){
	goog.array.forEach(ringset, function(ring){
		if(!ring.isPlaced){
			goog.array.forEach(ring.atoms, function(atom){
				atom.setFlag(kemia.model.Flags.ISPLACED, false);
			});
		}
	});	
};

kemia.layout.RingPlacer.findNextRingBondWithUnplacedRingAtom = function(bonds){
	return  goog.array.find(bonds, function(bond){
		return goog.array.some([bond.source, bond.target], function(atom){
			return atom.flags[kemia.model.Flags.ISINRING] && !atom.flags[kemia.model.Flags.ISPLACED] && bond.otherAtom(atom).flags[kemia.model.Flags.ISPLACED];
		});
	});
};

kemia.layout.RingPlacer.layoutNextRingSystem=function(firstBondVector, molecule, sssr, ringsets){

	kemia.layout.RingPlacer.resetUnplacedRingAtoms(sssr);
	var placed_atoms = goog.array.filter(molecule.atoms, function(atom){
		return atom.flags[kemia.model.Flags.ISPLACED];
	});

	var next_bond = kemia.layout.RingPlacer.findNextRingBondWithUnplacedRingAtom(molecule.bonds);

	if (next_bond){
		var ring_atom = goog.array.find([next_bond.source, next_bond.target], function(atom){
			return atom.flags[kemia.model.Flags.ISINRING] && !atom.flags[kemia.model.Flags.ISPLACED];
		});

		var chain_atom = next_bond.otherAtom(ring_atom);

		// ringset containing ring_atom
		var next_ring_set = goog.array.find(ringsets, function(ringset){
			return goog.array.find(ringset, function(ring){
				return goog.array.contains(ring.atoms, ring_atom);
			});
		});

		var old_ring_atom_coord = ring_atom.coord.clone();
		var old_chain_atom_coord = chain_atom.coord.clone();

		kemia.layout.CoordinateGenerator.layoutRingSet(firstBondVector, next_ring_set);

		// Place all the substituents of next ring system
		kemia.layout.AtomPlacer.markNotPlaced(placed_atoms);
		var substituents = kemia.layout.RingPlacer.placeRingSubstituents(next_ring_set, kemia.layout.CoordinateGenerator.BOND_LENGTH);
		kemia.layout.AtomPlacer.markPlaced(placed_atoms);

		// Translate and rotate the laid out ring system to match the
		// geometry of the
		// attachment bond
		var trans_diff = goog.math.Coordinate.difference( old_chain_atom_coord,  chain_atom.coord);
		var old_angle = goog.math.angle(0, old_chain_atom_coord.x - old_ring_atom_coord.x, 0, old_chain_atom_coord.y - old_ring_atom_coord.y);
		var new_angle = goog.math.angle(0, chain_atom.coord.x - ring_atom.coord.x, 0, chain_atom.coord.y - ring_atom.coord.y);
		var angle_diff = goog.math.angleDifference( new_angle, old_angle);


		var placed_atoms = goog.array.concat(substituents.atoms, 
				goog.array.flatten(goog.array.map(next_ring_set, function(ring){
					return ring.atoms;
				}))
				);

		var trans = kemia.graphics.AffineTransform.getRotateInstance(goog.math.toRadians(angle_diff), old_chain_atom_coord.x, old_chain_atom_coord.y);
		trans.translate(trans_diff.x, trans_diff.y);

		var new_coords = trans.transformCoords(
				goog.array.map(placed_atoms, function(atom){
					return atom.coord;
				})
				);
		goog.array.forEach(placed_atoms, function(atom, idx){
			atom.coord = new_coords[idx];
		});
	    goog.array.forEach(next_ring_set, function(ring){
	    	ring.isPlaced = true;
	    });
	}
}


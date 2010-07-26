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
	/* get the angle between the x axis and the bond vector */
	var rotangle = bondVector.angle(new kemia.layout.Vector2D(0, 1));
	/*
	 * Add 90 Degrees to this angle, this is supposed to be the new ringcenter
	 * vector
	 */
	rotangle += Math.PI / 2;
	return new kemia.layout.Vector2d(Math.cos(rotangle) * newRingPerpendicular,
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
	goog.array.forEach(ringset, function(ring) {
		var unplaced_partners = [];
		var shared_atoms = [];
		var treated_atoms = [];
		goog.array.forEach(ring.atoms, function(atom) {
			var rings = goog.array.filter(ringset, function(r) {
				return goog.array.contains(r.atoms, atom);
			});
			var rings_atoms = goog.array.flatten(goog.array.map(rings,
					function(r) {
						return r.atoms;
					}));
			var center_of_ring_gravity = kemia.ring.RingPlacer
					.center(rings_atoms);
			kemia.layout.AtomPlacer.partitionPartners(atom, unplaced_partners,
					shared_atoms);
			kemia.layout.AtomPlacer.markNotPlaced(unplaced_partners);
			treated_atoms.push(unplaced_partners);
			if (unplaced_partners.length > 0) {
				kemia.layout.AtomPlacer.distributePartners(atom, shared_atoms,
						center_of_ring_gravity, unplaced_partners);
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
	var radius = kemia.layout.RingPlacer.getNativeRingRadius(ring.length,
			bondLength);
	ringCenterVector.normalize();
	ringCenterVector.scale(radius);
	var ringCenter = sharedAtomsCenter.add(ringCenterVector);

	var bridgeAtoms = kemia.layout.RingPlacer.getBridgeAtoms(sharedAtoms);

	var bondAtom1Vector = new kemia.layout.Vector2D(bridgeAtom[0].coord.x,
			bridgeAtom[0].coord.y);
	var bondAtom2Vector = new kemia.layout.Vector2D(bridgeAtom[1].coord.x,
			bridgeAtom[1].coord.y);

	bondAtom1Vector.sub(ringCenterVector);
	bondAtom2Vector.sub(ringCenterVector);

	var occupiedAngle = bondAtom1Vector.angle(bondAtom2Vector);

	var remainingAngle = (2 * Math.PI) - occupiedAngle;
	var addAngle = remainingAngle
			/ (ring.atoms.length - sharedAtoms.atoms.length + 1);

	var startAtom = kemia.layout.RingPlacer.findStartAtom(ringCenterVector,
			bondAtom1, bondAtom2);
	var startAngle = new kemia.layout.Vector2D(startAtom.coord.x,
			startAtom.coord.y).angle(ringCenterVector);

	var atoms_to_place = kemia.layout.RingPlacer.atomsInPlacementOrder(
			startAtom, shared_fragment.bonds[0], ring.bonds);

	var addAngle = addAngle
			* kemia.layout.RingPlacer.findDirection(ringCenterVector,
					bondAtom1, bondAtom2);
	atomPlacer.populatePolygonCorners(atoms_to_place, ringCenter, startAngle,
			addAngle, radius);
}

kemia.layout.RingPlacer.atomsInPlacementOrder = function(atom, bond, bonds) {
	var next_bond = goog.array.find(bonds, function(b) {
		return b.otherAtom(atom);
	});
	var remaining = goog.array.filter(bonds, function(bb) {
		return !bb === bond;
	});

	if (remaining.length > 0) {
		var next_atom = next_bond.otherAtom(atom);
		return goog.array.concat(next_atom, kemia.layout.RingPlacer
				.atomsInPlacementOrder(next_atom, next_bond, remaining));
	} else {
		return [ next_atom ];
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
	var diff = google.math.Coordinate.difference(atom1.coord, atom2.coord);

	if (diff.x == 0) {
		// vertical bond
		if (ringCenter.x < atom1.coord.x) {
			return -1;
		}
	} else {
		// not vertical
		if (ringCenter.y - atom1.coord.y < (ringCenter.x - atom1.coord.x)
				* diff.y / diff.x) {
			return -1;
		}
		return 1;
	}
};

kemia.layout.RingPlacer.findStartAtom = function(ringCenter, atom1, atom2) {
		var diff = google.math.Coordinate.difference(atom1.coord, atom2.coord);
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
	 * Returns the bridge atoms, that is the outermost atoms in the chain of
	 * more than two atoms which are shared by two rings
	 * 
	 * @param sharedAtoms
	 *            The atoms (n > 2) which are shared by two rings
	 * @return The bridge atoms, i.e. the outermost atoms in the chain of more
	 *         than two atoms which are shared by two rings
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
	 *            The atoms of this ring, also members of another ring, which
	 *            are already placed
	 * @param sharedAtomsCenter
	 *            The geometric center of these atoms
	 * @param ringCenterVector
	 *            A vector pointing the the center of the new ring
	 * @param bondLength
	 *            The standard bondlength
	 */
kemia.layout.RingPlacer.placeFusedRing = function(ring, sharedAtoms,
			sharedAtomsCenter, ringCenterVector, bondLength) {

		var radius = kemia.layout.RingPlacer.getNativeRingRadius(ring.length,
				bondLength);
		var newRingPerpendicular = Math.sqrt(Math.pow(radius, 2)
				- Math.pow(bondLength / 2, 2));
		ringCenterVector.normalize();
		ringCenterVector.scale(newRingPerpendicular);

		var ringCenter = sharedAtomsCenter.add(ringCenterVector);

		var bondAtom1 = sharedAtoms.atoms[0];
		var bondAtom2 = sharedAtoms.atoms[1];

		var bondAtom1Vector = new kemia.layout.Vector2D(
				sharedAtoms.atoms[0].coord.x, sharedAtoms.atoms[0].coord.y);
		var bondAtom2Vector = new kemia.layout.Vector2D(
				sharedAtoms.atoms[1].coord.x, sharedAtoms.atoms[1].coord.y);

		bondAtom1Vector.sub(ringCenterVector);
		bondAtom2Vector.sub(ringCenterVector);

		var occupiedAngle = bondAtom1Vector.angle(bondAtom2Vector);

		var remainingAngle = (2 * Math.PI) - occupiedAngle;
		var addAngle = remainingAngle
				/ (ring.atoms.length - sharedAtoms.atoms.length + 1);

		var startAtom = kemia.layout.RingPlacer.findStartAtom(ringCenterVector,
				bondAtom1, bondAtom2);
		var startAngle = new kemia.layout.Vector2D(startAtom.coord.x,
				startAtom.coord.y).angle(ringCenterVector);

		var atoms_to_place = kemia.layout.RingPlacer.atomsInPlacementOrder(
				startAtom, shared_fragment.bonds[0], ring.bonds);

		var addAngle = addAngle
				* kemia.layout.RingPlacer.findDirection(ringCenterVector,
						bondAtom1, bondAtom2);
		atomPlacer.populatePolygonCorners(atoms_to_place, ringCenter,
				startAngle, addAngle, radius);
	}

	/**
	 * Generated coordinates for a spiro ring.
	 * 
	 * @param ring
	 *            The ring to be placed
	 * @param sharedAtoms
	 *            The atoms of this ring, also members of another ring, which
	 *            are already placed
	 * @param sharedAtomsCenter
	 *            The geometric center of these atoms
	 * @param ringCenterVector
	 *            A vector pointing the the center of the new ring
	 * @param bondLength
	 *            The standard bondlength
	 */
kemia.layout.RingPlacer.placeSpiroRing = function(ring, shared_fragment,
			sharedAtomsCenter, ringCenterVector, bondLength) {
		var radius = kemia.layout.RingPlacer.getNativeRingRadius(ring.length,
				bondLength);
		ringCenterVector.normalize();
		ringCenterVector.scale(radius);
		var ringCenter = sharedAtomsCenter.add(ringCenterVector);

		var addAngle = 2 * Math.PI / ring.length;

		var startAtom = shared_fragment.atoms[0];
		var startAngle = new kemia.layout.Vector2D(startAtom.coord.x,
				startAtom.coord.y).angle(ringCenterVector);

		var atoms_to_place = kemia.layout.RingPlacer.atomsInPlacementOrder(
				startAtom, shared_fragment.bonds[0], ring.bonds);

		var addAngle = addAngle
				* kemia.layout.RingPlacer.findDirection(ringCenterVector,
						bondAtom1, bondAtom2);
		atomPlacer.populatePolygonCorners(atoms_to_place, ringCenter,
				startAngle, addAngle, radius);
	};
	
	/**
	 * Returns the ring radius of a perfect polygons of size ring.getAtomCount()
	 * The ring radius is the distance of each atom to the ringcenter.
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

	kemia.layout.RingPlacer.getIntersectingAtoms = function(ring, rings) {
		var atoms = [];
		goog.array.forEach(rings, function(r) {
			goog.array.forEach(r.atoms, function(atom) {
				if (goog.array.contains(ring.atoms, atom)) {
					atoms.push(atom);
				}
			});
		});
		goog.array.removeDuplicates(atoms);
		return atoms;
	}

	kemia.layout.RingPlacer.getIntersectingBonds = function(ring, rings) {
		var bonds = [];
		goog.array.forEach(rings, function(r) {
			goog.array.forEach(r.bonds, function(bond) {
				if (goog.array.contains(ring.bonds, bond)) {
					bonds.push(bond);
				}
			});
		});
		goog.array.removeDuplicates(bonds);
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
		var connectedRings = kemia.ring.RingFinder.directConnectedRings(ring,
				ringset);
		goog.array.forEach(connectedRings, function(connected_ring) {
			var shared_fragment = {
				atoms : kemia.ring.RingPlacer.getIntersectingAtoms(ring,
						connected_ring),
				bonds : kemia.ring.RingPlacer.getIntersectingBonds(ring,
						connected_ring)
			}

			var shared_fragment_center = kemia.ring.RingPlacer
					.center(shared_fragment.atoms);
			var old_ring_center = kemia.ring.RingPlacer.center(ring.atoms);
			var new_ring_center = goog.math.Coordinate.difference(
					shared_fragment_center, old_ring_center);
			kemia.ring.RingPlacer.placeRing(connected_ring, shared_fragment,
					shared_fragment_center, new_ring_center, bondLength);
		});
		var remaining = goog.array.filter(ringset, function(r) {
			return !r === ring;
		});
		if (remaining.length > 0) {
			kemia.ring.RingPlacer.placeConnectedRings(remaining, remaining[0],
					bondLength);
		}
	};


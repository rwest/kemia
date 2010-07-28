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
goog.provide('kemia.ring.RingPartitioner');
goog.require('goog.array');

/**
 * partitions array of rings into connected lists
 * 
 * @param {Array.
 *            <kemia.ring.Ring>} rings list of rings to group into connected
 *            arrays
 * @return {Array.<Array.<kemia.ring.Ring>>} array of arrays of Rings
 */
kemia.ring.RingPartitioner.getPartitionedRings = function(rings) {
	var partitions = [];
	var search = rings;
	goog.array.forEach(rings, function(ring) {
		if (!goog.array.contains(goog.array.flatten(partitions), ring)) {
			var connections = goog.array.find(partitions, function(rings) {
				return goog.array.contains(rings, ring);
			});
			if (connections == null) {
				connections = [ ring ];// start a new group of rings
			search = goog.array.filter(search, function(r) {
				return r !== ring;
			});
		}
		var connected = kemia.ring.RingPartitioner.directConnectedRings(ring,
				search);
		connections = goog.array.concat(connections, connected);
		search = goog.array.filter(search, function(r) {
			goog.array.contains(connected, r);
		});
		partitions.push(connections);
	}
	;
}	);
	return partitions;
};

/**
 * finds rings directly connected to the subject ring
 * 
 * @param{kemia.ring.Ring} ring, the ring which we want to find direct
 *                         connections to
 * @param{Array.<kemia.ring.Ring>} rings, the rings we want to search for
 *               connections
 * @return{Array.<kemia.ring.Ring>} array of directly connected rings, which
 *                does *not* include the subject ring
 */
kemia.ring.RingPartitioner.directConnectedRings = function(ring, rings) {
	result = [];
	goog.array.forEach(rings, function(r) {
		var isConnected = goog.array.some(r.atoms, function(atom) {
			if (r === ring) {
				return false;
			} else {
				return goog.array.contains(ring.atoms, atom);
			}
		});
		if (isConnected) {
			result.push(r);
		}
	});
	return result;
}
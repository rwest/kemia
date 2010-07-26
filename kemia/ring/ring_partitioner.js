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
 * Class to partition an array of rings into connected arrays of rings
 * 
 * @constructor
 * @param {Array.
 *            <kemia.ring.Ring>} rings, the array of rings to partition
 */
kemia.ring.RingPartitioner = function(rings) {
	/**
	 * @type{Array.<Array.<kemia.ring.Ring>>}
	 */
	this._connected = [];
	/**
	 * @type{Array.<kemia.ring.Ring>}
	 */
	this._search = rings;

}

/**
 * partitions rings
 * 
 * @return {Array.<Array.<kemia.ring.Ring>>} array of arrays of Rings
 */
kemia.ring.RingPartitioner.prototype.getPartitionedRings = function() {

	goog.array.forEach(this._search, function(ring) {
		var connections = goog.array.find(this._connected, function(rings) {
			return goog.array.contains(rings, ring);
		}, this);
		if (connections == null) {
			connections = [ ring ];
			this._connected.push(connections);
			goog.array.remove(this._search, ring);
		}
		goog.array.concat(connections, kemia.ring.RingPartitioner.directConnectedRings(ring, this._search));

	}, this);
	return this._connected;
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
			return goog.array.contains(ring.atoms, atom);
		});
		if (isConnected) {
			result.push(r);
		}
	});
	return result;
}
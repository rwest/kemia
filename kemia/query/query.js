/*
 * Copyright 2010 Tim Vandermeersch
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); 
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 
 * 
 * Unless required by applicable law or agreed to in writing, software 
 * distributed under the License is distributed on an "AS IS" BASIS, 
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
 * See the License for the specific language governing permissions and 
 * limitations under the License.
 */

goog.provide('kemia.query.Query');

(function() {

    /**
     * @namespace
     * @name kemia
     */
    /**
     * @namespace
     * @name kemia.query
     */

    /**
     * <h2 class="fixedFont">Introduction</h2>
     * <p>Substructure search is essentially searching for a mapping of a query on a 
     * molecule. In kemia, a flexible set of classes are used for substructure 
     * searching. These classes can be devied in three groups: queries, query compilers
     * and mappers.</p>
     * <h2 class="fixedFont">Queries</h2>
     * <p>Queries define the (sub)stucture to be searched for. Similar to a molecule, a
     * query contains atoms and bonds. The methods required for queries and their atoms
     * and bonds are defined by interfaces. These are {@link kemia.query.IQuery},
     * {@link kemia.query.IQueryAtom} and {@link kemia.query.IQueryBond}. Default
     * implementations for these classes are provided but any objects implementing the
     * interfaces can be used. The default implementations are {@link kemia.query.Query},
     * {@link kemia.query.QueryAtom} and {@link kemia.query.QueryBond}.</p> 
     * <p>When doing a substructure search, queries are usually created using a query
     * compiler. Directly manipulating query objects is only needed when implementing 
     * new query compilers.</p>
     * <h2 class="fixedFont">Query Compilers</h2>
     * <p>Query Compilers convert various query representations to query objects 
     * implementing the query interfaces. The query compiler interface 
     * {@link kemia.query.IQueryCompiler} only contains a static compile method.</p>
     * <p>The {@link kemia.query.MoleculeCompiler} takes a molecule and converts it
     * to a query. The resulting query is an exact (sub)structure search. Another 
     * smililar query compiler is the {@link kemia.query.SmilesCompiler} which 
     * converts a smiles string to a query. Complex queries can be created using the 
     * {@link kemia.query.SmartCompiler}. Smarts strings are complex queries with 
     * logical operators for query atoms and/or query bonds.</p>
     *
     * The usage of various query compilers is the same:
     * <pre class="code">
     * goog.require('kemia.query.MoleculeCompiler')
     * goog.require('kemia.query.SmilesCompiler')
     * goog.require('kemia.query.SmartsCompiler')
     * ...
     * var query = kemia.query.MoleculeCompiler.compile(molecule);
     * var query = kemia.query.SmilesCompiler.compile("OCCC=N");
     * var query = kemia.query.SmartsCompiler.compile("[C,N]=&@C");
     * </pre>
     * 
     * <h2 class="fixedFont">Mappers</h2>
     * <p>Mappers search for a mapping of the query onto a molecule. The interface 
     * for mappers is {@link kemia.query.IMapper}. The query is specified when
     * constructing the mapper object. Once constructed, one or more molecules can
     * be searched with the same query. Every mapper implements the mapFirst and 
     * mapUnique methods to map only the first found match or map all unique 
     * mappings.</p>
     * <p>Mapping all unique mappings can be time consuming for large molecules. To
     * solv this problem, the work of a substructure search can be divided in short
     * running time parts. To make use of this, the mapUniqueCallback method can be
     * used. Depending on the size of your molecule mapUnique will return within 
     * 100ms. When searching a large number of molecules (e.g. a database) it is
     * recommended to frequently allow the browser to do gui updating. If this is 
     * not done, the browser will "lock" and the user experiences the page as 
     * unresponsive.</p> 
     *
     * Example showing how to allow the browser to remain responsive:
     * <pre class="code">
     * var i = 0;
     * var smiles = ['CC(C)C', 'c1ccccc1CC', ...];
     * var query = kemia.query.SmilesCompiler.compile('c1ccccc1');
     * var mapper = new kemia.query.DFSMapper(query);
     * function doNext() {
     *       var molecule = kemia.io.smiles.parse(smiles[i]);
     *       var maps = mapper.mapUnique(molecule);
     *       debug("match " + (i+1) + ": " + maps.length);
     *       i++;
     *       if (i < smiles.length) {
     *           // a timeout of 0 means: process events (i.e. gui, mouse presses,
     *           // key presses, ...) and class doNext
     *           setTimeout(doNext, 0);
     *       }
     * }
     * </pre>
     *
     *
     * <h2 class="fixedFont">Example</h2>
     * <pre class="code">
     * &lt;html&gt;
     *     &lt;head&gt;
     *         &lt;script&gt;
     *             goog.require('kemia.query.SmartsCompiler')
     *             goog.require('kemia.query.DFSMapper')
     *   
     *             function doSubstructureSearch(molecule, smart) {
     *                  var query = kemia.query.SmartCompiler.compile(smart);
     *                  var mapper = kemia.query.DFSMapper(query);
     *                  var maps = mapper.mapUnique(molecule);
     *                  ...do something with found mappings...
     *             }
     *         &lt;/script>
     *     &lt;/head&gt;
     *     &lt;body&gt;
     *     &lt;/body&gt;
     * &lt;/html&gt;
     * </pre>
     *
     *
     * @page Substructure Search
     * @name needed to make sure jsdoc doesn't ignore the comment
     */

    /**
     * <p>The {@link kemia.query.IQuery} class defines an interface for Query
     * objects. Other classes in the Substructure Search framework rely on these interfaces
     * to ensure interoperability. The interface doesn't actually do anything. Since 
     * javascript is a dynamic language, we can pass any object as parameter. As long
     * as the object has the correct methods and fields, no inheritance is needed.</p>
     * 
     * <p>This interface makes use of two other interfaces: {@link kemia.query.IQueryAtom} 
     * and {@link kemia.query.IQueryBond}. There is a default implementation for these
     * interfaces: {@link kemia.query.Query}, {@link kemia.query.QueryAtom} and
     * {@link kemia.query.QueryBond}. However, in practice the use of query compilers 
     * limit the need to directly manipulate query objects. There are query compilers to 
     * convert a {@link kemia.model.Molecule}, SMILES or SMARTS to a query.</p>
     * 
     *
     * Example showing the use of various query compilers:
     * <pre class="code">
     * goog.require('kemia.query.MoleculeCompiler')
     * goog.require('kemia.query.SmilesCompiler')
     * goog.require('kemia.query.SmartsCompiler')
     * ...
     * var query = kemia.query.MoleculeCompiler.compile(molecule);
     * var query = kemia.query.SmilesCompiler.compile("OCCC=N");
     * var query = kemia.query.SmartsCompiler.compile("[C,N]=&@C");
     * </pre>
     *
     * @author Tim Vandermeersch
     * @class Interface defining Query objetcs.
     * @interface
     */
    kemia.query.IQuery = function() {
        throw Error('IQuery: Interface should never be constructed!');
        /**
         * Add a query atom to this query.
         * @param atom The query atom to add.
         */
        this.addAtom = function(/**kemia.query.IQueryAtom*/atom) {};
        /**
         * Add a query bond to this query.
         * @param bond The query bond to add
         */
        this.addBond = function(/**kemia.query.IQueryBond*/bond) {};
        /**
         * Get the number of query atoms in this query.
         * @return {number} The number of query atoms in this query.
         */
        this.countAtoms = function() {};
        /**
         * Get an atom by index.
         * @param index The atom index.
         * @return {?kemia.query.IQueryAtom} The atom with the specified index or null if the atom is not in the query.
         */
        this.getAtom = function(/**number*/index) {};
        /**
         * Find the bond connecting atom1 with atom2.
         * @param atom1 The first atom.
         * @param atom2 The second atom.
         * @return {?kemia.query.IQueryBond} The found bond or null if no such bond exists.
         */
        this.findBond = function(/**kemia.query.IQueryAtom*/atom1, /**kemia.query.IQueryAtom*/atom2) {};
        /**
         * Get the index of the specified query atom.
         * @param atom The query atom for which to get the index.
         * @return {number} The index of the specified atom or -1 if the atom is 
         * not part of this query.
         */
        this.indexOfAtom = function(/**kemia.query.IQueryAtom*/atom) {};
    };

    /**
     * @class Interface defining query atoms.
     * @see kemia.query.IQuery
     * @see kemia.query.IQueryBond
     */
    kemia.query.IQueryAtom = function() {
        /**
         * Compare an atom with this query atom.
         * @param atom The atom to be compared with this query atom.
         * @param opt_molecule The molecule containing atom.
         * @param opt_sssr The SSSR for the molecule.
         * @return {boolean} True if the specified atom matches this query atom.
         */
        this.matches = function(/**kemia.query.QueryAtom*/atom, /**kemia.model.Moleculei=*/opt_molecule, 
                /**Array.<kemia.ring.Ring>=*/opt_sssr) {};
        /**
         * Get the neighbors for this query atom.
         * @return {Array.<kemia.query.QueryAtom>} The neighbors for this query atom.
         */
        this.getNeighbors = function() {};
    };

    /**
     * @class Interface defining query bonds.
     * @see kemia.query.IQuery 
     * @see kemia.query.IQueryAtom
     */
    kemia.query.IQueryBond = function(source, target) {
        /**
         * Compare an bond with this query bond.
         * @param bond The bond to be compared with this query bond.
         * @param opt_molecule The molecule containing atom.
         * @param opt_sssr The SSSR for the molecule.
         * @return {boolean} True if the specified bond matches this query bond.
         */
        this.matches = function(/**kemia.query.QueryBond*/bond, /**kemia.model.Molecule=*/opt_molecule, 
                /**Array.<kemia.ring.Ring>=*/opt_sssr) {};
    };

    /**
     * Query compilers are used to convert various input sources to queries. 
     * To implement a query compiler, a single static "compile" member function
     * is needed. The method should return an object implementing 
     * {@link kemia.query.IQuery}
     * @class Interface defining Query Compilers.
     * @interface
     */
    kemia.query.IQueryCompiler = {
        /**
         * Compile a query.
         * @param variable The source for query compilation, this can be a molecule, smiles or smarts string, ...
         * @return {kemia.query.IQuery}
         */
        compile: function(/**?*/variable) {}
    }; 
   
    /**
     * Mappers are used to do substructure searching. The input is a query and molecule.
     * @class Interface defining Substructure Mappers
     * @interface
     */
    kemia.query.IMapper = function(/**kemia.query.IQuery*/query) {
        /**
         * Find the first mapping of the query onto the molecule.
         * @param molecule The molecule to search.
         * @return {goog.structs.Map} The mapping, can be empty if none found.
         */
        this.mapFirst = function(/**kemia.model.Molecule*/molecule) {};
        /**
         * Find all unqiue mappings of the query onto the molecule.
         * @param molecule The molecule to search.
         * @return {Array.<goog.structs.Map>} The mappings, can be an empty array if none found.
         */
        this.mapUnique = function(/**kemia.model.Molecule*/molecule) {};
        /**
         * Find all unqiue mappings of the query onto the molecule. Unlike mapUnique, this 
         * method doesn't return the result directly. The specified callback function is 
         * called when the results are ready. At intervals, control is released to the 
         * browser to process events. This allows large molecules to be searched without
         * creating a bad (i.e. unresponsive) user experience.
         * @param molecule The molecule to search.
         * @return {Array.<goog.structs.Map>} The mappings, can be an empty array if none found.
         */
        this.mapUniqueCallback = function(/**kemia.model.Molecule*/molecule, /**function(Array.<goog.structs.Map>)*/callback) {};
    };


    /**
     * @class Default query implementation.
     * @see kemia.query.QueryAtom
     * @see kemia.query.QueryBond
     * @implements {kemia.query.IQuery}
     */
    kemia.query.Query = function() {
        this.atoms = [];
        this.bonds = [];
        this.isSSSRRequired = false;
    };

    /**
     * Get the number of atoms in this query.
     * @return {number} The number of atoms in this query.
     */
    kemia.query.Query.prototype.countAtoms = function() {
        return this.atoms.length;
    };

    /**
     * Get the index of the specified atom.
     * @param atom The atom for which to get the index.
     * @return {number} The index of the specified atom or -1 if the atom is 
     * not part of this query.
     */
    kemia.query.Query.prototype.indexOfAtom = function(/**kemia.query.IQueryAtom*/atom) {
        return goog.array.indexOf(this.atoms, atom);
    };

    /**
     * Get an atom by index.
     * @param index The atom index.
     * @return {kemia.query.IQueryAtom} The atom with the specified index or null if the index is invalid.
     */
    kemia.query.Query.prototype.getAtom = function(/**number*/index) {
        return this.atoms[index];
    };

    /**
     * Add an atom to this query.
     * @param atom The query atom to add.
     */
    kemia.query.Query.prototype.addAtom = function(/**kemia.query.IQueryAtom*/atom) {
        this.atoms.push(atom);
    };

    /**
     * Add a bond to this query.
     * @param bond The query bond to add.
     */
    kemia.query.Query.prototype.addBond = function(/**kemia.query.IQueryBond*/bond) {
        bond.source.neighbors.push(bond.target);
        bond.target.neighbors.push(bond.source);
        this.bonds.push(bond);
    };

    /**
     * Find the bond connecting atom1 with atom2.
     * @param atom1 The first atom.
     * @param atom2 The second atom.
     * @return {?kemia.query.IQueryBond} The found bond or null if no such bond exists.
     */
    kemia.query.Query.prototype.findBond = function(/**kemia.query.IQueryAtom*/atom1, /**kemia.query.IQueryAtom*/atom2) {
        for ( var i = 0, il = this.bonds.length; i < il; i++) {
            var bond = this.bonds[i];
            if ((atom1 === bond.source && atom2 === bond.target) || (atom2 === bond.source && atom1 === bond.target)) {
                return bond;
            }
        }
        return null;
    };


    /**
     * @class Default query atom implementation
     * @see kemia.query.Query
     * @see kemia.query.QueryBond
     * @implements {kemia.query.IQueryAtom}
     */
    kemia.query.QueryAtom = function() {
        // query properties
        this.symbols = [];
        this.valence = 0;
        // topology properties
        this.neighbors = [];
    };

    /**
     * Compare an atom with this query atom.
     * @param atom The atom to be compared with this query atom.
     * @param opt_molecule The molecule containing atom.
     * @param opt_sssr The SSSR for the molecule.
     * @return {boolean} True if the specified atom matches this query atom.
     */
    kemia.query.QueryAtom.prototype.matches = function(/**kemia.query.IQueryAtom*/atom, /**kemia.model.Molecule=*/opt_molecule, 
            /**Array.<kemia.ring.Ring>=*/opt_sssr) {
        var symbolMatches = true;
        if (this.symbols.length) {
            if (goog.array.indexOf(this.symbols, atom.symbol) === -1) {
                symbolMatches = false;                
            }
        }

        var valenceMatches = this.valence <= atom.countBonds();

        return symbolMatches && valenceMatches;    
    };

    /**
     * Get the neighbors for this query atom.
     * @return {Array.<kemia.query.IQueryAtom>} The neighbors for this query atom.
     */
    kemia.query.QueryAtom.prototype.getNeighbors = function() {
        return this.neighbors;
    };

    /**
     * @class Class representing a bond in a query
     * @see kemia.query.Query 
     * @see kemia.query.QueryAtom
     */
    kemia.query.QueryBond = function(/**kemia.query.IQueryAtom*/source, /**kemia.query.IQueryBond*/target) {
        // query properties
        this.orders = [];
        // topology properties
        this.source = source;
        this.target = target;
    };
   
    /**
     * Compare an bond with this query bond.
     * @param bond The bond to be compared with this query bond.
     * @param opt_molecule The molecule containing atom.
     * @param opt_sssr The SSSR for the molecule.
     * @return {boolean} True if the specified bond matches this query bond.
     */
    kemia.query.QueryBond.prototype.matches = function(/**kemia.query.IQueryBond*/bond, /**kemia.model.Molecule=*/opt_molecule, 
            /**Array.<kemia.ring.Ring>=*/opt_sssr) {
        if (!this.orders.length) {
            return true; // match any bond order
        }
        if (goog.array.indexOf(this.orders, bond.order) !== -1) {
            return true;
        }
        return false;
    };

 
}());

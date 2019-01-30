/*
*    main.js
*    Mastering Data Visualization with D3.js
*    2.4 - Adding SVGs with D3
*/

/*********************************************************************************
 * d3.select() uses CSS selectors to select elements, in similar fashion to jQuery
 * - it returns a object that we can manipulate
 * - selectAll() returns all matching elements
 * ------------------------------------------------
 * .append("rect") returns a handle to the newly created object
 * - we can use it to set the attributes
 * ------------------------------------------------
 * .attr("key", val) sets the key attr to the set value
 * _______________________________________________
 * Method chaining is used most of the time, because each method 
 * 	returns the object it has modified
 */

 var svg = d3.select('#chart-area')
	 .append('svg')
		.attr('width', 400)
		.attr('height', 400);

var circle = svg.append('circle')
	.attr('cx', 100)
	.attr('cy', 100)
	.attr('r', 70)
	.attr('fill', 'blue');

var rect = svg.append('rect')
	.attr('fill', 'red')
	.attr('x', 200)
	.attr('y', 200)
	.attr('height', 50)
	.attr('width', 100);
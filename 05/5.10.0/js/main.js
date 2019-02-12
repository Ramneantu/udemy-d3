/*
*    main.js
*    Mastering Data Visualization with D3.js
*    Project 2 - Gapminder Clone
*/

var margins = {
	top: 20,
	bottom: 100,
	left: 100,
	right: 10
}

var x, y;

var height = 500 - margins.top - margins.bottom;
var width = 700 - margins.left - margins.right;

var svg = d3.select("#chart-area")
	.append("svg")
		.attr("height", height + margins.top + margins.bottom)
		.attr("width", width + margins.left + margins.right);

var g = svg.append('g')
			.attr('transform', 	`translate(${margins.left}, ${margins.top})`);

x = d3.scaleLog()
.range([0, width])
var xAxisCall;
var xAxisGroup = g
				.append('g')	
				.attr("class", "x-axis-group")
				.attr('transform', 'translate(0, ' + height + ')');

y = d3.scaleLinear()
	.range([height, 0]);
var yAxisCall;
var yAxisGroup = g.append('g')
					.attr('class', 'y-axis-group');

var r = d3.scaleSqrt()
		.range([0, 50]);
var c = d3.scaleOrdinal()
		.range(d3.schemeCategory10);

// Labels
g.append("text")
	.attr("x", width/2)
	.attr('y', height + 70)
	.attr('font-size', '20px')
	.attr('text-anchor', 'middle')
	.text('GDP per Capita($)');

g.append("text")
	.attr("x", -(height/2))
	.attr('y', -60)
	.attr('font-size', '20px')
	.attr('text-anchor', 'middle')
	.attr('transform', 'rotate(-90)')
	.text('Life Expectancy (Years)');

var yearPlaceholder = g.append("text")
	.attr("x", width - 20)
	.attr('y', height - 40)
	.attr('font-size', '20px')
	.attr('text-anchor', 'middle');

var index = 0;
d3.json("data/data.json").then(function(data){
	
	data.forEach(element => {
		element.year = +element.year;
	});

	console.log(data);
	
	y.domain([0, d3.max(data, el => {
		return d3.max(el.countries, d => d.life_exp);
	})]);
	x.domain([100, d3.max(data, el => {
		return d3.max(el.countries, d => d.income);
	})]);
	r.domain([0, d3.max(data, el => {
		return d3.max(el.countries, d => d.population);
	})]);
	let set = new Set();
	data[0].countries.forEach(d => set.add(d.continent));
	c.domain(data[0].countries)

	xAxisCall = d3.axisBottom(x)
				.tickFormat(d => '$' + d)
				.ticks(3);
	yAxisCall = d3.axisLeft(y)
				.ticks(8);

	yAxisGroup.call(yAxisCall);
	xAxisGroup.call(xAxisCall);
	
	
	d3.interval(function(){
		index = (index + 1) % data.length;
		update(data[index]);
	}, 50);
	update(data[index]);
})


function update(data){

	const filtered = data.countries.filter(d => {if(d.income && d.population && d.life_exp) return true; return false;});
	// Don't reuse trasition object!!!
	const fast = d3.transition().duration(50);
	var circles = g.selectAll("circle")
		.data(filtered, d => d.country);
	
	const year = data.year;
	yearPlaceholder.text(year);

	circles.exit()
		.transition(fast)
		.attr('r', 0)
		.attr('fill' , 'white')
		.remove();

	circles.enter()
		.append('circle')
		.attr('fill', d => c(d.continent))
		.attr('cx', d => x(d.income))
		.attr('cy', d => y(d.life_exp))
		.attr('r', d => r(d.population))
		.merge(circles)
			.transition(fast)
			.attr('cx', d => x(d.income))
			.attr('cy', d => y(d.life_exp))
			.attr('r', d => r(d.population));

}
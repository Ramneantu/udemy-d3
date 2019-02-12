/*
*    main.js
*    Mastering Data Visualization with D3.js
*    Project 1 - Star Break Coffee
*/

var margins = {
    top: 10,
    bottom: 150,
    left: 100,
    right: 20,
}

var height = 500 - margins.top - margins.bottom;
var width = 700 - margins.right - margins.left;

var svg = d3.select("#chart-area")
        .append('svg')
        .attr('width', width + margins.left + margins.right)
        .attr('height', height + margins.top + margins.bottom)

var g = svg.append('g')
        .attr('transform', `translate(${margins.left}, ${margins.top})`);

g.append("text")
    .attr('class', 'x-axis-label')
    .attr('x', width / 2)
    .attr('y', height + 70)
    .attr('font-size', '20px')
    .attr('text-anchor', 'middle')
    .text('Month');

g.append('text')
    .attr('class', 'y-axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('y', -60)
    .attr('x',  -170)
    .attr('font-size', '20px')
    .attr('text-anchor', 'middle')
    .text('Earnings')

d3.json("data/revenues.json").then((data) => {

    
    data.forEach(element => {
        element.revenue = +element.revenue;
        element.profit = +element.profit;
    });

    var y = d3.scaleLinear()
            .domain([0, d3.max(data, el => el.revenue)])
            .range([height, 0]);
    
    var x = d3.scaleBand()
            .domain(data.map(el => el.month))
            .range([0, width])
            .paddingInner(.3)
            .paddingOuter(.3);

    var xAxisCall = d3.axisBottom(x);
    var yAxisCall = d3.axisLeft(y).ticks(10).tickFormat(d => '$' + d);

    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxisCall);
    g.append('g')
        .attr('class', 'y-axis')
        .call(yAxisCall);

    g.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x(d.month))
        .attr('y', d => y(d.revenue))
        .attr('width', x.bandwidth)
        .attr('height', d => height - y(d.revenue))
        .attr('fill', 'grey');
});
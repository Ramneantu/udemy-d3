/*
*    main.js
*    Mastering Data Visualization with D3.js
*    5.2 - Looping with intervals
*/

var margin = { left:80, right:20, top:50, bottom:100 };

var width = 600 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var x, y;
    
var g = d3.select("#chart-area")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

// X Label
g.append("text")
    .attr("y", height + 50)
    .attr("x", width / 2)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Month");

// Y Label
g.append("text")
    .attr("y", -60)
    .attr("x", -(height / 2))
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Revenue");

// Adding the groups in here so we don't create multiple copies
// We just update the scales in down below
// X Axis
var xAxisCall = d3.axisBottom(x);
var xAxisGroup = g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height +")");

// Y Axis
var yAxisCall = d3.axisLeft(y)
    .tickFormat(function(d){ return "$" + d; });
var yAxisGroup = g.append("g")
    .attr("class", "y axis");

// X Scale, domain moved
x = d3.scaleBand()
.range([0, width])
.padding(0.2);

// Y Scale, domain moved
y = d3.scaleLinear()
    .range([height, 0]);


d3.json("data/revenues.json").then(function(data){
    // console.log(data);

    // Clean data
    data.forEach(function(d) {
        d.revenue = +d.revenue;
    });

    // Interval function
    d3.interval(function(){
        update(data);
    }, 1000);

    // First run
    update(data);
});

function update(data) {
    //Moved domain definition here
    x.domain(data.map(function(d){ return d.month }));
    y.domain([0, d3.max(data, function(d) { return d.revenue })]);

    // X Axis
    var xAxisCall = d3.axisBottom(x);
    xAxisGroup.call(xAxisCall);

    // Y Axis
    var yAxisCall = d3.axisLeft(y)
        .tickFormat(function(d){ return "$" + d; });
    yAxisGroup.call(yAxisCall);

    // Bars
    // var rects = g.selectAll("rect")
    //     .data(data)
        
    // rects.enter()
    //     .append("rect")
    //         .attr("y", function(d){ return y(d.revenue); })
    //         .attr("x", function(d){ return x(d.month) })
    //         .attr("height", function(d){ return height - y(d.revenue); })
    //         .attr("width", x.bandwidth)
    //         .attr("fill", "grey");
};








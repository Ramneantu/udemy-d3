/*
*    main.js
*    Mastering Data Visualization with D3.js
*    3.7 - D3 min, max, and extent
*/

var svg = d3.select("#chart-area")
    .append("svg")
    .attr("width", "400")
    .attr("height", "400");

d3.json("data/buildings.json").then(function(data){
    console.log(data);

    data.forEach(d => {
        d.height = +d.height;
    });

    var x = d3.scaleBand()
        .domain(data.map(function(d){
            return d.name;
        }))
        .range([0, 400])
        .paddingInner(0.3)
        .paddingOuter(0.3);
    
    /**
     * min, max and extend
     * take an array of data and a callback function
     * extent returns an array with 2 items, the min and the max
     */
    console.log('here we are!');
    var y = d3.scaleLinear()
        .domain(d3.extent(data, function(d){
            return d.height;
        }))
        .range([0, 400]);

    var rects = svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("y", 0)
        .attr("x", function(d){
            return x(d.name);
        })
        .attr("width", x.bandwidth)
        .attr("height", function(d){
            return y(d.height);
        })
        .attr("fill", "grey");

});
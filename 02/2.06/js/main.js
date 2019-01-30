/*
*    main.js
*    Mastering Data Visualization with D3.js
*    2.6 - Selections and data joins
*/

var data = [25, 20, 10, 12, 15];

var svg = d3.select("#chart-area").append("svg")
    .attr("width", 400)
    .attr("height", 400);

// Just go with it, will be explained later on
var circles = svg.selectAll("circle")
    .data(data);

// We can use functions to set our dimensions depending on the data in the array
// Mind the order of operations. First all the 'index' functions run then the 'value' ones follow
circles.enter()
    .append("circle")
        .attr("cx", function(d, i){
            console.log(`Value ${d} at index ${i}`)
            return (i * 50) + 25;
        })
        .attr("cy", 25)
        .attr("r", function(d){
            console.log(`Value ${d}`)
            return d;
        })
        .attr("fill", "red");
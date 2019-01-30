/*
*    main.js
*    Mastering Data Visualization with D3.js
*    2.7 - Loading external data
*/

d3.json("data/ages.json").then((data) => {
    
    // Casting to int
    data.forEach(element => {
        // Trick to casting
        element.age = +element.age;
    });

    var svg = d3.select("#chart-area").append("svg")
        .attr("width", 400)
        .attr("height", 400);

    var circles = svg.selectAll("circle")
        .data(data);

    circles.enter()
        .append("circle")
            .attr("cx", function(d, i){
                console.log(`Value ${d} at index ${i}`)
                return (i * 50) + 25;
            })
            .attr("cy", 25)
            .attr("r", function(d){
                console.log(`Value ${d.age}`)
                return d.age * 2;
            })
            .attr("fill", (d) => {
                if(d.name === 'Tony')
                    return 'blue';
                return 'red';
            });
})
.catch((error) => alert('Error: ' + error));

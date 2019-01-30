/*
*    main.js
*    Mastering Data Visualization with D3.js
*    3.2 - Linear scales
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

    /**
     * LINEAR SCALES
     * We define our function
     *  */ 
    let y = d3.scaleLinear()
                .domain([0, 828])
                .range([0, 400]);
    // We can also use the invese funciton
    console.log(y.invert(100));

    /**
     * LOG SCALES
     * -----------------
     * For a log scale we also need to define the base of the log (default 10 if not used)
     */
    let x = d3.scaleLog()
                .domain([100, 300000])
                .range([0, 400])
                .base(10);

    /**
     * TIME SCALES
     * -----------------
     * Works with JS date objects
     */
     var xt = d3.scaleTime()
                .domain([new Date(2000, 0, 1), new Date(2001, 0, 1)])
                .range([0, 400]);

    /**
     * ORDINAL SCALES
     * we loop back if domain bigger than range, so no error
     */
    var color = d3.scaleOrdinal()
                    .domain(['Bob', 'Bill', 'Frank', 'Johnny', 'Don', 'Marc', 'Richie'])
                    .range(['RED', 'BLUE', 'GREEN', 'YELLOW', 'BLACK', 'GREY', 'PURPLE']);
    var colorDefault = d3.scaleOrdinal()
                    .domain(['Bob', 'Bill', 'Frank', 'Johnny', 'Don', 'Marc', 'Richie'])
                    .range(d3.schemeCategory10);

    /**
     * BAND SCALES
     * used to space out rectangles in bar charts
     */
    var xb = d3.scaleBand()
                    .domain(['Bob', 'Bill', 'Frank', 'Johnny', 'Don', 'Marc', 'Richie'])
                    .range([0, 400])
                    .paddingInner(.3)
                    .paddingOuter(.2);
    
    console.log('Bob sits at: ' + xb('Bob'));
    console.log('Frank sits at: ' + xb('Frank'));
    console.log('Bandwidth: ' + xb.bandwidth());
    
    var names = data.map(el => el.name);
    var xb = d3.scaleBand()
                    .domain(names)
                    .range([0, 400])
                    .paddingInner(.3)
                    .paddingOuter(.2);

    var rects = svg.selectAll("rect")
            .data(data)
        .enter()
            .append("rect")
            .attr("y", 0)
            .attr("x", function(d, i){
                return xb(d.name);
            })
            .attr("width", xb.bandwidth())
            .attr("height", function(d){
                // Apply function on the height
                return y(d.height);
            })
            .attr("fill", function(d) {
                return "grey";
            });

});




/*
*    main.js
*    Mastering Data Visualization with D3.js
*    CoinStats
*/

var margin = { left:80, right:100, top:50, bottom:100 },
    height = 500 - margin.top - margin.bottom, 
    width = 800 - margin.left - margin.right;

var svg = d3.select("#chart-area").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + 
        ", " + margin.top + ")");

// Time parser for x-scale
var parseTime = d3.timeParse("%d/%m/%Y");
var formatTime = d3.timeFormat("%d/%m/%Y");


// For tooltip, returns index
var bisectDate = d3.bisector(function(d) { return d.date; }).left;


// Scales
var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// Axis generators
var xAxisCall = d3.axisBottom()
var yAxisCall = d3.axisLeft()
    .ticks(6)
    .tickFormat(function(d) {
        if(d >= 1000000000)
            return parseInt(d / 1000000000) + "B";
        if(d >= 1000000)
            return parseInt(d / 1000000) + "M";
        if(d >= 1000)
            return parseInt(d / 1000) + "k";
        return parseInt(d);});

// Axis groups
var xAxis = g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");
var yAxis = g.append("g")
    .attr("class", "y axis")
    
// Y-Axis label
var yAxisLabel = yAxis.append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -(height/2))
    .style("text-anchor", "middle")
    .attr("fill", "#5D6971")
    .attr("font-size", '20px')
    .text("Price (USD)");

// Line path generator
var line = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); });

//Graph
var graph = g.append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "grey")
    .attr("stroke-with", "3px");

var formattedData;

/******************************** Tooltip Code ********************************/

var focus = g.append("g")
    .attr("class", "focus")
    .style("display", "none");

focus.append("line")
    .attr("class", "x-hover-line hover-line")
    .attr("y1", 0)
    .attr("y2", height);

focus.append("line")
    .attr("class", "y-hover-line hover-line")
    .attr("x1", 0)
    .attr("x2", width);

focus.append("circle")
    .attr("r", 7.5);

focus.append("text")
    .attr("x", 15)
    .attr("dy", ".31em");

var overlayListener = g.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .on("mouseover", function() { focus.style("display", null); })
    .on("mouseout", function() { focus.style("display", "none"); });


d3.json("data/coins.json").then(function(data) {

    // Data cleaning
    Object.keys(data).forEach(function(key) {
        data[key].forEach(d => {
            // Use brackets if it is illegal with dot notation
            d['24h_vol'] = +d['24h_vol'];
            d.date = parseTime(d.date);
            d.market_cap = +d.market_cap;
            d.price_usd = +d.price_usd;
        });
    });
    formattedData = data;
    console.log(data);

    update(data);

});

$('#coin-select').on('change', () => update(formattedData));
$('#var-select').on('change', () => update(formattedData));
$('#date-slider').slider({
    max: new Date(2017, 10, 31).getTime() / 1000,
    min: new Date(2013, 5, 12).getTime() / 1000,
    step: 86400,
    range: true,
    values: [new Date(2013, 5, 12).getTime()/1000, new Date(2017, 10, 31).getTime()/1000],
    slide: function(event, ui){
        $('#dateLabel1').text(formatTime(new Date(ui.values[0] * 1000)));
        $('#dateLabel2').text(formatTime(new Date(ui.values[1] * 1000)));
        update(formattedData);
    }
});

function update(data){

    const left = parseTime($('#dateLabel1').text());
    const right = parseTime($('#dateLabel2').text());
    const selectedCoin = $('#coin-select').val();
    const selectedAttr = $('#var-select').val();

    filtered = data[selectedCoin].filter(el => {
        if(el[selectedAttr] && el.date >= left && el.date <= right)
            return true;
        return false;
    });
    // Set scale domains
    x.domain(d3.extent(filtered, function(d) { return d.date; }));
    y.domain([0, 
        d3.max(filtered, function(d) { return d[selectedAttr]; }) * 1.005]);

    // Generate axes once scales have been set
    xAxis.call(xAxisCall.scale(x))
    yAxis.call(yAxisCall.scale(y))
    // Switch text
    var optionText = $("#var-select option:selected").text();
    if(selectedAttr !== 'price_usd')
        optionText += '(USD)';
    yAxisLabel.text(optionText);

    // Add line to chart
    const localLine = line.y(function(d){ return y(d[selectedAttr]); });
    
    //Removing old line, NO LONGER NEEDED
    //g.select('.line').remove();
    const t = d3.transition().duration(300);
    
    //Append before
    graph
        .transition(t)
        .attr("d", localLine(filtered));


    
    //overlayListener.on("mousemove", function(){mousemove.bind(this, filtered, selectedAttr)});
    overlayListener.on("mousemove", function(){
        mousemove(filtered, selectedAttr);
    });

    
    /******************************** Tooltip Code ********************************/
}

function mousemove(filtered, selectedAttr) {
    var x0 = x.invert(d3.mouse(d3.event.target)[0]),
        i = bisectDate(filtered, x0, 1),
        d0 = filtered[i - 1],
        d1 = filtered[i],
        d = x0 - d0.date > d1.date - x0 ? d1 : d0;
    focus.attr("transform", "translate(" + x(d.date) + "," + y(d[selectedAttr]) + ")");
    focus.select("text").text(d[selectedAttr]);
    focus.select(".x-hover-line").attr("y2", height - y(d[selectedAttr]));
    focus.select(".y-hover-line").attr("x2", -x(d.date));
}



/*
*    main.js
*    Mastering Data Visualization with D3.js
*    2.8 - Activity: Your first visualization!
*/

d3.json("data/buildings.json").then((data) => {

    let svg = d3.select('#chart-area').append('svg').attr('width', 800).attr('height', 800);

    data.forEach(element => element.height = +element.height);
    let rects = svg.selectAll('rect').data(data);

    rects.enter()
        .append('rect')
            .attr('x', (d, i) => i*50 + 20)
            .attr('y', 20)
            .attr('height', d => d.height)
            .attr('width', 40)
            .attr('fill', 'black');        
})
.catch(e => alert('We had an ERROR: ' + e));
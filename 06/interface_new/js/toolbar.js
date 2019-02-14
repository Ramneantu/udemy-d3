let toolbarHeight = 50;
let toolbarSvg;
function initToolbar(){
    toolbarSvg = d3.select('body')
        .append('svg')
        .attr('oncontextmenu', 'return false;')
        .attr('width', width)
        .attr('height', toolbarHeight)
        .attr('y', height);
}
function renderToolbar(){
    toolbarSvg.selectAll('.toolbarFrame')
      .data([1]).enter()
      .append('rect')
        .classed('toolbarFrame', true)
        .attr('width', width)
        .attr('height', toolbarHeight)
        .attr('fill', '#f2f2f2')
        .style('stroke', '#262626');
    const boxPaddingSide = 25;
    const offsetY = 10;
    const interX = 10;
    const interY = 10;
    let offsetX = 20;
    const buttonPaddingSide = 5;

    toolbarSvg.selectAll('.reuseBox').remove();
    
    // Just one of each kind
    const filtered = new Array();
    blocksArr.forEach(d => {
        if(d.second)
            filtered.push(d.first);
    });
    let g = toolbarSvg.selectAll('.reuseBox')
        .data(filtered).enter()
        .append('g')
        .classed('reuseBox', true);
    
    const rectHeight = 28;
    const slotWidth = g.append('text')
        .style('font-size', '16')
        .text(d => d.desc)
        .node()
        .getComputedTextLength()
        + 2 * buttonPaddingSide;
    
    g.insert('rect', 'text')
        .attr('width', function(){return d3.select(this.parentNode).select('text').node().getComputedTextLength() + 2 * buttonPaddingSide;})
        .attr('height', rectHeight)
        .style('fill', d => colors(d.id))
        .style('stroke', '#2f3033')
        .style('cursor', 'default')
        .on('dblclick', (d) => {
            if(d.desc !== currentContext.desc){
                const nodeTuple = buildBlock(d.desc);
                blockInsertCoordinates = [offsetX + slotWidth/2, 350];
                currentContext.nodes.push(nodeTuple.first);
                blocksArr.push(nodeTuple);
                syncNode(nodeTuple.first);
                restart();
            }
        })
    g.select('text')
        .attr('text-anchor', 'middle')
        .attr('x', function(){return (d3.select(this.parentNode).select('text').node().getComputedTextLength() + 2 * buttonPaddingSide) / 2;})
        .attr('y', rectHeight / 2 + 6);
    g.attr('transform', function(d, i){
        const slotWidth = d3.select(this).select('text').node().getComputedTextLength() + 2 * buttonPaddingSide;
        const str = `translate(${offsetX},${offsetY})`;
        offsetX += slotWidth + interX;
        return str;
    });
    

    // blocksArr.forEach((d, i) => {
    //     // Not the first of its kind
    //     if(d.second === false)
    //         return;
    //     const g = toolbarSvg.append('g').classed('reuseBox', true);
    //     const slotWidth = g.append('text')
    //         .style('font-size', '16')
    //         .text(d.first.desc)
    //         .node()
    //         .getComputedTextLength()
    //         + 2 * buttonPaddingSide;
    //     const rectHeight = 28;
    //     g.insert('rect', 'text')
    //         .attr('width', slotWidth)
    //         .attr('height', rectHeight)
    //         .style('fill', colors(d.first.id))
    //         .style('stroke', '#2f3033')
    //         .style('cursor', 'default')
    //         .on('dblclick', () => {
    //             if(d.first.desc !== currentContext.desc){
    //                 const nodeTuple = buildBlock(d.first.desc);
    //                 blockInsertCoordinates = [offsetX + slotWidth/2, 350];
    //                 currentContext.nodes.push(nodeTuple.first);
    //                 blocksArr.push(nodeTuple);
    //                 syncNode(nodeTuple.first);
    //                 restart();
    //             }
    //         })
    //     g.select('text')
    //         .attr('x', buttonPaddingSide)
    //         .attr('y', rectHeight / 2 + 6);
    //     g.attr('transform', `translate(${offsetX},${offsetY})`);
    //     offsetX += slotWidth + interX;
    // })
  }
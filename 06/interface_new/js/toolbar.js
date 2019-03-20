function Toolbar(){
    const toolbarHeight = 50;
    // let toolbarSvg;
    // Initialize second svg
    this.svg = d3.select('body')
        .append('svg')
        .attr('oncontextmenu', 'return false;')
        .attr('width', width)
        .attr('height', toolbarHeight)
        .attr('y', height);
    // old name: addFromToolbar
    this.add = function(d){
        if(d.desc !== currentContext.desc && !descInStack(d.desc)){
            const nodeTuple = buildBlock(d.desc);
            blockInsertCoordinates = [width / 2, height * 0.8];
            currentContext.nodes.push(nodeTuple.first);
            blocksArr.push(nodeTuple);
            syncNode(nodeTuple.first);
            restart();
        }
    }
    // old name: renderToolbar
    this.render = function(){
        this.svg.selectAll('.toolbarFrame')
        .data([1]).enter()
        .append('rect')
            .classed('toolbarFrame', true)
            .attr('width', BlockNode.maximizedWidth)
            .attr('x', (width - BlockNode.maximizedWidth) / 2)
            .attr('height', toolbarHeight)
            .attr('fill', '#f2f2f2')
            .style('stroke', '#262626')
            .style('stroke-width', '2.5px');
        const boxPaddingSide = 25;
        const offsetY = 10;
        const interX = 10;
        const interY = 10;
        let offsetX = (width - BlockNode.maximizedWidth) / 2 + 15;
        const buttonPaddingSide = 5;

        this.svg.selectAll('.reuseBox').remove();
        
        // Just one of each kind
        const filtered = new Array();
        blocksArr.forEach(d => {
            if(d.second)
                filtered.push(d.first);
        });
        let g = this.svg.selectAll('.reuseBox')
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
            .style('cursor', 'context-menu')
            .on('dblclick', d => pushContext(d, false))
            .on('contextmenu', d3.contextMenu(menuToolboxBlock))
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
    }
}
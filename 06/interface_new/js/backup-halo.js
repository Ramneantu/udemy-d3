function addEpsilonCircle(haloGroup)
    {
        const smallCircleGroup = haloGroup.append('g');
            smallCircleGroup
                .append('circle')
                .attr('r', SimpleNode.radius * 0.6)
                .attr('cy',SimpleNode.radius * 1.5)
                .style('cursor', 'pointer')
                .style('fill', 'yellow')
                // transparent
                .style('fill-opacity', 0)
                .on('mousedown', (d) => {
                    if (d3.event.which === 3 || contextOpen || formOpen)
                        return;

                    // select node
                    mousedownNode = d;
                    mousedownLetter = smallCircleGroup.select('text').text();
                    selectedLink = null;

                    // reposition drag line
                    dragLine
                        .style('marker-end', 'url(#end-arrow)')
                        .attr('d', `M${mousedownNode.x},${mousedownNode.y}L${mousedownNode.x},${mousedownNode.y}`);
                    dragGroup
                        .attr('display', 'block');

                    restart();
                })
                .on('mouseover', (d) => {
                    smallCircleGroup.select('text')
                        .style('font-weight', 'bold')
                        .style('font-size', 16)
                })
                .on('mouseleave', (d) => {
                    smallCircleGroup.select('text')
                        .style('font-weight', 'normal')
                        .style('font-size', 14)
                })
            // Mouseup propagates until svg and cancels drag line
            smallCircleGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('y', SimpleNode.radius * 1.6)
                .text('\u03b5')
                .style('font-size', 14);
    }

const smallCircleGroup = haloGroup.append('g');
            smallCircleGroup
                .append('circle')
                .attr('r', SimpleNode.radius * 0.6)
                .attr('cy', -Math.sin((i + 0.5) * Math.PI / alphabet.length) * SimpleNode.radius * 1.5)
                .attr('cx', Math.cos(Math.PI - (i + 0.5) * Math.PI / alphabet.length) * SimpleNode.radius * 1.5)
                .style('fill', 'yellow')
                .style('cursor', 'pointer')
                // transparent
                .style('fill-opacity', 0)
                .on('mousedown', (d) => {
                    if (d3.event.which === 3 || contextOpen || formOpen)
                        return;

                    // select node
                    mousedownNode = d;
                    mousedownLetter = smallCircleGroup.select('text').text();
                    selectedLink = null;

                    // reposition drag line
                    dragLine
                        .style('marker-end', 'url(#end-arrow)')
                        .attr('d', `M${mousedownNode.x},${mousedownNode.y}L${mousedownNode.x},${mousedownNode.y}`);
                    dragGroup
                        .attr('display', 'block');

                    restart();
                })
                .on('mouseover', (d) => {
                    smallCircleGroup.select('text')
                        .style('font-weight', 'bold')
                        .style('font-size', 16)
                })
                .on('mouseleave', (d) => {
                    smallCircleGroup.select('text')
                        .style('font-weight', 'normal')
                        .style('font-size', 14)
                })
            // Mouseup propagates until svg and cancels drag line
            smallCircleGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('y', -Math.sin((i + 0.5) * Math.PI / alphabet.length) * SimpleNode.radius * 1.3)
                .attr('x', Math.cos(Math.PI - (i + 0.5) * Math.PI / alphabet.length) * SimpleNode.radius * 1.3)
                .text(d)
                .style('font-size', 14);

function addEpsilonRect(overlayGroup){
        // Rectangle
        const smallRectGroup = overlayGroup.append('g')
                .attr('transform', `translate(${(BlockNode.overlayWidth)/2},${BlockNode.overlayHeight - (BlockNode.overlayHeight - BlockNode.minimizedHeight)/4})`);
            smallRectGroup
                .append('circle')
                .attr('r', SimpleNode.radius * 0.6)
                .style('cursor', 'pointer')
                .style('fill', 'yellow')
                // transparent
                .style('fill-opacity', 0)
                .on('mousedown', (d) => {
                    if (d3.event.which === 3 || contextOpen || formOpen)
                            return;

                    // select node
                    mousedownNode = d;
                    mousedownLetter = smallRectGroup.select('text').text();
                    selectedLink = null;

                    // reposition drag line
                    dragLine
                        .style('marker-end', 'url(#end-arrow)')
                        .attr('d', `M${mousedownNode.x},${mousedownNode.y}L${mousedownNode.x},${mousedownNode.y}`);
                    dragGroup
                        .attr('display', 'block');

                    restart();
                })
                .on('mouseover', (d) => {
                    smallRectGroup.select('text')
                        .style('font-weight', 'bold')
                        .style('font-size', 16)
                })
                .on('mouseleave', (d) => {
                    smallRectGroup.select('text')
                        .style('font-weight', 'normal')
                        .style('font-size', 14)
                })
            // Mouseup propagates until svg and cancels drag line
            smallRectGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('y', 5)
                .text('\u03b5')
                .style('font-size', 14);
    }

const smallCircleGroup = overlayGroup.append('g')
    .attr('transform', `translate(${(BlockNode.overlayWidth - BlockNode.minimizedWidth)/4},${(BlockNode.overlayHeight - BlockNode.minimizedHeight)/4})`);
smallCircleGroup
    .append('circle')
    .attr('r', SimpleNode.radius * 0.6)
    .attr('cy', 0)
    .attr('cx', startX + i * slotWidth)
    .style('cursor', 'pointer')
    .style('fill', 'yellow')
    // transparent
    .style('fill-opacity', 0)
    .on('mousedown', (d) => {
        if (d3.event.which === 3 || contextOpen || formOpen)
            return;

        // select node
        mousedownNode = d;
        mousedownLetter = smallCircleGroup.select('text').text();
        selectedLink = null;

        // reposition drag line
        dragLine
            .style('marker-end', 'url(#end-arrow)')
            .attr('d', `M${mousedownNode.x},${mousedownNode.y}L${mousedownNode.x},${mousedownNode.y}`);
        dragGroup
            .attr('display', 'block');

        restart();
    })
    .on('mouseover', (d) => {
        smallCircleGroup.select('text')
            .style('font-weight', 'bold')
            .style('font-size', 16)
    })
    .on('mouseleave', (d) => {
        smallCircleGroup.select('text')
            .style('font-weight', 'normal')
            .style('font-size', 14)
    })
// Mouseup propagates until svg and cancels drag line
smallCircleGroup
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 5)
    .attr('x', startX + i * slotWidth)
    .text(d)
    .style('font-size', 14);


/***************************************************** */
/***************************************************** */
// Mouseup on node

// check for drag-to-self
mouseupNode = d;
// add link to graph (update if exists)
const source = mousedownNode;
const target = mouseupNode;
const label = mousedownLetter;

const link = currentContext.links.filter((l) => l.source === source && l.target === target)[0];
const reverseLink = currentContext.links.filter((l) => l.source === target && l.target === source)[0];
let modifiedLink = link
if(link)
    link.label += link.label.includes(label) ? '' : ' ' + label;
else{
    let newLink = new Link(source, target, label);
    modifiedLink = newLink;
    if(source === target)
        newLink.selftransition = true;
    else if(!reverseLink){
        newLink.bidirectional = false;
        newLink.up = source < target;
    }
    else {
        newLink.bidirectional = true;
        reverseLink.bidirectional = true;
        newLink.up = source < target;
    }
    currentContext.links.push(newLink);
}
syncLink(modifiedLink);

// select new link
selectedLink = link;
selectedNode = null;


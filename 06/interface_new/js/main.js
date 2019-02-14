// set up SVG for D3
const width = 960;
const height = 500;
const colors = d3.scaleOrdinal(d3.schemeCategory10);

const svg = d3.select('body')
  .append('svg')
  .attr('oncontextmenu', 'return false;')
  .attr('width', width)
  .attr('height', height);



// set up initial nodes and links
//  - nodes are known by 'id', not by index in array.
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.

let lastNodeId = 2;
// nodes, links and forces are just handles to the currently running simulation
let nodes = [new SimpleNode(0, false), new SimpleNode(1, true), new SimpleNode(2, false)];
let links = [new Link(nodes[0], nodes[1], 'a'), new Link(nodes[1], nodes[2], 'b')];
let alphabet = ['a', 'b', 'c', 'd'];
// init D3 force layout
let force = d3.forceSimulation()
  .force('link', d3.forceLink().id((d) => d.id).distance(150))
  .force('charge', d3.forceManyBody().strength(-500))
  .force('x', d3.forceX(width / 2))
  .force('y', d3.forceY(height / 2))
  .on('tick', tick.bind(this, 0, 0, width, height));
const root = new BlockNode(0, false, 'entire regex', 0, 0, nodes, links, force);
const blocksArr = new Array();
const allNodesArr = new Array(nodes[0], nodes[1], nodes[2]);

// Context in which we are operating (in which regex box are we)
//  We store it as an array and use it like a Stack, always pushing the new
//  context on top when focusing a block, and poping that context when we minimize the block 
let contextStack = [];
// Top of stack so to say
let currentContext = root;


// init D3 drag support
const drag = d3.drag()
  .on('start', (d) => {
    if (!d3.event.active) 
      currentContext.force.alpha(.5).alphaTarget(.3).alphaDecay(.04).restart();

    d.fx = d.x;
    d.fy = d.y;
  })
  .on('drag', (d) => {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  })
  .on('end', (d) => {
    if (!d3.event.active) 
      currentContext.force.alphaTarget(0);

    d.fx = null;
    d.fy = null;
  });

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

// line displayed when dragging new nodes
const dragLine = svg.append('g')
  .attr('class', 'dragGroup')
  .attr('display', 'none')
  .append('svg:path')
    .attr('class', 'link dragline')
    .attr('d', 'M0,0L0,0');
const dragText = svg.selectAll('.dragGroup')
  .append('text')
  .style('font-size', 14);
const dragGroup = svg.selectAll('.dragGroup');

// handles to link and node element groups
let path = svg.append('svg:g').classed('edges', true).selectAll('path');
// We create 2 sections, one for simple and one for compound states
let circle = svg.append('svg:g').classed('simple', true).selectAll('g');
let rect = svg.append('svg:g').classed('regex', true).selectAll('g');

// mouse event vars
let selectedNode = null;
let selectedLink = null;
let mousedownLink = null;
let mousedownNode = null;
let mouseupNode = null;
let mousedownLetter = null;
let contextOpen = false;
let formOpen = false;

function resetMouseVars() {
  mousedownNode = null;
  mouseupNode = null;
  mousedownLink = null;
  mousedownLetter = null;
}

function deselectAll() {
  selectedNode = null;
  selectedLink = null;
  restart();
}

// Params: relative - distance from midpoint seen as a fraction of the distance btw points
//         absolute - absolute distance from midpoint
function perpendicularBisector(p1, p2, up, relative, absolute = 0, locked = true) {

  const distSquared = (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
  const midpointX = (p1.x + p2.x) / 2;
  const midpointY = (p1.y + p2.y) / 2;
  let denominator = (p2.y - p1.y);
  if(denominator === 0)
    denominator = .001
  const m = -(p2.x - p1.x) / denominator;
  const intercept = midpointY - m * midpointX;
  let dx = Math.sqrt((distSquared * relative * relative + absolute * absolute) / ((m*m + 1)));
 
  let orient = (up ? 1 : -1);
  let supportX, supportY;
  if(locked){
    // Label always on the same side of the arrow
    if(p1.x > p2.x && up || p1.x <= p2.x && !up)
      orient = -orient;
    supportX = midpointX + (orient * m > 0 ? dx : -dx);
    supportY = (supportX * m + intercept);
  }
  else{
    // Label always on top
    supportX = midpointX + (orient > 0 ? dx : -dx);
    supportY = (supportX * m + intercept);
  }
 
  return {'x':supportX, 'y':supportY, 'm':m};
}

function perpendicularSlope(p1, p2){}

function placeLabel(link){
  const lineData = getLinePoints(link);
  const slope = (lineData.points[2].y - lineData.points[0].y) / (lineData.points[2].x - lineData.points[0].x);
  if(link.bidirectional)
    return perpendicularBisector({'x':lineData.points[0].x, 'y':lineData.points[0].y}, {'x':lineData.points[2].x, 'y':lineData.points[2].y}, link.up, 1/3, 15); 
  return perpendicularBisector({'x':lineData.points[0].x, 'y':lineData.points[0].y}, {'x':lineData.points[2].x, 'y':lineData.points[2].y}, slope > 0 ? true : false, 0, 8, false); 
}

function getLinePoints(link){
  //Both are circles
  let deltaX = link.target.x - link.source.x;
  let deltaY = link.target.y - link.source.y;
  const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const normX = deltaX / dist;
  const normY = deltaY / dist;
  const sourcePadding = SimpleNode.radius;
  // const sourcePadding = link.left ? SimpleNode.radius * 1.25 : SimpleNode.radius;
  // const targetPadding = link.right ? SimpleNode.radius * 1.25 : SimpleNode.radius;
  const targetPadding = SimpleNode.radius * 1.25;
  let sourceX = link.source.x + (sourcePadding * normX);
  let sourceY = link.source.y + (sourcePadding * normY);
  let targetX = link.target.x - (targetPadding * normX);
  let targetY = link.target.y - (targetPadding * normY);

  // Target is block
  let blockPadding = 4;
  if(link.target.isBlock){// && link.right){
    const proportionX = (Math.abs(deltaX) - BlockNode.minimizedWidth/2) / Math.abs(deltaX);
    const proportionY = (Math.abs(deltaY) - BlockNode.minimizedHeight/2) / Math.abs(deltaY);
    targetX = Math.max(proportionX, proportionY)*deltaX + link.source.x + (deltaX > 0 ? -blockPadding : blockPadding);
    targetY = Math.max(proportionX, proportionY)*deltaY + link.source.y + (deltaY > 0 ? -blockPadding : blockPadding);
  }
  if(link.source.isBlock){// && link.left){
    deltaX = -deltaX;
    deltaY = -deltaY;
    const proportionX = (Math.abs(deltaX) - BlockNode.minimizedWidth/2) / Math.abs(deltaX);
    const proportionY = (Math.abs(deltaY) - BlockNode.minimizedHeight/2) / Math.abs(deltaY);

    blockPadding = 0;
    sourceX = Math.max(proportionX, proportionY)*deltaX + link.target.x + (deltaX > 0 ? -blockPadding : blockPadding);
    sourceY = Math.max(proportionX, proportionY)*deltaY + link.target.y + (deltaY > 0 ? -blockPadding : blockPadding);
  }

  const midpointX = (sourceX + targetX) / 2;
  const midpointY = (sourceY + targetY) / 2;
  let support = {'x':midpointX, 'y':midpointY, 'm':0};
  if(link.bidirectional)
    support = perpendicularBisector({ "x": sourceX,   "y": sourceY},  { "x": targetX,  "y": targetY}, link.up, 1/3);

  return {'points': [{ "x": sourceX,   "y": sourceY},  { "x": support.x,  "y": support.y}, { "x": targetX,  "y": targetY}],
          'slope': support.m};
}

// Drawing an edge from one node to another
function drawEdge(link){

  const lineData = getLinePoints(link);
  let lineFunction = d3.line()
                        .x(function(d) { return d.x; })
                        .y(function(d) { return d.y; })
                        .curve(d3.curveBasis)
  
  return lineFunction(lineData['points']);
}

// update force layout (called automatically each iteration)
function tick(offsetX, offsetY, width, height) {
  // draw directed edges with proper padding from node centers
  path.selectAll('path').attr('d', (d) => drawEdge(d));
  path.selectAll('text')
    .attr('x', (d) => {
      const coord = placeLabel(d);
      return coord.x;
    })
    .attr('y', (d) => {
      const coord = placeLabel(d);
      return coord.y;
    })

  circle.attr('transform', (d) => {
    d.x = Math.max(SimpleNode.radius + offsetX, Math.min(offsetX + width - SimpleNode.radius, d.x));
    d.y = Math.max(SimpleNode.radius + offsetY, Math.min(offsetY + height - SimpleNode.radius, d.y));
    return `translate(${d.x}, ${d.y})`;
  });

  rect.attr('transform', (d) => {
    d.x = Math.max(BlockNode.minimizedWidth/2 + offsetX, Math.min(offsetX + width - BlockNode.minimizedWidth/2, d.x));
    d.y = Math.max(BlockNode.minimizedHeight/2 + offsetY, Math.min(offsetY + height - BlockNode.minimizedHeight/2, d.y));
    return `translate(${d.x - BlockNode.minimizedWidth/2},${d.y - BlockNode.minimizedHeight/2})`;});
}

// Click on Double click prevetion
let prevent = false;
let timer = 0;
let delay = 200;
//Preventing dragging edge after mouseup. Needed because of the delay in mousedown
let mouseLifted = true;
// update graph (called when needed)
function restart() {
  
  // path (link) group
  path = svg.selectAll('.edges').selectAll('.pathGroup');
  path = path.data(currentContext.links, d => '' + d.source.id + d.target.id);

  // update existing links
  path.selectAll('path').classed('selected', (d) => d === selectedLink)
    //.style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
    //.style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '');
    .style('marker-end', 'url(#end-arrow)');
  // In case we changed label
  path.selectAll('text').text(d => d.label);
    
  // remove old links
  path.exit().remove();

  const pg = path.enter().append('g').classed('pathGroup', true);
  // add new links
  pg.append('svg:path')
    .attr('class', 'link')
    .classed('selected', (d) => d === selectedLink)
    // .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
    // .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '')
    .style('marker-end', 'url(#end-arrow)')
    .on('mousedown', (d) => {
      if (d3.event.ctrlKey) return;

      // select link
      mousedownLink = d;
      selectedLink = (mousedownLink === selectedLink) ? null : mousedownLink;
      selectedNode = null;
      restart();
    });
  pg.append('text')
    .attr('text-anchor', 'middle')
    .text(d => d.label)
    
  path = pg.merge(path);

  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  circle = svg.selectAll('.simple').selectAll('.circleGroup')
  circle = circle.data(currentContext.nodes.filter(el => !el.isBlock), (d) => d.id);

  // update existing nodes (reflexive & selected visual states)
  circle.selectAll('.node')
    .style('fill', (d) => (d === selectedNode) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id))
    .classed('reflexive', (d) => d.reflexive);

  // remove old nodes
  circle.exit().remove();

  // add new nodes
  const g = circle.enter().append('svg:g').classed('circleGroup', true);
  
  // Adding halo around the nodes
  // Setting up a new group for each inserted node
  
  
  const haloGroup = g.append('g').classed('haloGroup', true);
  haloGroup
    .attr('display', 'none')
    .on('mouseleave', function(d){
      d3.select(this).attr('display', 'none');
    })
    .append('circle')
      .classed('halo', true)
      .attr('r', SimpleNode.radius * 2)
      .style('fill', '#dddddd')
      .style('fill-opacity', 0.5);
      
  alphabet.forEach((d, i) => {
    const smallCircleGroup = haloGroup.append('g');
    smallCircleGroup
      .append('circle')
        .attr('r', SimpleNode.radius * 0.6)
        .attr('cy', -Math.sin((i + 0.5) * Math.PI / alphabet.length) * SimpleNode.radius * 1.5)
        .attr('cx', Math.cos(Math.PI - (i + 0.5) * Math.PI / alphabet.length) * SimpleNode.radius * 1.5)
        .style('fill', 'yellow')
        // transparent
        .style('fill-opacity', 0)
        .on('mousedown', (d) => {
          if (d3.event.ctrlKey) return;

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
  });
  
  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', SimpleNode.radius)
    .style('fill', (d) => (d === selectedNode) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id))
    .style('stroke', (d) => d3.rgb(colors(d.id)).darker().toString())
    .classed('reflexive', (d) => d.reflexive)
    .on('mouseover', function (d) {
      if (!mousedownNode){// || d === mousedownNode){
        d3.select(this.parentNode).selectAll('.haloGroup').attr('display', 'block');
        return;
      }
      // enlarge target node
      d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function (d) {
      if (!mousedownNode)// || d === mousedownNode)
        return;
      // unenlarge target node
      d3.select(this).attr('transform', '');
    })
    .on('contextmenu', d3.contextMenu(menuNode))
    .on('mousedown', (d) => {
      if (d3.event.ctrlKey || d3.event.which === 3 || contextOpen) return;
      // select node
      selectedNode = (d === selectedNode) ? null : d;
      selectedLink = null;
      restart();
    })
    .on('mouseup', function (d) {
      if (!mousedownNode || !mousedownLetter) return;

      // needed by FF
      dragLine
        .style('marker-end', '');
      dragGroup
        .attr('display', 'none');

      // check for drag-to-self
      mouseupNode = d;
      if (mouseupNode === mousedownNode) {
        resetMouseVars();
        return;
      }

      // unenlarge target node
      d3.select(this).attr('transform', '');

      // add link to graph (update if exists)
      const source = mousedownNode;
      const target = mouseupNode;
      const label = mousedownLetter;

      const link = currentContext.links.filter((l) => l.source === source && l.target === target)[0];
      const reverseLink = currentContext.links.filter((l) => l.source === target && l.target === source)[0];
      let modifiedLink = link
      if(link)
        link.label += ' ' + label;
      else{
        let newLink = new Link(source, target, label);
        modifiedLink = newLink;
        if(!reverseLink){
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
      restart();
    });

  // show node IDs
  g.append('svg:text')
    .attr('x', 0)
    .attr('y', 4)
    .attr('class', 'id')
    .text((d) => d.id);

  circle = g.merge(circle);

  // Handling block nodes
  rect = svg.selectAll('.regex').selectAll('.rectGroup')
  rect = rect.data(currentContext.nodes.filter(el => el.isBlock), (d) => d.id);
  // update existing Blocks (reflexive & selected visual states)
  rect.selectAll('.block')
    .style('fill', (d) => (d === selectedNode) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id))
    .classed('reflexive', (d) => d.reflexive);

  // remove old nodes
  rect.exit().remove();

  // add new nodes
  const rg = rect.enter().append('svg:g')
/****************************************** */
  const overlayGroup = rg.append('g').classed('overlayGroup', true);
  overlayGroup
    .attr('display', 'none')
    .attr('transform', `translate(${-(BlockNode.overlayWidth - BlockNode.minimizedWidth)/2}, ${-(BlockNode.overlayHeight - BlockNode.minimizedHeight)/2})`)
    .on('mouseleave', function(d){
      d3.select(this).attr('display', 'none');
    })
    .append('rect')
      .classed('overlay', true)
      .attr('height', BlockNode.overlayHeight)
      .attr('width', BlockNode.overlayWidth)
      .style('fill', '#dddddd')
      .style('fill-opacity', 0.5);
  const slotWidth = 22;
  const slots = Math.floor(BlockNode.overlayWidth/slotWidth)
  const startX = (BlockNode.overlayWidth - (Math.min(slots, alphabet.length))*slotWidth)/2;
  alphabet.forEach((d, i) => {
    if(i < slots){
      const smallCircleGroup = overlayGroup.append('g')
        .attr('transform', `translate(${(BlockNode.overlayWidth - BlockNode.minimizedWidth)/4},${(BlockNode.overlayHeight - BlockNode.minimizedHeight)/4})`);
      smallCircleGroup
        .append('circle')
          .attr('r', SimpleNode.radius * 0.6)
          .attr('cy', 0)
          .attr('cx', startX + i * slotWidth)
          .style('fill', 'yellow')
          // transparent
          .style('fill-opacity', 0)
          .on('mousedown', (d) => {
            if (d3.event.ctrlKey) return;

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
    }
  });
// ************************************
  rg.classed('rectGroup', true)
    .attr('id', (d) => 'id-' + d.id)
    .append('svg:rect')
    .attr('class', 'block')
    .attr('height', BlockNode.minimizedHeight)
    .attr('width', BlockNode.minimizedWidth)
    .style('fill', (d) => (d === selectedNode) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id))
    .style('stroke', (d) => d3.rgb(colors(d.id)).darker().toString())
    .classed('reflexive', (d) => d.reflexive)
    .on('mouseover', function (d) {
      if (!mousedownNode){// || d === mousedownNode)
        d3.select(this.parentNode).selectAll('.overlayGroup').attr('display', 'block');
        return;
      }
      // enlarge target node
      d3.select(this)
        .attr('transform', `scale(1.1) translate(${-BlockNode.minimizedWidth*.05}, ${-BlockNode.minimizedHeight*.05})`);
    })
    .on('mouseout', function (d) {
      if (!mousedownNode)// || d === mousedownNode)
        return;
      // unenlarge target node
      d3.select(this).attr('transform', '');
    })
    .on('mousedown', (d) => {
      // Saving context
      if(d3.event.ctrlKey || d3.event.which === 3 || contextOpen) return;
      // mouseLifted = false;
      //mousedownNode = d;
      timer = setTimeout(() => {  
// TODO Remember to change
        // mousedownLetter = 'a';
        if(!prevent){
          // select node, if selected deselect
          // if(mouseLifted)
          //   mousedownNode = null;
          selectedNode = (d === selectedNode) ? null : d;
          selectedLink = null;

          // reposition drag line
          // if(!mouseLifted){
          //   dragLine
          //     .style('marker-end', 'url(#end-arrow)')
          //     .attr('d', `M${mousedownNode.x},${mousedownNode.y}L${mousedownNode.x},${mousedownNode.y}`);
          //   dragGroup
          //     .attr('display', 'block');
          // }

          restart();
        }
        prevent = false;
      }, delay);
    })
    .on('contextmenu', d3.contextMenu(menuBlock))
    .on('dblclick', (d) => {
      clearTimeout(timer);
      prevent = true;
      pushContext(d);
    })
    .on('mouseup', function (d) {
      // mouseLifted = true;
      if (!mousedownNode || !mousedownLetter) return;

      // needed by FF
      dragLine
        .style('marker-end', '');
      dragGroup
        .attr('display', 'none');

      // check for drag-to-self
      mouseupNode = d;
      if (mouseupNode === mousedownNode) {
        resetMouseVars();
        return;
      }

      // unenlarge target node
      d3.select(this).attr('transform', '');

      const source = mousedownNode;
      const target = mouseupNode;
      const label = mousedownLetter;

      const link = currentContext.links.filter((l) => l.source === source && l.target === target)[0];
      const reverseLink = currentContext.links.filter((l) => l.source === target && l.target === source)[0];
      let modifiedLink = link;
      if(link)
        link.label += ' ' + label;
      else{
        let newLink = new Link(source, target, label);
        modifiedLink = newLink;
        if(!reverseLink){
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
      restart();
    });

  // show block description
  rg.append('svg:text')
  .attr('x', BlockNode.minimizedWidth / 2)
  .attr('y', BlockNode.minimizedHeight / 2 + 3)
  .attr('text-anchor', 'middle')
  .attr('class', 'desc')
  .text((d) => d.desc);

  rect = rg.merge(rect);

  // set the graph in motion
  currentContext.force
    .nodes(currentContext.nodes)
    .force('link').links(currentContext.links);

  currentContext.force.alpha(.5).alphaTarget(.0).alphaDecay(.04).restart();
}

function pushContext(newContext){
  contextStack.push(currentContext);
  replaceContext(newContext);
}

function popContext(){
  replaceContext(contextStack.pop());
}

function replaceContext(newContext){
 
  rect.remove();
  circle.remove();
  path.remove();
  svg.selectAll('.simple').remove();
  svg.selectAll('.edges').remove();
  svg.selectAll('.regex').remove();
  // So you don't delete a node from a preious context  
  deselectAll();
  
  if(newContext === root){
    // Remove header from the top
    svg.selectAll('.header').remove();
    svg.selectAll('.stopEvents').remove();
  }
  else {
    // Create header if it doesn't exist
    svg.selectAll('.stopEvents').data([1]).enter()
      .append('rect')
      .classed('stopEvents', true)
      .attr('width', width)
      .attr('height', height)
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', 'white')
      .on('mousedown', () => d3.event.stopPropagation());

    let header = svg.selectAll('.header').data([newContext], (d) => d.id);
    header.exit().remove();
    // Header gets rendered from scratch every time
    headerGroup = header.enter()
      .append('g')
      .classed('header', true)
      .attr('transform', `translate(${(width - BlockNode.maximizedWidth)/2}, ${(height - BlockNode.maximizedHeight)/2})`);

    headerGroup
      .append('rect')
      .classed('banner', true)
      .attr('width', BlockNode.maximizedWidth)
      .attr('height', BlockNode.headerHeight)
      .attr('x', 0)
      .attr('y', 0)
      .style('stroke', '#2f3033')
      .style('fill', d => colors(d.id))
      .on('mousedown', () => d3.event.stopPropagation());
    // Append Frame
    headerGroup
      .append('rect')
      .attr('width', BlockNode.maximizedWidth)
      .attr('height', BlockNode.maximizedHeight - BlockNode.headerHeight)
      .attr('x', 0)
      .attr('y', BlockNode.headerHeight)
      .attr('fill', '#f2f2f2')
      .style('stroke', '#262626');
    // Header Text
    let compoundWidth = 
      headerGroup.append('text')
      .classed('desc', true)
      .attr('text-anchor', 'middle')
      .attr('x', BlockNode.maximizedWidth/2)
      .attr('y', BlockNode.headerHeight/2 + 6)
      .style('font-size', '22')
      .style('font-weight', 'bold')
      .text(d => d.desc)
      .node()
      .getComputedTextLength()
      / 2 + 8;
    // Stack trace
    for(let i = contextStack.length - 1; i >= Math.max(0, contextStack.length - 3); i--){
      const inter = 24;
      const block = contextStack[i];
      const smallRectGroup = headerGroup.append('g').classed('smallRect', true);
      smallRectGroup.data([contextStack[i]], (d) => d.id)
      const slotWidth = smallRectGroup.append('text')
        .style('font-size', '18')
        .text(block.desc)
        .node()
        .getComputedTextLength()
        * 1.2;
      const rectHeight = 34;
      smallRectGroup.insert('rect', 'text')
        .attr('width', slotWidth)
        .attr('height', rectHeight)
        .style('fill', '#e3e3e5')
        .style('stroke', '#2f3033')
        .style('cursor', 'pointer')
        .on('mousedown', () => {
          d3.event.stopPropagation();
          while(contextStack.pop() !== block);
          replaceContext(block);
        })
      smallRectGroup.append('path')
        .attr('d', `M ${slotWidth} ${rectHeight/2} L ${slotWidth + inter - 4} ${rectHeight/2}`)
        .style('stroke-width', '4')
        .style('stroke', 'black')
        .style('marker-end', 'url(#end-arrow)')
      smallRectGroup.select('text')
        .attr('x', slotWidth * 0.1)
        .attr('y', rectHeight / 2 + 6);
      smallRectGroup.attr('transform', `translate(${BlockNode.maximizedWidth/2 - compoundWidth - slotWidth - inter},${BlockNode.headerHeight/2 - rectHeight/2})`);
      compoundWidth += slotWidth + inter;
      // Last element, still a couple to go
      if(i === contextStack.length - 3 && i !== 0){
        smallRectGroup.append('path')
        .attr('d', `M ${-inter} ${rectHeight/2} L ${-4} ${rectHeight/2}`)
        .style('stroke-width', '4')
        .style('stroke', 'black')
        .style('marker-end', 'url(#end-arrow)')
        smallRectGroup.append('text')
          .style('font-size', '24')
          .style('font-weight', 'bold')
          .attr('x', -inter-42)
          .attr('y', rectHeight / 2 + 12)
          .text('. . .')

      }
    }
    // Header Return button
    const buttonWidth = 50;
    const buttonHeight = 25;
    headerGroup.append('g')
      .classed('buttonGroup', true)
      .attr('transform', `translate(${BlockNode.maximizedWidth - buttonWidth/2 - 25}, ${BlockNode.headerHeight/2})`);        
    const buttonGroup = headerGroup.selectAll('.buttonGroup');
    buttonGroup.append('rect')
      .attr('width', buttonWidth)
      .attr('height', buttonHeight)
      .attr('x', -buttonWidth/2)
      .attr('y',  -buttonHeight/2)
      .attr('fill', '#e3e3e5')
      .style('stroke', '#2f3033')
      .style('cursor', 'pointer')
      .on('mousedown', () => {
        d3.event.stopPropagation();
        popContext();
      });
    buttonGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', 0)
      .attr('y', 5)
      .style("font-size", "14")
      .text('Return');
  }

  currentContext.force.stop();
  // Initializing new simulation if we are entering for the first time
  if(!newContext.force){
    newContext.force = d3.forceSimulation()
      .force('link', d3.forceLink().id((d) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('x', d3.forceX(width / 2))
      .force('y', d3.forceY(height / 2))
      //.size([BlockNode.maximizedWidth, BlockNode.maximizedHeight - BlockNode.headerHeight])
      .on('tick', tick.bind(this, (width - BlockNode.maximizedWidth)/2, (height - BlockNode.maximizedHeight)/2 + BlockNode.headerHeight, BlockNode.maximizedWidth, BlockNode.maximizedHeight - BlockNode.headerHeight));
  }
  newContext.force.restart();
  currentContext = newContext;

  path = svg.append('svg:g').classed('edges', true).selectAll('path');
  circle = svg.append('svg:g').classed('simple', true).selectAll('g');
  rect = svg.append('svg:g').classed('regex', true).selectAll('g');
  // Moving dragline so it is not covered by the white rectangle
  $('.dragGroup').insertAfter('.header');

  restart();
}

function syncNode(node){
  blocksArr.forEach((d) => {
    if(currentContext.desc === d.first.desc && d.first !== currentContext){
      if(node.isBlock)
        d.first.nodes.push(buildBlock(node.desc).first);
      else
        d.first.nodes.push(new SimpleNode(++lastNodeId, false, node.x, node.y));
    } 
  })
}

function syncRemoveNode(node){
  blocksArr.forEach((d) => {
    if(currentContext.desc === d.first.desc && d.first !== currentContext){
      d.first.nodes.splice(currentContext.nodes.indexOf(selectedNode), 1);
    }
  })
}

function syncLink(link){
  blocksArr.forEach((d) => {
    if(currentContext.desc === d.first.desc && d.first !== currentContext){
      const source = d.first.nodes[currentContext.nodes.indexOf(link.source)];
      const target = d.first.nodes[currentContext.nodes.indexOf(link.target)];
      let found = false;
      d.first.links.forEach((l) => {
        if(l.source === source && l.target === target){
          l.bidirectional = link.bidirectional;
          l.label = link.label;
          found = true;
        }
      })
      if(!found)
        d.first.links.push(new Link(source, target, link.label, link.bidirectional, link.up));
    }
  });
}

function syncRemoveLink(link){
  blocksArr.forEach((d) => {
    if(currentContext.desc === d.first.desc && d.first !== currentContext){
      const source = d.first.nodes[currentContext.nodes.indexOf(link.source)];
      const target = d.first.nodes[currentContext.nodes.indexOf(link.target)];
      let index = -1;
      for(i = 0; i < d.first.links.length; i++) {
        l = d.first.links[i]; 
        if(l.source === source && l.target === target){
          index = i;
        }
      }
      if(index !== -1)
        d.first.links.splice(index, 1);
      else
        console.log('Not found!');
    }
  })
}

function addNode() {
  // because :active only works in WebKit?
  svg.classed('active', true);

  // mousedownNode stops propagation
  // elm is the class of the target 
  const elm = d3.event.target.classList[0];
  if (d3.event.ctrlKey || mousedownNode || mousedownLink || elm === 'node' || elm === 'block') return;

  // insert new node at point
  const point = d3.mouse(this);
  const node = new SimpleNode(++lastNodeId, false, point[0], point[1]);
  currentContext.nodes.push(node);
  syncNode(node);

  restart();
}

function buildBlock(desc){
  // Looking for node
  let twin = null;
  blocksArr.forEach(el => {
    if(el.first.desc === desc)
      twin = el;
  })
  // Treat all nodes like normal first
  const newBlockNodes = new Array();
  const newBlockLinks = new Array();

  if(twin){
    twin.first.nodes.forEach(node => {
      if(!node.isBlock)
        newBlockNodes.push(new SimpleNode(++lastNodeId, false, node.x, node.y));
      else
        newBlockNodes.push(buildBlock(node.desc).first);
    });
    if(newBlockNodes.length > 0){
      // The relative order of the link's source and target is the same for both nodes
      twin.first.links.forEach(link => {
        const source = newBlockNodes[twin.first.nodes.indexOf(link.source)];
        const target = newBlockNodes[twin.first.nodes.indexOf(link.target)];
        newBlockLinks.push(new Link(source, target, link.label, link.bidirectional, link.up));
      })
    }
    return new Tuple(new BlockNode(++lastNodeId, false, desc, blockInsertCoordinates[0], blockInsertCoordinates[1], newBlockNodes, newBlockLinks), false);
  }
  console.log('no twin');
  // I don't think we need to add a simulation
  return new Tuple(new BlockNode(++lastNodeId, false, desc, blockInsertCoordinates[0], blockInsertCoordinates[1], newBlockNodes, newBlockLinks), true);
}

function closeForm(){
  const desc = $('#desc').val();
  d3.selectAll('.input-field').style('display', 'none');
  formOpen = false;
  d3.select('.form-rect').remove();
  
  const nodeTuple = buildBlock(desc);
  currentContext.nodes.push(nodeTuple.first);
  blocksArr.push(nodeTuple);
  renderToolbar();
  syncNode(nodeTuple.first);
  restart();
}

let blockInsertCoordinates;
function addBlock() {
  // because :active only works in WebKit?
  svg.classed('active', true);

  if (d3.event.ctrlKey || mousedownNode || mousedownLink) return;
  formOpen = true;
  
  // insert new node at point
  blockInsertCoordinates = d3.mouse(this);

  let formGroup = d3.select('body').selectAll('.input-field')
  if(formGroup.empty()){
    formGroup = d3.select('body')
      .append('div')
      .attr('class', 'input-field');
    formGroup.html('');
    formGroup
    .append('form')
      .append('input')
        .attr('id', 'desc')
        .attr('type', 'text')
        .attr('value', 'regex')
        .attr('size', 4); 
    $('#desc')
      .on('keydown', (e) => {
        if(e.keyCode === 10 || e.keyCode === 13){
          e.preventDefault();
          if($('#desc').val() === currentContext.desc){
            $('#desc')
              .css('background', 'rgba(255,0,0,0.7)')
              .blur()
            return;
          }
          closeForm();
        }
        else {
          $('#desc')
          .css('background', 'rgba(255,255,255,1)')
        }
      });
  } 
  formGroup
    .style('display', 'block')
    .style('left', (d3.mouse(this)[0] - 2) + 'px')
    .style('top', (d3.mouse(this)[1] - 2) + 'px')
  formGroup.selectAll('input')
    .attr('value', 'regex')
  $('#desc')
    .select()
    .focus()
  svg
    .append('svg:rect')
    .classed('form-rect', true)
    .attr('height', BlockNode.minimizedHeight)
    .attr('width', BlockNode.minimizedWidth)
    .attr('x', blockInsertCoordinates[0] - BlockNode.minimizedWidth/2 + 20)
    .attr('y', blockInsertCoordinates[1] - BlockNode.minimizedHeight/2 + 2)
    .style('fill', '#4087f9')
    .style('stroke', (d) => d3.rgb('#4087f9').darker().toString())
  //const formGroup = formEnter.merge(d3.selectAll('.input-field'))
}

function mousemove() {
  if (!mousedownNode) return;

  // update drag line
  dragLine.attr('d', `M${mousedownNode.x},${mousedownNode.y}L${d3.mouse(this)[0]},${d3.mouse(this)[1]}`);

  restart();
}

function mouseup() {
  if (mousedownNode) {
    // hide drag line
    dragLine
      .style('marker-end', '');
    dragGroup
      .attr('display', 'none');
  }

  // because :active only works in WebKit?
  svg.classed('active', false);

  // clear mouse event vars
  resetMouseVars();
}

function spliceLinksForNode(node) {
  const toSplice = currentContext.links.filter((l) => l.source === node || l.target === node);
  for (const l of toSplice) {
    currentContext.links.splice(currentContext.links.indexOf(l), 1);
    syncRemoveLink(l);
  }
}

// Deletes only if selected
function deleteSelected() {
  if (selectedNode) {
    spliceLinksForNode(selectedNode);
    syncRemoveNode(selectedNode);
    currentContext.nodes.splice(currentContext.nodes.indexOf(selectedNode), 1);
  } else if (selectedLink) {
    currentContext.links.splice(currentContext.links.indexOf(selectedLink), 1);
    syncRemoveLink(selectedLink);
  }
  deselectAll();
  restart();
}

// only respond once per keydown
let lastKeyDown = -1;

function keydown() {
  // Prevent default interferes with filling out forms
  //d3.event.preventDefault();

  if (lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  // ctrl
  if (d3.event.keyCode === 17) {
    circle.call(drag);
    rect.call(drag);
    svg.classed('ctrl', true);
  }

  if (!selectedNode && !selectedLink) return;

  switch (d3.event.keyCode) {
    case 8: // backspace
    case 46: // delete
      deleteSelected();
      break;
    case 82: // R
      if (selectedNode) {
        // toggle node reflexivity
        selectedNode.reflexive = !selectedNode.reflexive;
        restart();
        break;
      }
  }
}

function keyup() {
  lastKeyDown = -1;

  // ctrl
  if (d3.event.keyCode === 17) {
    circle.on('.drag', null);
    rect.on('.drag', null);
    svg.classed('ctrl', false);
  }
}

// app starts here

initToolbar();

svg.on('mousedown', function(){
  //Ignore right clicks
  if(formOpen){
    if($('#desc').val() === currentContext.desc){
      $('#desc')
        .css('background', 'rgba(255,0,0,0.7)')
        .blur()
    }
    else
      closeForm();
  }
  else if(d3.event.which !== 3 && !contextOpen)
    addNode.call(this);    
})
  .on('mousemove', mousemove)
  .on('mouseup', mouseup)
  .on('contextmenu', d3.contextMenu(menuEmptyArea, deselectAll));
d3.select(window)
 .on('keydown', keydown)
 .on('keyup', keyup);
restart();

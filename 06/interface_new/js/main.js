function BlockCanvas(container, dimensions, deterministic = false, epsilon = true, blockAutomaton = true){
    // set up SVG for D3
    const width  = dimensions[0];
    const height = dimensions[1];
    BlockNodeStatic.maximizedWidth = width * .95;
    BlockNodeStatic.maximizedHeight = height * .92;
    // Colors
    const lightblue = d3.rgb(66, 139, 255);
    const lightgreen = d3.rgb(152, 224, 116);
    const yellow = d3.rgb(247, 228, 17);

    const svg = d3.select(container)
        .append('svg')
        .attr('oncontextmenu', 'return false;')
        .attr('width', width)
        .attr('height', height);

    // set up initial nodes and links
    //  - nodes are known by 'id', not by index in array.
    //  - reflexive edges are indicated on the node (as a bold black circle).
    //  - links are always source < target; edge directions are set by 'left' and 'right'.

    let lastNodeId = 1;
    // nodes, links and forces are just handles to the currently running simulation
    let nodes = [new SimpleNode(1, false, width/6, height/2)];
    nodes[0].initial = true;
    let links = [];
    let alphabet = ['a', 'b', 'c', 'd'];
    // init D3 force layout
    let force = d3.forceSimulation()
        .force('link', d3.forceLink().id((d) => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-500).distanceMax(100))
        // .force('x', d3.forceX(width / 2))
        // .force('y', d3.forceY(height / 2))
        .on('tick', tick.bind(this, 0, 0, width, height));
    const root = new BlockNode(0, false, 'entire regex', 0, 0, nodes, links, force);

    // These 2 arrays reference the same object
    const blocksArr = new Array();
    BlockNodeStatic.blocksList = blocksArr;

    // Context in which we are operating (in which regex box are we)
    //  We store it as an array and use it like a Stack, always pushing the new
    //  context on top when focusing a block, and poping that context when we minimize the block
    let contextStack = [];
    let showStackTrace = [];
    // Top of stack so to say
    let currentContext = root;
    let currentShow = true;


    // init D3 drag support
    const drag = d3.drag()
        .on('start', (d) => {
            if (!d3.event.active)
                currentContext.force.alpha(.9).alphaTarget(.8).alphaDecay(.04).restart();

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

            draggingNode = null;
            circle.on('.drag', null);
            rect.on('.drag', null);
            svg.classed('ctrl', false);

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
    let draggingNode = null;
    let mousedownLink = null;
    let mousedownNode = null;
    let mouseupNode = null;
    let mousedownLetter = null;
    let linkMoved = false;
    contextOpen = false;
    let formOpen = false;

    function resetMouseVars() {
        mousedownNode = null;
        mouseupNode = null;
        mousedownLink = null;
        mousedownLetter = null;
        draggingNode = null;
        linkMoved = false;
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

    // function perpendicularBisector(p1, p2, up, relative, absolute = 0, locked = true) {

    //     const distSquared = (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
    //     const midpointX = (p1.x + p2.x) / 2;
    //     const midpointY = (p1.y + p2.y) / 2;
    //     let denominator = (p2.y - p1.y);
    //     if(denominator === 0)
    //         denominator = .001
    //     const m = -(p2.x - p1.x) / denominator;
    //     const intercept = midpointY - m * midpointX;
    //     let dx = Math.sqrt((distSquared * relative * relative + absolute * absolute) / ((m*m + 1)));

    //     let supportX, supportY;
    //     if(locked){
    //         // Label always on the same side of the arrow
    //         const orient = p1.x > p2.x ? 1 : -1;
    //         supportX = midpointX + (orient * m > 0 ? -dx : dx);
    //         supportY = (supportX * m + intercept);
    //     }
    //     else{
    //         // Label always on top
    //         supportX = midpointX + (m > 0 ? -dx : dx);
    //         supportY = (supportX * m + intercept);
    //     }

    //     return {'x':supportX, 'y':supportY, 'm':m};
    // }

    function placeLabel(link){
        const lineData = getLinePoints(link);
        const slope = (lineData.points[2].y - lineData.points[0].y) / (lineData.points[2].x - lineData.points[0].x);
        if(link.selftransition)
            return {'x':link.source.x, 'y':link.target.y - 80, 'm':0};
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
        const sourcePadding = SimpleNodeStatic.radius;
        // const sourcePadding = link.left ? SimpleNodeStatic.radius * 1.25 : SimpleNodeStatic.radius;
        // const targetPadding = link.right ? SimpleNodeStatic.radius * 1.25 : SimpleNodeStatic.radius;
        const targetPadding = SimpleNodeStatic.radius * 1.15;
        let sourceX = link.source.x + (sourcePadding * normX);
        let sourceY = link.source.y + (sourcePadding * normY);
        let targetX = link.target.x - (targetPadding * normX);
        let targetY = link.target.y - (targetPadding * normY);

        if(link.target.isBlock){// && link.right){
            const proportionX = (Math.abs(deltaX) - BlockNodeStatic.minimizedWidth/1.84) / Math.abs(deltaX);
            const proportionY = (Math.abs(deltaY) - BlockNodeStatic.minimizedHeight/1.76) / Math.abs(deltaY);
            let offX = 0;
            let offY = 0;
            if(link.bidirectional){
                if(proportionX < proportionY)
                    offX = deltaY < 0 ? 10 : -10;
                if(proportionX > proportionY)
                    offY = deltaX > 0 ? 10 : -10;
            }
            targetX = Math.max(proportionX, proportionY)*deltaX + link.source.x + offX// + (deltaX > 0 ? -blockPadding : blockPadding);
            targetY = Math.max(proportionX, proportionY)*deltaY + link.source.y + offY// + (deltaY > 0 ? -blockPadding : blockPadding);
            if(link.bidirectional){
                const targetXDiff = Math.abs(targetX - link.target.x)*0.90;
                const targetYDiff = Math.abs(targetY - link.target.y)*0.85;
                if(targetXDiff > BlockNodeStatic.minimizedWidth/2)
                    targetX = link.target.x + (offX > 0 ? 1 : -1)*BlockNodeStatic.minimizedWidth/2;
                if(targetYDiff > BlockNodeStatic.minimizedHeight/2)
                    targetY = link.target.y + (offY > 0 ? 1 : -1)*BlockNodeStatic.minimizedHeight/2;
            }
        }
        if(link.source.isBlock){// && link.left){
            deltaX = -deltaX;
            deltaY = -deltaY;
            const proportionX = (Math.abs(deltaX) - BlockNodeStatic.minimizedWidth/2) / Math.abs(deltaX);
            const proportionY = (Math.abs(deltaY) - BlockNodeStatic.minimizedHeight/2) / Math.abs(deltaY);

            blockPadding = 0;

            let offX = 0;
            let offY = 0;
            if(link.bidirectional){
                if(proportionX < proportionY)
                    offX = deltaY > 0 ? 10 : -10;
                if(proportionX > proportionY)
                    offY = deltaX < 0 ? 10 : -10;
            }
            sourceX = Math.max(proportionX, proportionY)*deltaX + link.target.x + offX;// + (deltaX > 0 ? -blockPadding : blockPadding);
            sourceY = Math.max(proportionX, proportionY)*deltaY + link.target.y + offY;// + (deltaY > 0 ? -blockPadding : blockPadding);
            if(link.bidirectional){
                const sourceXDiff = Math.abs(sourceX - link.source.x)*0.95;
                const sourceYDiff = Math.abs(sourceY - link.source.y)*0.95;
                if(sourceXDiff > BlockNodeStatic.minimizedWidth/2)
                    sourceX = link.source.x + (offX > 0 ? 1 : -1)*BlockNodeStatic.minimizedWidth/2;//Math.max(proportionX, proportionY)*deltaX + link.target.x
                if(sourceYDiff > BlockNodeStatic.minimizedHeight/2)
                    sourceY = link.source.y + (offY > 0 ? 1 : -1)*BlockNodeStatic.minimizedHeight/2;//Math.max(proportionX, proportionY)*deltaY + link.target.y
            }
        }

        const midpointX = (sourceX + targetX) / 2;
        const midpointY = (sourceY + targetY) / 2;
        let support = {'x':midpointX, 'y':midpointY, 'm':0};
        if(link.selftransition){
            // We need more points to define the curve in this case
            const loopHeight = 60;
            const loopWidth = 60;
            sourceX = targetX = link.source.x;
            sourceY = link.source.y - sourcePadding;
            targetY = link.source.y - targetPadding + (link.target.isBlock ? 1 : 2);
            support = {'x':sourceX, 'y':sourceY - loopHeight};
            const left = {'x':sourceX - loopWidth/2, 'y':sourceY - loopHeight * .6};
            const right = {'x':sourceX + loopWidth/2, 'y':sourceY - loopHeight * .6};
            return {'points': [{ "x": sourceX,   "y": sourceY},  left, support, right, { "x": targetX,  "y": targetY}],
                'slope': 0};
        }
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
        circle.attr('transform', (d) => {
            d.x = Math.max(SimpleNodeStatic.radius + offsetX, Math.min(offsetX + width - SimpleNodeStatic.radius, d.x));
            d.y = Math.max(SimpleNodeStatic.radius + offsetY, Math.min(offsetY + height - SimpleNodeStatic.radius, d.y));
            return `translate(${d.x}, ${d.y})`;
        });

        rect.attr('transform', (d) => {
            d.x = Math.max(BlockNodeStatic.minimizedWidth/2 + offsetX, Math.min(offsetX + width - BlockNodeStatic.minimizedWidth/2, d.x));
            d.y = Math.max(BlockNodeStatic.minimizedHeight/2 + offsetY, Math.min(offsetY + height - BlockNodeStatic.minimizedHeight/2, d.y));
            return `translate(${d.x - BlockNodeStatic.minimizedWidth/2},${d.y - BlockNodeStatic.minimizedHeight/2})`;});

        path.selectAll('path').attr('d', (d) => drawEdge(d));
        path.selectAll('.labelGroup')
            .attr('transform', (d) => {
                const coord = placeLabel(d);
                return `translate(${coord.x},${coord.y})`;
            })

    }

    // Click on Double click prevetion
    let timer = 0;
    let delay = 200;
    // update graph (called when needed)
    function restart() {

        // path (link) group
        path = svg.selectAll('.edges').selectAll('.pathGroup');
        path = path.data(currentContext.links, d => '' + d.source.id + d.target.id);

        // update existing links
        path.selectAll('.link').classed('selected', (d) => d === selectedLink)
            .style('marker-end', 'url(#end-arrow)');
        // In case we changed label

        // remove old links
        path.exit().remove();

        const pg = path.enter()
            .append('g')
            .classed('pathGroup', true)
        // add new links

        pg.append('g')
            .classed('lineGroup', true)
            .on('mousedown', (d) => {
                if (d3.event.which === 3 || contextOpen || formOpen)
                    return;
                // select link
                mousedownLink = d;
                selectedLink = (mousedownLink === selectedLink) ? null : mousedownLink;
                selectedNode = null;
                restart();
            })
            .on('contextmenu', d3.contextMenu(menuLink))//deterministic ? null : d3.contextMenu(menuLink))
            .append('svg:path')
            .attr('class', 'link')
            .classed('selected', (d) => d === selectedLink)
            .style('marker-end', 'url(#end-arrow)');

        pg.selectAll('.lineGroup')
            .append('path')
            .attr('class', 'wide')

        pg.append('g')
            .classed('labelGroup', true);

        path = pg.merge(path);

        const lg = path
            .selectAll('.labelGroup')
            .selectAll('.edgeLetter')
            .data(link => link.label.split(' ').filter(c => c.length > 0).map((c, i) => new Tuple(new Link(link.source, link.target, c, link.bidirectional, link.up), i - link.label.length/4)),
                d => '' + d.first.source.id + d.first.target.id + d.first.label + d.second)

        lg.exit().remove();

        let sg = lg.enter()
            .append('g')
            .classed('edgeLetter', true)
            .attr('transform', d => `translate(${d.second * 10 + 5}, 0)`)
            .style('cursor', 'pointer')
            .on('mouseover', function(d){
                d3.select(this).select('text')
                    .classed('emphasized', true)
            })
            .on('mouseleave', function(d){
                d3.select(this).select('text')
                    .classed('emphasized', false)
            })
            .on('contextmenu', d3.contextMenu(menuLinkLetter))//deterministic ? null : d3.contextMenu(menuLinkLetter))
            .on('mousedown', function(d){
                if (d3.event.which === 3 || contextOpen || formOpen)
                    return;

                // select node, needed for drawline
                mousedownNode = d.first.source;
                mousedownLetter = d.first.label;
                selectedLink = null;

                const elm = document.getElementById(container.substring(1));
                const offX = elm === null ? 0 : elm.getBoundingClientRect().left;
                const offY = elm === null ? 0 : elm.getBoundingClientRect().top;

                // reposition drag line
                dragLine
                    .style('marker-end', 'url(#end-arrow)')
                    .attr('d', `M${mousedownNode.x},${mousedownNode.y}L${d3.event.pageX - offX},${d3.event.pageY - offY}`);
                dragGroup
                    .attr('display', 'block');

                //remove letter from linksArray
                addLink(d.first.source, d.first.target, d.first.label, removeLetterFromString);

                restart();
            })
        sg.append('text')
            .classed('target', true)
            .text(d => d.first.label);
        sg.append('circle')
            .attr('r', SimpleNodeStatic.radius * .5)
            .classed('mouseTarget', true)
            .attr('cy', -2)

        // circle (node) group
        // NB: the function arg is crucial here! nodes are known by id, not by index!
        circle = svg.selectAll('.simple').selectAll('.circleGroup')
        circle = circle.data(currentContext.nodes.filter(el => !el.isBlock), (d) => d.id);

        // update existing nodes (reflexive & selected visual states)
        circle.classed('initial', (d) => d.initial);
        circle
            .selectAll('.node')
            .style('fill', (d) => (d === selectedNode) ? lightblue.brighter().toString() : lightblue)
            .classed('reflexive', (d) => d.reflexive);

        // remove old nodes
        circle.exit().remove();

        // add new nodes
        const g = circle.enter().append('svg:g')
            .classed('circleGroup', true)
            .classed('initial', (d) => d.initial);

        // Customizing the initial node
        d3.selectAll('.initial')
            .append('path')
            .classed('entry', true)
            .style('marker-end', 'url(#end-arrow)')
            .attr('d', d => `M ${-45},${0} L ${- SimpleNodeStatic.radius - 5},${0}`)

        // Adding halo around the nodes
        // Setting up a new group for each inserted node
        if(!deterministic){
            const haloGroup = g.append('g').classed('haloGroup', true);
            haloGroup
                .attr('display', 'none')
                .on('mouseleave', function(d){
                    d3.select(this).attr('display', 'none');
                })
                .append('circle')
                .classed('halo', true)
                .attr('r', SimpleNodeStatic.radius * 2)

            alphabet.forEach((d, i) => {
                addLetterToOverlay(haloGroup,
                    Math.cos(Math.PI - (i + 0.5) * Math.PI / alphabet.length) * SimpleNodeStatic.radius * 1.5,
                    -Math.sin((i + 0.5) * Math.PI / alphabet.length) * SimpleNodeStatic.radius * 1.5,
                    d);
            });
            // Adds epsilon to halo
            if(epsilon)
                addLetterToOverlay(haloGroup, 0, SimpleNodeStatic.radius * 1.5, '\u03b5')
        }
        g.append('svg:circle')
            .attr('class', 'node')
            .attr('r', SimpleNodeStatic.radius)
            .style('fill', (d) => (d === selectedNode) ? lightblue.brighter().toString() : lightblue)
            .style('stroke', (d) => lightblue.darker().toString())
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
                if (d3.event.which === 3 || contextOpen || formOpen)
                    return;
                // dragging support
                draggingNode = d;
                circle.call(drag);
                svg.classed('ctrl', true);

                timer = setTimeout(() => {
                    selectedNode = (d === selectedNode) ? null : d;
                    selectedLink = null;
                    restart();
                }, delay);
            })
            .on('dblclick', (d) => {
                clearTimeout(timer);
                d.reflexive = !d.reflexive;
                selectedNode = d;
                syncNode(d);
                restart();
            })
            .on('mouseup', function (d) {
                //Necessary for deterministic
                linkMoved = true;
                // d3.event.stopPropagation();
                if (!mousedownNode || !mousedownLetter) return;
                // needed by FF
                dragLine
                    .style('marker-end', '');
                dragGroup
                    .attr('display', 'none');
                // unenlarge target node
                d3.select(this).attr('transform', '');
                // Add/update link in currContext link array
                addLink(mousedownNode, d, mousedownLetter);
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
            .style('fill', (d) => (d === selectedNode) ? lightgreen.brighter().toString() : lightgreen)
            .classed('reflexive', (d) => d.reflexive);

        // remove old nodes
        rect.exit().remove();

        // add new nodes
        const rg = rect.enter().append('svg:g')
        /************* Overlay ****************** */
        if(!deterministic){
            const overlayGroup = rg.append('g').classed('overlayGroup', true);
            overlayGroup
                .attr('display', 'none')
                .attr('transform', `translate(${-(BlockNodeStatic.overlayWidth - BlockNodeStatic.minimizedWidth)/2}, ${-(BlockNodeStatic.overlayHeight - BlockNodeStatic.minimizedHeight)/2})`)
                .on('mouseleave', function(d){
                    d3.select(this).attr('display', 'none');
                })
                .append('rect')
                .classed('overlay', true)
                .attr('height', BlockNodeStatic.overlayHeight)
                .attr('width', BlockNodeStatic.overlayWidth)
                .style('fill', '#dddddd')
                .style('fill-opacity', 0.5);
            const slotWidth = 22;
            const slots = Math.floor(BlockNodeStatic.overlayWidth/slotWidth)
            const startX = (BlockNodeStatic.overlayWidth - (Math.min(slots, alphabet.length))*slotWidth)/2;
            alphabet.forEach((d, i) => {
                if(i < slots)
                    addLetterToOverlay(overlayGroup, (BlockNodeStatic.overlayWidth - BlockNodeStatic.minimizedWidth)/4 + startX + i * slotWidth, (BlockNodeStatic.overlayHeight - BlockNodeStatic.minimizedHeight)/4, d);
            });
            // Adds epsilon symbol on overlay
            if(epsilon)
                addLetterToOverlay(overlayGroup, (BlockNodeStatic.overlayWidth)/2, BlockNodeStatic.overlayHeight - (BlockNodeStatic.overlayHeight - BlockNodeStatic.minimizedHeight)/4, '\u03b5');
        }
        rg.classed('rectGroup', true)
            .attr('id', (d) => 'id-' + d.id)
            .append('svg:rect')
            .attr('class', 'block')
            .attr('height', BlockNodeStatic.minimizedHeight)
            .attr('width', BlockNodeStatic.minimizedWidth)
            .style('fill', (d) => (d === selectedNode) ? lightgreen.brighter().toString() : lightgreen)
            .style('stroke', (d) => lightgreen.darker().toString())
            .classed('reflexive', (d) => d.reflexive)
            .on('mouseover', function (d) {
                if (!mousedownNode){// || d === mousedownNode)
                    d3.select(this.parentNode).selectAll('.overlayGroup').attr('display', 'block');
                    return;
                }
                // enlarge target node
                d3.select(this)
                    .attr('transform', `scale(1.1) translate(${-BlockNodeStatic.minimizedWidth*.05}, ${-BlockNodeStatic.minimizedHeight*.05})`);
            })
            .on('mouseout', function (d) {
                if (!mousedownNode)// || d === mousedownNode)
                    return;
                // unenlarge target node
                d3.select(this).attr('transform', '');
            })
            .on('mousedown', (d) => {
                if(d3.event.which === 3 || contextOpen || formOpen)
                    return;
                // Drag support without delay
                draggingNode = d;
                rect.call(drag);
                svg.classed('ctrl', true);

                timer = setTimeout(() => {
                    selectedNode = (d === selectedNode) ? null : d;
                    selectedLink = null;
                    restart();
                }, delay);
            })
            .on('contextmenu', d3.contextMenu(menuBlock))
            .on('dblclick', (d) => {
                clearTimeout(timer);
                pushContext(d);
            })
            .on('mouseup', function (d) {
                //Necessary for deterministic
                linkMoved = true;
                // d3.event.stopPropagation();
                if (!mousedownNode || !mousedownLetter) return;
                // needed by FF
                dragLine
                    .style('marker-end', '');
                dragGroup
                    .attr('display', 'none');
                // unenlarge target node
                d3.select(this).attr('transform', '');
                // Adds/updates link in link array
                addLink(mousedownNode, d, mousedownLetter);
                restart();
            });

        // show block description
        rg.append('svg:text')
            .attr('x', BlockNodeStatic.minimizedWidth / 2)
            .attr('y', BlockNodeStatic.minimizedHeight / 2 + 3)
            .attr('text-anchor', 'middle')
            .attr('class', 'desc')
            .text((d) => d.desc);

        rect = rg.merge(rect);

        // set the graph in motion
        currentContext.force
            .nodes(currentContext.nodes)
            .force('link').links(currentContext.links);

        currentContext.force.alpha(.9).alphaDecay(.04).restart();
        if(!draggingNode)
            currentContext.force.alphaTarget(0);
    }

    function addLetterToOverlay(group, x, y, letter){
        const smallCircle = group.append('g')
            .attr('transform', `translate(${x},${y})`);
        smallCircle
            .append('circle')
            .attr('r', SimpleNodeStatic.radius * 0.6)
            .classed('mouseTarget', true)
            .on('mousedown', (d) => {
                if (d3.event.which === 3 || contextOpen || formOpen)
                    return;

                // select node
                mousedownNode = d;
                mousedownLetter = smallCircle.select('text').text();
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
                smallCircle.select('text')
                    .classed('emphasized', true)
            })
            .on('mouseleave', (d) => {
                smallCircle.select('text')
                    .classed('emphasized', false)
            })
        // Mouseup propagates until svg and cancels drag line
        smallCircle
            .append('text')
            .classed('target', true)
            .attr('y', 5)
            .text(letter)
    }

    function pushContext(newContext, hierachical = true){
        if(newContext === currentContext)
            return;
        contextStack.push(currentContext);
        showStackTrace.push(currentShow);
        replaceContext(newContext, hierachical);
    }

    function popContext(){
        replaceContext(contextStack.pop(), showStackTrace.pop());
    }

    function replaceContext(newContext, hierachical = true){

        // Getting rid of input box on context change
        removeForm();

        rect.remove();
        circle.remove();
        path.remove();
        svg.selectAll('.simple').remove();
        svg.selectAll('.edges').remove();
        svg.selectAll('.regex').remove();
        // So you don't delete a node from a previous context
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

            svg.selectAll('.header').remove();
            let header = svg.selectAll('.header').data([newContext], (d) => d.id);
            // header.exit().remove();
            // Header gets rendered from scratch every time
            headerGroup = header.enter()
                .append('g')
                .classed('header', true)
                .attr('transform', `translate(${(width - BlockNodeStatic.maximizedWidth)/2}, ${(height - BlockNodeStatic.maximizedHeight)/2})`);

            headerGroup
                .append('rect')
                .classed('banner', true)
                .attr('width', BlockNodeStatic.maximizedWidth)
                .attr('height', BlockNodeStatic.headerHeight)
                .attr('x', 0)
                .attr('y', 0)
                .style('stroke', '#2f3033')
                //color
                .style('fill', lightgreen)
                .on('mousedown', () => d3.event.stopPropagation());
            // Append Frame
            headerGroup
                .append('rect')
                .attr('width', BlockNodeStatic.maximizedWidth)
                .attr('height', BlockNodeStatic.maximizedHeight - BlockNodeStatic.headerHeight)
                .attr('x', 0)
                .attr('y', BlockNodeStatic.headerHeight)
                .attr('fill', '#f2f2f2')
                .style('stroke', '#262626');
            // Header Text
            let compoundWidth =
                headerGroup.append('text')
                    .classed('desc', true)
                    .attr('x', BlockNodeStatic.maximizedWidth/2)
                    .attr('y', BlockNodeStatic.headerHeight/2 + 6)
                    .text(d => {
                        return d.desc;})
                    .node()
                    .getComputedTextLength()
                / 2 + 8;
            // Stack trace
            if(hierachical){
                for(let i = contextStack.length - 1; i >= 0; i--){// Math.max(0, contextStack.length - 3)
                    const inter = 24;
                    const block = contextStack[i];
                    const smallRectGroup = headerGroup.append('g').classed('smallRect', true);
                    smallRectGroup.data([contextStack[i]], (d) => d.id)
                    const slotWidth = smallRectGroup.append('text')
                        // .style('font-size', '18')
                            .classed('stacktrace', true)
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
                    smallRectGroup.attr('transform', `translate(${BlockNodeStatic.maximizedWidth/2 - compoundWidth - slotWidth - inter},${BlockNodeStatic.headerHeight/2 - rectHeight/2})`);
                    compoundWidth += slotWidth + inter;
                    // Calculations so we do not overfill the header with boxes
                    const whiteSpaceSide = (width - BlockNodeStatic.maximizedWidth)/2;
                    const dotsWidth = i > 1 ? 46 : 0;
                    const nextBlockEstimate = i > 0 ? contextStack[i - 1].desc.length * 10 : 0;
                    // Last element, still a couple to go
                    if(compoundWidth > BlockNodeStatic.maximizedWidth/2 - inter - dotsWidth - whiteSpaceSide - nextBlockEstimate && i !== 0){
                        smallRectGroup.append('path')
                            .attr('d', `M ${-inter} ${rectHeight/2} L ${-4} ${rectHeight/2}`)
                            .style('stroke-width', '4')
                            .style('stroke', 'black')
                            .style('marker-end', 'url(#end-arrow)')
                        smallRectGroup.append('text')
                            .classed('dots', true)
                            .attr('x', -inter-46)
                            .attr('y', rectHeight / 2 + 12)
                            .text('. . .')
                        break;
                    }
                }
            }
            // Header Return button
            const buttonWidth = 50;
            const buttonHeight = 25;
            const rightPadding = 25;
            const inter = 20;
            headerGroup.append('g')
                .attr('class', 'returnGroup boxbutton')
                .attr('transform', `translate(${BlockNodeStatic.maximizedWidth - buttonWidth/2 - rightPadding}, ${BlockNodeStatic.headerHeight/2})`);
            const returnGroup = headerGroup.selectAll('.returnGroup');
            returnGroup.append('rect')
                .attr('width', buttonWidth)
                .attr('height', buttonHeight)
                .attr('x', -buttonWidth/2)
                .attr('y',  -buttonHeight/2)
                .on('mousedown', () => {
                    d3.event.stopPropagation();
                    popContext();
                });
            returnGroup.append('text')
                .attr('x', 0)
                .attr('y', 5)
                .text('Return');

            // Home Button
            headerGroup.append('g')
                .attr('class', 'homeGroup boxbutton')
                .attr('transform', `translate(${BlockNodeStatic.maximizedWidth - buttonWidth*3/2 - rightPadding - inter}, ${BlockNodeStatic.headerHeight/2})`);
            const homeGroup = headerGroup.selectAll('.homeGroup');
            homeGroup.append('rect')
                .attr('width', buttonWidth)
                .attr('height', buttonHeight)
                .attr('x', -buttonWidth/2)
                .attr('y',  -buttonHeight/2)
                .on('mousedown', () => {
                    d3.event.stopPropagation();
                    while(contextStack.length > 1){
                        contextStack.pop();
                        showStackTrace.pop();
                    }
                    popContext();
                });
            homeGroup.append('text')
                .attr('x', 0)
                .attr('y', 5)
                .text('Home');
        }

        currentContext.force.stop();
        // Initializing new simulation if we are entering for the first time
        if(!newContext.force){
            newContext.force = d3.forceSimulation()
                .force('link', d3.forceLink().id((d) => d.id).distance(150))
                .force('charge', d3.forceManyBody().strength(-500).distanceMax(100))
                // .force('x', d3.forceX(width / 2))
                // .force('y', d3.forceY(height / 2))
                .on('tick', tick.bind(this, (width - BlockNodeStatic.maximizedWidth)/2, (height - BlockNodeStatic.maximizedHeight)/2 + BlockNodeStatic.headerHeight, BlockNodeStatic.maximizedWidth, BlockNodeStatic.maximizedHeight - BlockNodeStatic.headerHeight));
        }

        // Don't render toolbar for simple automata
        if(blocksArr.length > 0 && blockAutomaton)
            toolbar.render();

        newContext.force.restart();
        currentContext = newContext;
        currentShow = hierachical;

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
                // A new node has been added
                if(currentContext.nodes.length !== d.first.nodes.length){
                    if(node.isBlock){
                        const blockTuple = buildBlock(node.desc, node.x, node.y)
                        d.first.nodes.push(blockTuple.first);
                        // This does not lead to inf loop since forEach only considers the elements that were already in the array
                        blocksArr.push(blockTuple);
                    }
                    else
                        d.first.nodes.push(new SimpleNode(++lastNodeId, node.reflexive, node.x, node.y, node.initial));
                }
                // A node has been updated
                else{
                    const nodeOfTwin = d.first.nodes[currentContext.nodes.indexOf(node)];
                    nodeOfTwin.reflexive = node.reflexive;
                }
            }
        })
    }

    // Label can be a string as well
    let addLetterToString = function(str, label){
        const lst = str.split(' ').filter(c => c.length > 0);
        const labelArr = label.split(' ');
        labelArr.forEach(l => {
            if(!lst.includes(l))
                lst.push(l);
        })
        return lst.sort().join(' ');
    }
    let removeLetterFromString = function(str, label){
        const lst = str.split(' ').filter(c => c.length > 0);
        if(lst.includes(label)){
            lst.splice(lst.indexOf(label), 1);
            return lst.sort().join(' ');
        }
        return str;
    }
    // Called on mouseup
    // Also modifies existing links and removes links if label is empty
    function addLink(source, target, label, act = addLetterToString){

        const link = currentContext.links.filter((l) => l.source === source && l.target === target)[0];
        const reverseLink = currentContext.links.filter((l) => l.source === target && l.target === source)[0];
        let modifiedLink = link;
        if(link)
            link.label = act(link.label, label);
        else{
            let newLink = new Link(source, target, label);
            modifiedLink = newLink;
            if(source === target){
                newLink.selftransition = true;
            }
            else if(!reverseLink){
                newLink.bidirectional = false;
                newLink.up = source < target;
            }
            else{
                newLink.bidirectional = true;
                reverseLink.bidirectional = true;
                newLink.up = source < target;
            }
            currentContext.links.push(newLink);
        }
        // console.log(modifiedLink.label)
        if(modifiedLink.label === '')
            syncRemoveLink(modifiedLink);
        else
            syncLink(modifiedLink);
        // select link if it already existed
        // selectedLink = link;
        selectedNode = null;
    }

    function syncRemoveNode(node){
        blocksArr.forEach((d) => {
            if(currentContext.desc === d.first.desc && d.first !== currentContext){
                d.first.nodes.splice(currentContext.nodes.indexOf(node), 1);
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
                // Making reverse link bidirectional (curved)
                if(link.bidirectional)
                    d.first.links.forEach((l) => {
                        if(l.source === target && l.target === source)
                            l.bidirectional = link.bidirectional;
                    })
            }
        });
    }

    function syncRemoveLink(link, replace = false){
        // Root handled separately
        if(currentContext === root){
            root.links.splice(root.links.indexOf(link), 1);
            if(link.bidirectional)
                root.links.filter((l) => l.source === link.target && l.target === link.source)[0].bidirectional = false;
            // Adding link back to source
            if(replace){
                addLink(link.source, link.source, link.label);
            }
        }
        blocksArr.forEach((d) => {
            if(currentContext.desc === d.first.desc){// && d.first !== currentContext){
                const source = d.first.nodes[currentContext.nodes.indexOf(link.source)];
                const target = d.first.nodes[currentContext.nodes.indexOf(link.target)];
                const linksToRemove = d.first.links.filter((l) => l.source === source && l.target === target);
                for (const l of linksToRemove) {
                    d.first.links.splice(d.first.links.indexOf(l), 1);
                    if(l.bidirectional)
                        d.first.links.filter((l) => l.source === target && l.target === source)[0].bidirectional = false;
                }
            }
        })
    }

    function addNode() {
        // because :active only works in WebKit?
        svg.classed('active', true);

        // mousedownNode stops propagation
        // elm is the class of the target
        const elm = d3.event.target.classList[0];
        if (mousedownNode || mousedownLink || elm === 'node' || elm === 'block')
            return;

        // insert new node at point
        const point = d3.mouse(this);
        const node = new SimpleNode(++lastNodeId, false, point[0], point[1]);
        currentContext.nodes.push(node);
        if(deterministic)
            alphabet.forEach(c => addLink(node, node, c));

        syncNode(node);

        restart();
    }

    // descAttempt: name of node we wish to add
    // descFather: name of node
    function validBlockHelper(block, stack, descAttempt, descFather){
        stack.push(block.desc);
        if(block.desc === descFather && stack.includes(descAttempt)){
            stack.pop();
            return 0;
        }

        let ret = 1;
        block.nodes.filter(d => d.isBlock).forEach(neigh => {
            ret &= validBlockHelper(neigh, stack, descAttempt, descFather);
        });
        stack.pop();
        return ret;
    }

    // Trying to add a block with label 'desc' in currentContext
    function validBlock(desc){
        // Checking all stack traces
        return validBlockHelper(root, [], desc, currentContext.desc);
    }

    function buildBlock(desc, x = blockInsertCoordinates[0], y = blockInsertCoordinates[1]){
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
                if(!node.isBlock){
                    newBlockNodes.push(new SimpleNode(++lastNodeId, node.reflexive, node.x, node.y, node.initial));
                } else
                    newBlockNodes.push(buildBlock(node.desc, node.x, node.y).first);
            });
            if(newBlockNodes.length > 0){
                // The relative order of the link's source and target is the same for both nodes
                twin.first.links.forEach(link => {
                    const source = newBlockNodes[twin.first.nodes.indexOf(link.source)];
                    const target = newBlockNodes[twin.first.nodes.indexOf(link.target)];
                    newBlockLinks.push(new Link(source, target, link.label, link.bidirectional, link.up));
                })
            }
            return new Tuple(new BlockNode(++lastNodeId, false, desc, x, y, newBlockNodes, newBlockLinks), false);
        }
        // console.log('no twin');
        // I don't think we need to add a simulation
        return new Tuple(new BlockNode(++lastNodeId, false, desc, x, y, [new SimpleNode(++lastNodeId, false, width/6, height/2, true)], newBlockLinks), true);
    }

    function removeForm(){
        d3.selectAll('.input-field').style('display', 'none');
        formOpen = false;
        d3.select('.form-rect').remove();
    }

    function closeForm(){
        // Invalid description
        const desc = $('#desc').val();
        if(desc === currentContext.desc || !validBlock(desc) || desc.length === 0){
            $('#desc')
                .css('background', 'rgba(255,0,0,0.7)')
                .blur()
            return;
        }

        d3.selectAll('.input-field').style('display', 'none');
        formOpen = false;
        d3.select('.form-rect').remove();

        //Try with event
        const nodeTuple = buildBlock(desc);
        currentContext.nodes.push(nodeTuple.first);
        blocksArr.push(nodeTuple);
        toolbar.render();
        syncNode(nodeTuple.first);
        restart();
    }

    let blockInsertCoordinates;
    function addBlock() {
        // because :active only works in WebKit?
        svg.classed('active', true);

        // Cannot add two blocks at once
        if (mousedownNode || mousedownLink || formOpen)
            return;
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
            .style('left', (d3.event.pageX - 2) + 'px')
            .style('top', (d3.event.pageY - 2) + 'px')
        formGroup.selectAll('input')
            .attr('value', 'regex')
        $('#desc')
            .select()
            .focus()
        svg
            .append('svg:rect')
            .classed('form-rect', true)
            .attr('height', BlockNodeStatic.minimizedHeight)
            .attr('width', BlockNodeStatic.minimizedWidth)
            .attr('x', blockInsertCoordinates[0] - BlockNodeStatic.minimizedWidth/6)
            .attr('y', blockInsertCoordinates[1] - BlockNodeStatic.minimizedHeight/4)
            .style('fill', lightgreen)
            .style('stroke', lightgreen.darker().toString())
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
            // So you cannot get rid of transitions
            if(deterministic && !linkMoved){
                addLink(mousedownNode, mousedownNode, mousedownLetter);
                restart();
            }
        }

        // because :active only works in WebKit?
        svg.classed('active', false);

        // clear mouse event vars
        resetMouseVars();
    }

    function spliceLinksForNode(node) {
        const toSplice = currentContext.links.filter((l) => l.source === node || l.target === node);
        const nodesAffected = currentContext.links.filter((l) => l.target === node && l.target !== l.source).map(link => new Tuple(link.source, link.label))
        const sel = selectedNode;
        for (const l of toSplice)
            syncRemoveLink(l, deterministic && (l.target !== l.source) && l.target === node);
        selectedNode = sel;

        // if(deterministic){
        //     //Add removed links again
        //     const sel = selectedNode;
        //     nodesAffected.forEach(tup =>
        //         addLink(tup.first, tup.first, tup.second));
        //     selectedNode = sel;
        // }
    }

    // Deletes only if selected
    function deleteSelected() {
        if (selectedNode && !selectedNode.initial) {
            spliceLinksForNode(selectedNode);
            syncRemoveNode(selectedNode);
            currentContext.nodes.splice(currentContext.nodes.indexOf(selectedNode), 1);
        } else if (selectedLink) {
            // Allows deletion on nondet always
            // Deletion on det only if source different from target
            if(!deterministic || selectedLink.target !== selectedLink.source)
                syncRemoveLink(selectedLink, deterministic);
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

        if (!selectedNode && !selectedLink) return;

        switch (d3.event.keyCode) {
            case 8: // backspace
            case 46: // delete
                deleteSelected();
                break;
            case 70: // F
                if (selectedNode && !selectedNode.isBlock) {
                    // toggle node reflexivity/final state
                    selectedNode.reflexive = !selectedNode.reflexive;
                    syncNode(selectedNode);
                    restart();
                    break;
                }
        }
    }

    function keyup() {
        lastKeyDown = -1;
    }


    /*************** Toolbar ********************/

    function Toolbar(){
        const toolbarHeight = 50;
        // let toolbarSvg;
        // Initialize second svg
        this.svg = d3.select(container)
            .append('svg')
            .attr('oncontextmenu', 'return false;')
            .attr('width', width)
            .attr('height', toolbarHeight)
            .attr('y', height);

        this.add = function(d){
            if(d.desc !== currentContext.desc && validBlock(d.desc)){
                const nodeTuple = buildBlock(d.desc, width / 2, height * 0.75);
                currentContext.nodes.push(nodeTuple.first);
                blocksArr.push(nodeTuple);
                syncNode(nodeTuple.first);
                restart();
            }
        }
        this.render = function(){
            let lastTime = 0;
            let scrollPosition = 0;
            let maxScroll = 100000000;
            let minScroll = 0;

            this.svg.selectAll('.toolbarGroup').remove();

            let group = this.svg
                .append('g')
                .classed('toolbarGroup', true)
                .on('mousewheel', () => {
                    const time = new Date();
                    const timeDiff = time.getTime() - lastTime;
                    if(timeDiff > 25){
                        d3.event.preventDefault();
                        const boxes = this.svg.select('.allBoxesGroup');
                        const scrollDiff = d3.event.deltaY;
                        scrollPosition += scrollDiff;
                        scrollPosition = Math.max(-minScroll, scrollPosition);
                        scrollPosition = Math.min(maxScroll, scrollPosition);
                        boxes.attr('transform', `translate(${scrollPosition}, 0)`);
                        lastTime = time.getTime();
                    }
                });

            group
                .append('rect')
                .classed('toolbarFrame', true)
                .attr('width', BlockNodeStatic.maximizedWidth)
                .attr('x', (width - BlockNodeStatic.maximizedWidth) / 2)
                .attr('height', toolbarHeight)

            const offsetY = 10;
            const interX = 10;
            let offsetX = (width - BlockNodeStatic.maximizedWidth) / 2 + 15;
            const buttonPaddingSide = 5;

            group
                .append('g')
                .classed('allBoxesGroup', true);
            const allBoxesGroup = group.select('.allBoxesGroup');
            allBoxesGroup.selectAll('.reuseBox').remove();

            // Just one of each kind
            const filtered = new Array();
            blocksArr.forEach(d => {
                if(d.second)
                    filtered.push(d.first);
            });
            let g = allBoxesGroup.selectAll('.reuseBox')
                .data(filtered).enter()
                .append('g')
                .classed('reuseBox', true);

            const rectHeight = 28;
            g.append('text')
                .text(d => d.desc);

            g.insert('rect', 'text')
                .attr('width', function(){return d3.select(this.parentNode).select('text').node().getComputedTextLength() + 2 * buttonPaddingSide;})
                .attr('height', rectHeight)
                .on('dblclick', d => pushContext(d, false))
                .on('contextmenu', d3.contextMenu(menuToolboxBlock))
            g.select('text')
                .attr('x', function(){return (d3.select(this.parentNode).select('text').node().getComputedTextLength() + 2 * buttonPaddingSide) / 2;})
                .attr('y', rectHeight / 2 + 6);
            g.attr('transform', function(d, i){
                const slotWidth = d3.select(this).select('text').node().getComputedTextLength() + 2 * buttonPaddingSide;
                const str = `translate(${offsetX},${offsetY})`;
                offsetX += slotWidth + interX;
                maxScroll = Math.max(0, Math.min(maxScroll, BlockNodeStatic.maximizedWidth - offsetX));
                minScroll = Math.max(0, Math.max(minScroll, offsetX - BlockNodeStatic.maximizedWidth));
                return str;
            });
        }
    }

    /***************************************** */

    /*************** Context menu declarations ******************/

    var menuEmptyAreaBlock = [{
        title: 'Add block state',
        action: function(elm, d, i) {
            addBlock.call(elm);
        }
    }, {
        title: 'Add state',
        action: function(elm, d, i) {
            addNode.call(elm);
        }
    }];
    var menuEmptyAreaClassic = [{
        title: 'Add state',
        action: function(elm, d, i) {
            addNode.call(elm);
        }
    }];

    var menuNode = [
        {
            title: 'Toggle final',
            action: function(elm, d, i){
                d.reflexive = !d.reflexive;
                syncNode(d);
                restart();
            }
        },
        {
            title: 'Remove',
            action: function(elm, d, i) {
                selectedNode = d;
                deleteSelected.call(elm);
            }
        }
    ]

    var menuBlock = [{
        title: 'Expand',
        action: function(elm, d, i){
            pushContext(d);
        }
    }, {
        title: 'Remove',
        action: function(elm, d, i) {
            selectedNode = d;
            deleteSelected.call(elm);
        }
    }
    ]

    var menuToolboxBlock = [{
        title: 'Add',
        action: function(elm, d, i){
            toolbar.add(d);
        }
    }, {
        title: 'Edit',
        action: function(elm, d, i) {
            pushContext(d, false)
        }
    }
    ]

    var menuLink = [{
        title: 'Remove entire edge',
        action: function(elm, d, i){
            selectedLink = d;
            deleteSelected(d);
            deselectAll();
        }
    }
    ]

    var menuLinkLetter = [{
        title: 'Remove label',
        action: function(elm, d, i){
            // If deterministic, add back to source
            addLink(d.first.source, d.first.target, d.first.label, removeLetterFromString);
            if(deterministic)
                addLink(d.first.source, d.first.source, d.first.label);
            restart();
        }
    }]

    /********************************************************** */

    /**********************
     * app starts here
     */
        // We only need a toolbar for a block automaton
    let toolbar = null;
    if(blockAutomaton)
        toolbar = new Toolbar();
    var menuEmptyArea = blockAutomaton ? menuEmptyAreaBlock : menuEmptyAreaClassic;
    if(deterministic)
        currentContext.nodes.forEach(node => alphabet.forEach(c => addLink(node, node, c)));

    svg.on('mousedown', function(){
        //Ignore right clicks
        if(formOpen)
            closeForm();
        else if(d3.event.which !== 3 && !contextOpen)
            addNode.call(this);
    })
        .on('mousemove', mousemove)
        // mouseup has Different behaviour for deterministic!
        .on('mouseup', mouseup)
        .on('contextmenu', d3.contextMenu(menuEmptyArea, deselectAll));
    d3.select(window)
        .on('keydown', keydown)
        .on('keyup', keyup);
    restart();

    this.reset = function(){
        this.clear();

        const initial = new SimpleNode(++lastNodeId, false, width/6, height/2, true);
        root.nodes.push(initial);
        // Add transition for each
        replaceContext(root);
        if(deterministic)
            alphabet.forEach(c => addLink(initial, initial, c));

        circle.remove();
        rect.remove();
        path.remove();

        restart();
    }
    // Alphabet should be set in the beginning
    // Calling this function RESETS the WHOLE AUTOMATON
    this.setAlphabet = function(alpha){
        // alpha is a string
        alphabet = alpha.split(' ').filter(d => d.length > 0);
        this.reset();
    }
    this.setAlphabetArray = function(alpha){
        this.setAlphabet(alpha.join(' '));
    }
    this.setEpsilon = function(flag){
        if(deterministic)
            return;
        epsilon = flag;
        this.reset();
    }

    this.exportAlphabet = function(){
        let alpha = "	<alphabet>\n";
        alphabet.forEach(d => alpha = alpha + " <symbol>" + d + "</symbol>\n");
        alpha = alpha + "	</alphabet>\n";
        return alpha;
    }

    this.setRegex = function(regex){
        root.desc = regex;
        restart();
    }

    this.exportAutomaton = function(){
        const alpha = this.exportAlphabet();
        const isBlockAutomaton = `<automatonType>${blockAutomaton}</automatonType>\n`;
        const isDeterministic = `<deterministic>${deterministic}</deterministic>\n`
        const epsilonTrasitions = `<epsilon>${epsilon}</epsilon>\n`;
        const automaton = root.export();
        return `<automaton>\n ${isBlockAutomaton} ${isDeterministic} ${epsilonTrasitions} ${alpha} ${automaton} </automaton>`;
    }

    /***************Testing methods************ */

    this.blockArr = function(){
        return blocksArr;
    }

    this.root = function(){
        return root;
    }

    this.contextStack = function(){
        return contextStack;
    }

    this.mousevars = function(){
        console.log(mousedownNode.id)
        console.log(mouseupNode.id)
        console.log(mousedownLink)
        console.log(selectedNode.id)
        console.log(selectedLink.id)
    }

    /******************************************** */

    // Clears everything but the alphabet
    this.clear = function(){
        force.stop();
        // Arrays
        blocksArr.length = 0;
        contextStack.length = 0;
        showStackTrace.length = 0;
        root.nodes.length = 0;
        root.links.length = 0;
        // Vars
        lastNodeId = 0;
        // We keep the root
        root.desc = "";
        resetMouseVars();
    }

    this.lockCanvas = function(){
        d3.select(container).classed('locked', true);
    }

    this.setAutomaton = function(automaton){
        const xmlAut = $.parseXML(automaton);
        this.clear();
        // Getting alphabet
        alphabet.length = 0;
        $(xmlAut).find('alphabet').children().each(function(i, d){
            alphabet.push($(d).text());
        });
        // Setting configuration variables
        blockAutomaton = $(xmlAut).find('automatonType').text() === 'true' ? true : false;
        epsilon = $(xmlAut).find('epsilon').text() === 'true' ? true : false;
        deterministic = $(xmlAut).find('deterministic').text() === 'true' ? true : false;
        menuEmptyArea = blockAutomaton ? menuEmptyAreaBlock : menuEmptyAreaClassic;
        svg.on('contextmenu', d3.contextMenu(menuEmptyArea, deselectAll));
        if(blockAutomaton && !toolbar)
            toolbar = new Toolbar();

        lastNodeId = root.set($(xmlAut).find('block').first());
        replaceContext(root);
        restart();
    }
}

let canvas = new BlockCanvas('body', [960, 540], false, true, true);

// canvas.setAutomaton(`<automaton>
// <automatonType>true</automatonType>
// <epsilon>true</epsilon>
//     <alphabet>
// <symbol>a</symbol>
// <symbol>b</symbol>
// <symbol>c</symbol>
// <symbol>d</symbol>
// <symbol>e</symbol>
//    </alphabet>
// <block sid='0' regex='entire regex' posX='0' posY='0'>
// <stateSet>
// <state sid='1' initial='true' final='false' posX='189.9999999999999' posY='269.99999997204975'/>
// <block sid='2' regex='b|c' posX='339.9999999999999' posY='270.0000000838503'>
// <stateSet>
// <state sid='3' initial='true' final='false' posX='242.2138382377868' posY='262.992192113752'/>
// <block sid='4' regex='b' posX='376.99030119533785' posY='197.14915882508978'>
// <stateSet>
// <state sid='5' initial='true' final='false' posX='220.00822909811546' posY='270.8890108014536'/>
// <state sid='8' initial='false' final='true' posX='369.9917709018844' posY='273.1109891985464'/>
// </stateSet>
// <transitionSet>
// <transition tid='0'>
// <from>5</from>
// <to>8</to>
// <label> b </label>
// </transition>
// </transitionSet>
// <acceptingSet>
// <state sid='8'/>
// </acceptingSet>
// <initialState><state sid='5' /></initialState>
// </block>
// <block sid='6' regex='c' posX='385.46772625602665' posY='307.47054153970976'>
// <stateSet>
// <state sid='7' initial='true' final='false' posX='192.70682117060272' posY='267.56600400590884'/>
// <state sid='9' initial='false' final='true' posX='342.29317882939756' posY='256.43399599409116'/>
// </stateSet>
// <transitionSet>
// <transition tid='0'>
// <from>7</from>
// <to>9</to>
// <label> c </label>
// </transition>
// </transitionSet>
// <acceptingSet>
// <state sid='9'/>
// </acceptingSet>
// <initialState><state sid='7' /></initialState>
// </block>
// <block sid='10' regex='((a*|b*)cc*)*' posX='643' posY='245'>
// <stateSet>
// <state sid='11' initial='true' final='false' posX='160' posY='270'/>
// <block sid='17' regex='((a*|b*)cc*)*(d|c*)+abc' posX='426' posY='255'>
// <stateSet>
// <state sid='16' initial='true' final='false' posX='160' posY='270'/>
// <block sid='21' regex='((a*|b*)cc*)*(d|c*)+abcf' posX='477' posY='270'>
// <stateSet>
// <state sid='20' initial='true' final='false' posX='160' posY='270'/>
// </stateSet>
// <transitionSet>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='20' /></initialState>
// </block>
// <block sid='25' regex='franko' posX='521' posY='174'>
// <stateSet>
// <state sid='24' initial='true' final='false' posX='160' posY='270'/>
// </stateSet>
// <transitionSet>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='24' /></initialState>
// </block>
// </stateSet>
// <transitionSet>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='16' /></initialState>
// </block>
// </stateSet>
// <transitionSet>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='11' /></initialState>
// </block>
// </stateSet>
// <transitionSet>
// <transition tid='0'>
// <from>3</from>
// <to>4</to>
// <label> ε </label>
// </transition>
// <transition tid='1'>
// <from>3</from>
// <to>6</to>
// <label> ε </label>
// </transition>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='3' /></initialState>
// </block>
// <block sid='13' regex='((a*|b*)cc*)*' posX='480' posY='405'>
// <stateSet>
// <state sid='12' initial='true' final='false' posX='160' posY='270'/>
// <block sid='14' regex='((a*|b*)cc*)*(d|c*)+abc' posX='426' posY='255'>
// <stateSet>
// <state sid='15' initial='true' final='false' posX='160' posY='270'/>
// <block sid='18' regex='((a*|b*)cc*)*(d|c*)+abcf' posX='477' posY='270'>
// <stateSet>
// <state sid='19' initial='true' final='false' posX='160' posY='270'/>
// </stateSet>
// <transitionSet>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='19' /></initialState>
// </block>
// <block sid='22' regex='franko' posX='521' posY='174'>
// <stateSet>
// <state sid='23' initial='true' final='false' posX='160' posY='270'/>
// </stateSet>
// <transitionSet>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='23' /></initialState>
// </block>
// </stateSet>
// <transitionSet>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='15' /></initialState>
// </block>
// </stateSet>
// <transitionSet>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='12' /></initialState>
// </block>
// </stateSet>
// <transitionSet>
// <transition tid='0'>
// <from>1</from>
// <to>1</to>
// <label> a </label>
// </transition>
// <transition tid='1'>
// <from>1</from>
// <to>2</to>
// <label> ε </label>
// </transition>
// </transitionSet>
// <acceptingSet>
// </acceptingSet>
// <initialState><state sid='1' /></initialState>
// </block>
// </automaton>`)
// Circle
if (!mousedownNode || !mousedownLetter) return;

// needed by FF
dragLine
    .style('marker-end', '');
dragGroup
    .attr('display', 'none');

// check for drag-to-self
mouseupNode = d;

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
restart();



/********************************************* */
// Block
if (!mousedownNode || !mousedownLetter) return;

// needed by FF
dragLine
    .style('marker-end', '');
dragGroup
    .attr('display', 'none');

// check for drag-to-self
mouseupNode = d;

// unenlarge target node
d3.select(this).attr('transform', '');

const source = mousedownNode;
const target = mouseupNode;
const label = mousedownLetter;

const link = currentContext.links.filter((l) => l.source === source && l.target === target)[0];
const reverseLink = currentContext.links.filter((l) => l.source === target && l.target === source)[0];
let modifiedLink = link;
if(link)
    link.label += link.label.includes(label) ? '' : ' ' + label;
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
syncLink(modifiedLink);

// select new link
selectedLink = link;
selectedNode = null;
restart();